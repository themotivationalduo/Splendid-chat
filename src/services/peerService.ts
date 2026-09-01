import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { Message } from '../types';
import { saveMessageToIndexedDB, saveMediaBlobToIndexedDB } from './indexedDBService';

class PeerDataService {
  private peer: Peer | null = null;
  private currentUserId: string | null = null;
  private activeConnections: Map<string, DataConnection> = new Map();
  private onMessageReceivedCallbacks: Set<(msg: Message) => void> = new Set();
  private onIncomingCallCallbacks: Set<(call: MediaConnection) => void> = new Set();

  public getPeerId(userId?: string): string {
    const targetId = userId || this.currentUserId || '';
    return `splendid_p2p_${targetId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  public getPeer(): Peer | null {
    return this.peer;
  }

  public init(userId: string) {
    if (this.peer && this.currentUserId === userId && !this.peer.destroyed) {
      return;
    }

    this.currentUserId = userId;
    const peerId = this.getPeerId(userId);

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log(`[PeerJS] P2P DataChannel active for user: ${id}`);
      });

      this.peer.on('connection', (conn) => {
        this.setupConnectionListeners(conn);
      });

      this.peer.on('call', (mediaCall) => {
        console.log('[PeerJS] Incoming P2P media call from:', mediaCall.peer);
        this.onIncomingCallCallbacks.forEach(cb => cb(mediaCall));
      });

      this.peer.on('error', (err) => {
        console.warn('[PeerJS] P2P connection notice:', err);
      });
    } catch (err) {
      console.warn('[PeerJS] Failed to initialize peer:', err);
    }
  }

  public onIncomingCall(callback: (call: MediaConnection) => void): () => void {
    this.onIncomingCallCallbacks.add(callback);
    return () => {
      this.onIncomingCallCallbacks.delete(callback);
    };
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
        if (data && data.type === 'P2P_MEDIA_MESSAGE') {
          const msg: Message = data.message;
          const rawMediaData = data.mediaData;

          // If raw binary/Base64 media is attached, save directly to IndexedDB
          if (rawMediaData && msg.id) {
            const localBlobUrl = await saveMediaBlobToIndexedDB(msg.id, rawMediaData, data.mimeType);
            msg.mediaUrl = localBlobUrl;
          }

          // Save message permanently into recipient's IndexedDB
          await saveMessageToIndexedDB(msg);

          // Dispatch event to update active UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('splendid-p2p-message-received', { detail: { message: msg } }));
          }

          this.onMessageReceivedCallbacks.forEach(cb => cb(msg));
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

  public async sendMediaDirectOverPeer(
    targetUserId: string,
    msg: Message,
    rawMediaData?: Blob | string,
    mimeType?: string
  ): Promise<boolean> {
    if (!this.peer || this.peer.destroyed) {
      if (this.currentUserId) this.init(this.currentUserId);
    }

    const targetPeerId = this.getPeerId(targetUserId);

    return new Promise((resolve) => {
      let conn = this.activeConnections.get(targetPeerId);

      const sendPayload = (activeConn: DataConnection) => {
        try {
          activeConn.send({
            type: 'P2P_MEDIA_MESSAGE',
            message: msg,
            mediaData: rawMediaData,
            mimeType: mimeType || 'application/octet-stream'
          });
          resolve(true);
        } catch (err) {
          console.warn('[PeerJS] Direct DataChannel send error:', err);
          resolve(false);
        }
      };

      if (conn && conn.open) {
        sendPayload(conn);
        return;
      }

      if (!this.peer) {
        resolve(false);
        return;
      }

      try {
        conn = this.peer.connect(targetPeerId, { reliable: true });
        
        const timeout = setTimeout(() => {
          resolve(false);
        }, 3000);

        conn.on('open', () => {
          clearTimeout(timeout);
          if (conn) {
            this.setupConnectionListeners(conn);
            sendPayload(conn);
          }
        });

        conn.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch (err) {
        resolve(false);
      }
    });
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
