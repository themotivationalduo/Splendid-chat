import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { Message, CallSession } from '../types';
import { saveMessageToIndexedDB, saveMediaBlobToIndexedDB, updateMessageInIndexedDB } from './indexedDBService';

class PeerDataService {
  private peer: Peer | null = null;
  private currentUserId: string | null = null;
  private activeConnections: Map<string, DataConnection> = new Map();
  private onMessageReceivedCallbacks: Set<(msg: Message) => void> = new Set();
  private onIncomingCallCallbacks: Set<(call: MediaConnection) => void> = new Set();
  private pendingIncomingCall: MediaConnection | null = null;

  public getPeerId(userId?: string): string {
    const targetId = userId || this.currentUserId || '';
    return `splendid_p2p_${targetId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  public getPeer(): Peer | null {
    return this.peer;
  }

  private isRetrying = false;

  public init(userId: string) {
    if (this.peer && this.currentUserId === userId && !this.peer.destroyed && !this.peer.disconnected) {
      return;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    this.currentUserId = userId;
    const peerId = this.getPeerId(userId);

    try {
      this.peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        this.isRetrying = false;
        console.log(`[PeerJS] P2P DataChannel active for user: ${id}`);
      });

      this.peer.on('connection', (conn) => {
        this.setupConnectionListeners(conn);
      });

      this.peer.on('call', (mediaCall) => {
        console.log('[PeerJS] Incoming P2P media call from:', mediaCall.peer);
        if (this.onIncomingCallCallbacks.size === 0) {
          this.pendingIncomingCall = mediaCall;
        } else {
          this.onIncomingCallCallbacks.forEach(cb => cb(mediaCall));
        }
      });

      this.peer.on('error', (err: any) => {
        if (err && err.type === 'unavailable-id') {
          console.warn(`[PeerJS] Peer ID ${peerId} is temporarily locked on server. Cleaning up & retrying...`);
          if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
          }
          if (!this.isRetrying) {
            this.isRetrying = true;
            setTimeout(() => {
              if (this.currentUserId === userId && (!this.peer || this.peer.destroyed)) {
                this.init(userId);
              }
            }, 3000);
          }
          return;
        }
        console.warn('[PeerJS] P2P connection notice:', err?.type || err);
      });
    } catch (err) {
      console.warn('[PeerJS] Failed to initialize peer:', err);
    }
  }

  public onIncomingCall(callback: (call: MediaConnection) => void): () => void {
    this.onIncomingCallCallbacks.add(callback);
    if (this.pendingIncomingCall) {
      const pending = this.pendingIncomingCall;
      this.pendingIncomingCall = null;
      setTimeout(() => callback(pending), 50);
    }
    return () => {
      this.onIncomingCallCallbacks.delete(callback);
    };
  }

  public clearPendingCall() {
    this.pendingIncomingCall = null;
  }

  public callPeer(targetUserId: string, localStream: MediaStream): MediaConnection | null {
    if (!this.peer || this.peer.destroyed) {
      if (this.currentUserId) this.init(this.currentUserId);
    }
    if (!this.peer) return null;

    const targetPeerId = this.getPeerId(targetUserId);
    try {
      const mediaCall = this.peer.call(targetPeerId, localStream);
      return mediaCall;
    } catch (err) {
      console.error('[PeerJS] Call peer error:', err);
      return null;
    }
  }

  private setupConnectionListeners(conn: DataConnection) {
    this.activeConnections.set(conn.peer, conn);

    conn.on('data', async (data: any) => {
      try {
        if (!data || typeof data !== 'object') return;

        // 1. Direct P2P Media / Message
        if (data.type === 'P2P_MEDIA_MESSAGE') {
          const msg: Message = data.message;
          const rawMediaData = data.mediaData;

          if (rawMediaData && msg.id) {
            const localBlobUrl = await saveMediaBlobToIndexedDB(msg.id, rawMediaData, data.mimeType);
            msg.mediaUrl = localBlobUrl;
          }

          await saveMessageToIndexedDB(msg);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('splendid-p2p-message-received', { detail: { message: msg } }));
          }

          this.onMessageReceivedCallbacks.forEach(cb => cb(msg));
        }

        // 2. Real-time P2P Message Edit Event
        else if (data.type === 'P2P_MESSAGE_EDITED') {
          const { chatId, messageId, content, editedAt } = data;
          if (messageId && content) {
            const updatedMsg = await updateMessageInIndexedDB(messageId, {
              content,
              isEdited: true,
              editedAt: editedAt || Date.now()
            });

            if (typeof window !== 'undefined' && updatedMsg) {
              window.dispatchEvent(new CustomEvent('splendid-incoming-message', {
                detail: { chatId, message: updatedMsg }
              }));
            }
          }
        }

        // 3. Real-time PeerJS Call Signaling (Invite, Answer, Decline, End, Control)
        else if (data.type && data.type.startsWith('P2P_CALL_')) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('splendid-p2p-call-signaling', {
              detail: data
            }));
          }
        }
      } catch (err) {
        console.error('[PeerJS] Error processing P2P data:', err);
      }
    });

    conn.on('close', () => {
      this.activeConnections.delete(conn.peer);
    });

    conn.on('error', () => {
      this.activeConnections.delete(conn.peer);
    });
  }

  public subscribeMessageReceived(callback: (msg: Message) => void): () => void {
    this.onMessageReceivedCallbacks.add(callback);
    return () => {
      this.onMessageReceivedCallbacks.delete(callback);
    };
  }

  public async getOrCreateConnection(targetUserId: string): Promise<DataConnection | null> {
    if (!this.peer || this.peer.destroyed) {
      if (this.currentUserId) this.init(this.currentUserId);
    }
    if (!this.peer) return null;

    const targetPeerId = this.getPeerId(targetUserId);
    let conn = this.activeConnections.get(targetPeerId);
    if (conn && conn.open) {
      return conn;
    }

    return new Promise((resolve) => {
      try {
        const newConn = this.peer!.connect(targetPeerId, { reliable: true });
        const timer = setTimeout(() => {
          resolve(null);
        }, 3500);

        newConn.on('open', () => {
          clearTimeout(timer);
          this.setupConnectionListeners(newConn);
          resolve(newConn);
        });

        newConn.on('error', () => {
          clearTimeout(timer);
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  public async sendP2PMessageEdit(
    targetUserId: string,
    chatId: string,
    messageId: string,
    content: string,
    editedAt: number
  ): Promise<boolean> {
    try {
      const conn = await this.getOrCreateConnection(targetUserId);
      if (conn && conn.open) {
        conn.send({
          type: 'P2P_MESSAGE_EDITED',
          chatId,
          messageId,
          content,
          editedAt
        });
        return true;
      }
    } catch (e) {
      console.debug('Direct P2P message edit send error:', e);
    }
    return false;
  }

  public async sendP2PCallSignal(
    targetUserId: string,
    signalType: 'P2P_CALL_INVITE' | 'P2P_CALL_ANSWER' | 'P2P_CALL_DECLINE' | 'P2P_CALL_END' | 'P2P_CALL_CONTROL',
    payload: any
  ): Promise<boolean> {
    try {
      const conn = await this.getOrCreateConnection(targetUserId);
      if (conn && conn.open) {
        conn.send({
          type: signalType,
          ...payload
        });
        return true;
      }
    } catch (e) {
      console.debug('Direct P2P call signaling send error:', e);
    }
    return false;
  }

  public async sendMediaDirectOverPeer(
    targetUserId: string,
    msg: Message,
    rawMediaData?: Blob | string,
    mimeType?: string
  ): Promise<boolean> {
    try {
      const conn = await this.getOrCreateConnection(targetUserId);
      if (conn && conn.open) {
        conn.send({
          type: 'P2P_MEDIA_MESSAGE',
          message: msg,
          mediaData: rawMediaData,
          mimeType: mimeType || 'application/octet-stream'
        });
        return true;
      }
    } catch (e) {
      console.warn('[PeerJS] Direct DataChannel send error:', e);
    }
    return false;
  }

  public destroy() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.activeConnections.clear();
  }
}

export const peerService = new PeerDataService();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    peerService.destroy();
  });
  window.addEventListener('pagehide', () => {
    peerService.destroy();
  });
}
