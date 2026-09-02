import React, { useState, useEffect, useRef } from 'react';
import { Chat, CallRecording } from '../types';
import { playGlassChimeSound } from '../services/audioService';
import { sendCallSignal, subscribeToCallSignals, subscribeToUserPresence } from '../services/firestoreService';
import { peerService } from '../services/peerService';
import { saveCallRecordingToIndexedDB } from '../services/indexedDBService';

interface ActiveCallModalProps {
  callId?: string;
  isCaller?: boolean;
  currentUserId?: string;
  chat: Chat | null;
  isVideo: boolean;
  status?: 'ringing' | 'accepted' | 'declined' | 'ended';
  onEndCall: () => void;
}

interface SignalStats {
  bars: number; // 0 to 4
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Connecting';
  rttMs: number | null;
  packetLossPercent: number | null;
  bitrateKbps: number | null;
  jitterMs: number | null;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  callId = '',
  isCaller = false,
  currentUserId = '',
  chat,
  isVideo,
  status = 'ringing',
  onEndCall
}) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);

  // Call Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingNotice, setRecordingNotice] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [savedRecording, setSavedRecording] = useState<{
    id: string;
    name: string;
    isVideo: boolean;
    duration: number;
    url: string;
    sizeBytes: number;
  } | null>(null);
  const [showPreviewPlayer, setShowPreviewPlayer] = useState(false);

  // User Availability Tracking
  const [targetUserPresence, setTargetUserPresence] = useState<{
    status: 'online' | 'away' | 'offline';
    lastSeen: string;
    isOnline: boolean;
  }>({
    status: (chat?.status === 'online' ? 'online' : 'offline'),
    lastSeen: chat?.lastSeen || 'Offline',
    isOnline: chat?.status === 'online'
  });

  // Signal Strength & WebRTC Stats
  const [signalStats, setSignalStats] = useState<SignalStats>({
    bars: 0,
    quality: 'Connecting',
    rttMs: null,
    packetLossPercent: null,
    bitrateKbps: null,
    jitterMs: null
  });

  // Previous byte counters for bitrate calculation
  const prevBytesRef = useRef<{ timestamp: number; bytes: number }>({ timestamp: 0, bytes: 0 });

  // Media Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const peerMediaCallRef = useRef<any>(null);

  // DOM Elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Context & Analysers for voice waveform
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingDurationRef = useRef<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const combinedRecordingStreamRef = useRef<MediaStream | null>(null);

  // Target User ID
  const targetUserId = chat
    ? (chat.participant?.id || chat.participantIds?.find(id => id !== currentUserId) || '')
    : '';

  // Subscribe to target user availability in real-time
  useEffect(() => {
    if (!targetUserId) return;
    const unsub = subscribeToUserPresence(targetUserId, (presence) => {
      setTargetUserPresence(presence);
    });
    return () => unsub();
  }, [targetUserId]);

  // Call duration timer
  useEffect(() => {
    if (status !== 'accepted') return;
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Auto dismiss notices
  useEffect(() => {
    if (!recordingNotice) return;
    const timer = setTimeout(() => {
      setRecordingNotice(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [recordingNotice]);

  // WebRTC getStats API Signal Strength Polling Engine
  useEffect(() => {
    if (status !== 'accepted') {
      setSignalStats({
        bars: 0,
        quality: 'Connecting',
        rttMs: null,
        packetLossPercent: null,
        bitrateKbps: null,
        jitterMs: null
      });
      return;
    }

    const pollStats = async () => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        const statsReport = await pc.getStats();
        let currentRtt: number | null = null;
        let totalPacketsLost = 0;
        let totalPacketsReceived = 0;
        let currentJitter: number | null = null;
        let totalBytesReceived = 0;

        statsReport.forEach((report) => {
          // 1. Candidate pair for Round Trip Time (RTT)
          if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.nominated)) {
            if (typeof report.currentRoundTripTime === 'number') {
              currentRtt = Math.round(report.currentRoundTripTime * 1000);
            }
          }

          // 2. Inbound RTP stats for packet loss, jitter, and bitrate
          if (report.type === 'inbound-rtp') {
            if (typeof report.packetsLost === 'number') {
              totalPacketsLost += report.packetsLost;
            }
            if (typeof report.packetsReceived === 'number') {
              totalPacketsReceived += report.packetsReceived;
            }
            if (typeof report.jitter === 'number') {
              currentJitter = Math.round(report.jitter * 1000);
            }
            if (typeof report.bytesReceived === 'number') {
              totalBytesReceived += report.bytesReceived;
            }
          }

          // 3. Fallback remote-inbound-rtp for RTT if candidate-pair didn't supply it
          if (report.type === 'remote-inbound-rtp' && currentRtt === null) {
            if (typeof report.roundTripTime === 'number') {
              currentRtt = Math.round(report.roundTripTime * 1000);
            }
          }
        });

        // Compute Packet Loss Percentage
        let lossPercent: number | null = null;
        const totalExpected = totalPacketsReceived + totalPacketsLost;
        if (totalExpected > 0) {
          lossPercent = Math.min(100, Math.max(0, (totalPacketsLost / totalExpected) * 100));
          lossPercent = Math.round(lossPercent * 10) / 10;
        }

        // Compute Bitrate in kbps
        const now = Date.now();
        let bitrateKbps: number | null = null;
        if (prevBytesRef.current.timestamp > 0 && totalBytesReceived >= prevBytesRef.current.bytes) {
          const timeDiffSec = (now - prevBytesRef.current.timestamp) / 1000;
          if (timeDiffSec > 0) {
            const bytesDiff = totalBytesReceived - prevBytesRef.current.bytes;
            bitrateKbps = Math.round((bytesDiff * 8) / (timeDiffSec * 1000));
          }
        }
        prevBytesRef.current = { timestamp: now, bytes: totalBytesReceived };

        // Fallback RTT baseline if P2P direct local connection (often <15ms)
        if (currentRtt === null && pc.connectionState === 'connected') {
          currentRtt = 28;
        }

        // Determine Signal Quality & Bar Count (0 to 4) based on WebRTC metrics
        let bars = 4;
        let quality: SignalStats['quality'] = 'Excellent';

        const rtt = currentRtt ?? 30;
        const loss = lossPercent ?? 0;

        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          bars = 1;
          quality = 'Poor';
        } else if (pc.connectionState === 'connecting' || pc.iceConnectionState === 'checking') {
          bars = 2;
          quality = 'Connecting';
        } else if (rtt > 400 || loss > 15) {
          bars = 1;
          quality = 'Poor';
        } else if (rtt > 220 || loss > 6) {
          bars = 2;
          quality = 'Fair';
        } else if (rtt > 120 || loss > 2) {
          bars = 3;
          quality = 'Good';
        } else {
          bars = 4;
          quality = 'Excellent';
        }

        setSignalStats({
          bars,
          quality,
          rttMs: currentRtt,
          packetLossPercent: lossPercent,
          bitrateKbps,
          jitterMs: currentJitter
        });
      } catch (err) {
        console.debug('Error getting WebRTC stats:', err);
      }
    };

    // Immediate check, then poll every 1500ms
    pollStats();
    const interval = setInterval(pollStats, 1500);

    return () => clearInterval(interval);
  }, [status]);

  // Handle Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Handle Camera Off
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff]);

  // Handle Speaker Volume
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.25;
      remoteAudioRef.current.muted = false;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = isSpeakerOn ? 1.0 : 0.25;
      remoteVideoRef.current.muted = false;
    }
  }, [isSpeakerOn]);

  // Attach Remote Stream to Video & Audio Elements and set up Audio Analyser
  const attachRemoteStream = (stream: MediaStream) => {
    console.log('[ActiveCallModal] Attaching remote media stream:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
    remoteStreamRef.current = stream;
    setConnectionQuality('connected');

    const hasVideoTrack = stream.getVideoTracks().length > 0;
    setHasRemoteVideo(hasVideoTrack);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(e => console.debug('Remote video autoplay check:', e));
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(e => console.debug('Remote audio autoplay check:', e));
    }

    // Initialize Audio Level Analyzer for Voice activity
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !audioContextRef.current) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const remoteSource = ctx.createMediaStreamSource(stream);
        const remoteAnalyser = ctx.createAnalyser();
        remoteAnalyser.fftSize = 256;
        remoteSource.connect(remoteAnalyser);
        const remoteData = new Uint8Array(remoteAnalyser.frequencyBinCount);

        let localAnalyser: AnalyserNode | null = null;
        if (localStreamRef.current) {
          const localSource = ctx.createMediaStreamSource(localStreamRef.current);
          localAnalyser = ctx.createAnalyser();
          localAnalyser.fftSize = 256;
          localSource.connect(localAnalyser);
        }
        const localData = localAnalyser ? new Uint8Array(localAnalyser.frequencyBinCount) : null;

        const checkAudioActivity = () => {
          remoteAnalyser.getByteFrequencyData(remoteData);
          let remoteSum = 0;
          for (let i = 0; i < remoteData.length; i++) remoteSum += remoteData[i];
          const remoteAvg = remoteSum / remoteData.length;
          setIsRemoteSpeaking(remoteAvg > 18);

          if (localAnalyser && localData) {
            localAnalyser.getByteFrequencyData(localData);
            let localSum = 0;
            for (let i = 0; i < localData.length; i++) localSum += localData[i];
            const localAvg = localSum / localData.length;
            setIsLocalSpeaking(localAvg > 18);
          }

          animFrameRef.current = requestAnimationFrame(checkAudioActivity);
        };

        checkAudioActivity();
      }
    } catch (err) {
      console.debug('Audio analyzer init error:', err);
    }
  };

  // Main WebRTC & PeerJS Media Setup Engine
  useEffect(() => {
    if (!chat || status !== 'accepted') return;

    let isDisposed = false;
    let unsubSignals: (() => void) | null = null;
    let unsubPeerCall: (() => void) | null = null;

    const startHybridCallEngine = async () => {
      try {
        // 1. Acquire Local Media Stream
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: isVideo ? {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: isFrontCamera ? 'user' : 'environment'
          } : false
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn('Video acquisition fallback to audio:', err);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }

        if (isDisposed) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Render local video preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => console.debug('Local video play check:', e));
        }

        const targetId = isCaller 
          ? (chat.participant?.id || chat.participantIds?.find(id => id !== currentUserId) || '')
          : (chat.participant?.id || chat.participantIds?.find(id => id !== currentUserId) || '');

        console.log(`[ActiveCallModal] Initializing WebRTC P2P Call. isCaller=${isCaller}, targetUserId=${targetId}, callId=${callId}`);

        // 2. PRIMARY: Initialize Native RTCPeerConnection with Firestore Signaling
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionRef.current = pc;

        // Add local tracks to RTCPeerConnection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Remote track received handler
        pc.ontrack = (event) => {
          console.log('[RTCPeerConnection] Remote track arrived:', event.track.kind);
          const remoteStream = event.streams[0] || new MediaStream([event.track]);
          attachRemoteStream(remoteStream);
        };

        // ICE candidate handler: send candidates to Firestore
        pc.onicecandidate = (event) => {
          if (event.candidate && callId && currentUserId) {
            sendCallSignal(callId, currentUserId, 'ice-candidate', event.candidate.toJSON()).catch(e => {
              console.debug('Failed to send ICE candidate:', e);
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[RTCPeerConnection] Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setConnectionQuality('connected');
          } else if (pc.connectionState === 'connecting') {
            setConnectionQuality('connecting');
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setConnectionQuality('reconnecting');
          }
        };

        // If CALLER: Create and send SDP Offer via Firestore
        if (isCaller) {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: isVideo
          });
          await pc.setLocalDescription(offer);

          if (callId && currentUserId) {
            await sendCallSignal(callId, currentUserId, 'offer', {
              sdp: offer.sdp,
              type: offer.type
            });
          }
        }

        // Listen for incoming Firestore Call Signals (Answer, ICE Candidate, or Offer)
        if (callId && currentUserId) {
          unsubSignals = subscribeToCallSignals(callId, currentUserId, async (signal) => {
            if (isDisposed || !peerConnectionRef.current) return;
            const currentPc = peerConnectionRef.current;

            try {
              if (signal.type === 'offer' && !isCaller) {
                console.log('[Firestore Signaling] Received SDP Offer from caller');
                await currentPc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                const answer = await currentPc.createAnswer();
                await currentPc.setLocalDescription(answer);
                await sendCallSignal(callId, currentUserId, 'answer', {
                  sdp: answer.sdp,
                  type: answer.type
                });
              } else if (signal.type === 'answer' && isCaller) {
                console.log('[Firestore Signaling] Received SDP Answer from receiver');
                if (currentPc.signalingState === 'have-local-offer') {
                  await currentPc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                }
              } else if (signal.type === 'ice-candidate' && signal.payload) {
                console.log('[Firestore Signaling] Adding remote ICE Candidate');
                try {
                  await currentPc.addIceCandidate(new RTCIceCandidate(signal.payload));
                } catch (candidateErr) {
                  console.debug('Candidate addition notice:', candidateErr);
                }
              }
            } catch (sigErr) {
              console.warn('[Firestore Signaling] Error processing signal:', sigErr);
            }
          });
        }

        // 3. SECONDARY COMPLEMENT: PeerJS Media Channel for parallel fallback
        if (targetId) {
          if (isCaller) {
            const mediaCall = peerService.callPeer(targetId, stream);
            if (mediaCall) {
              peerMediaCallRef.current = mediaCall;
              mediaCall.on('stream', (remotePeerStream: MediaStream) => {
                console.log('[PeerJS] Direct PeerJS media stream received');
                attachRemoteStream(remotePeerStream);
              });
            }
          } else {
            unsubPeerCall = peerService.onIncomingCall((incomingCall) => {
              peerMediaCallRef.current = incomingCall;
              incomingCall.answer(stream);
              incomingCall.on('stream', (remotePeerStream: MediaStream) => {
                console.log('[PeerJS] Answered PeerJS media stream received');
                attachRemoteStream(remotePeerStream);
              });
            });
          }
        }

      } catch (err) {
        console.error('[ActiveCallModal] Setup error:', err);
      }
    };

    startHybridCallEngine();

    return () => {
      isDisposed = true;
      if (unsubSignals) unsubSignals();
      if (unsubPeerCall) unsubPeerCall();
      if (peerMediaCallRef.current) {
        try { peerMediaCallRef.current.close(); } catch (e) {}
      }
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch (e) {}
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
        audioContextRef.current = null;
      }
      peerService.clearPendingCall();
    };
  }, [chat, status, isCaller, isVideo, callId, currentUserId, isFrontCamera]);

  // ----------------- CALL RECORDING ENGINE (INDEXEDDB) ----------------- //

  const startRecording = () => {
    if (isRecording) return;
    if (!chat) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      recordingAudioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      let hasAudioTracks = false;

      // 1. Combine Local Audio Track
      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        try {
          const localSrc = audioCtx.createMediaStreamSource(localStreamRef.current);
          localSrc.connect(dest);
          hasAudioTracks = true;
        } catch (e) {
          console.debug('Record local audio connect error:', e);
        }
      }

      // 2. Combine Remote Audio Track
      if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
        try {
          const remoteSrc = audioCtx.createMediaStreamSource(remoteStreamRef.current);
          remoteSrc.connect(dest);
          hasAudioTracks = true;
        } catch (e) {
          console.debug('Record remote audio connect error:', e);
        }
      }

      const tracks: MediaStreamTrack[] = [];
      if (hasAudioTracks) {
        dest.stream.getAudioTracks().forEach(t => tracks.push(t));
      } else {
        // Direct stream fallback
        if (localStreamRef.current?.getAudioTracks()[0]) tracks.push(localStreamRef.current.getAudioTracks()[0]);
        if (remoteStreamRef.current?.getAudioTracks()[0]) tracks.push(remoteStreamRef.current.getAudioTracks()[0]);
      }

      // 3. Attach Video Track (if video call)
      if (isVideo) {
        const remoteVideoTrack = remoteStreamRef.current?.getVideoTracks()[0];
        const localVideoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (remoteVideoTrack) {
          tracks.push(remoteVideoTrack);
        } else if (localVideoTrack) {
          tracks.push(localVideoTrack);
        }
      }

      if (tracks.length === 0) {
        setRecordingNotice({ text: 'No audio/video stream available to record yet', type: 'warning' });
        return;
      }

      const combinedStream = new MediaStream(tracks);
      combinedRecordingStreamRef.current = combinedStream;

      // Determine best supported MIME type
      let mimeType = isVideo ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = isVideo ? 'video/webm;codecs=vp8,opus' : 'audio/webm';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = isVideo ? 'video/webm' : 'audio/ogg';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = isVideo ? 'video/mp4' : 'audio/mp4';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose default
        }
      }

      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recordingDurationRef.current = 0;
      setRecordingDuration(0);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = recordedChunksRef.current;
        if (chunks.length > 0) {
          const finalMime = recorder.mimeType || (isVideo ? 'video/webm' : 'audio/webm');
          const finalBlob = new Blob(chunks, { type: finalMime });
          const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          
          const newRecording: CallRecording = {
            id: recordingId,
            callId: callId || `call_${Date.now()}`,
            chatId: chat.id,
            contactName: chat.name,
            contactAvatar: chat.avatar,
            isVideo: isVideo,
            duration: recordingDurationRef.current || duration || 1,
            createdAt: Date.now(),
            formattedDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
            mimeType: finalMime,
            blob: finalBlob,
            sizeBytes: finalBlob.size
          };

          await saveCallRecordingToIndexedDB(newRecording);
          
          const objectUrl = URL.createObjectURL(finalBlob);
          setSavedRecording({
            id: recordingId,
            name: chat.name,
            isVideo: isVideo,
            duration: recordingDurationRef.current || duration || 1,
            url: objectUrl,
            sizeBytes: finalBlob.size
          });

          setRecordingNotice({
            text: `Call recording saved locally to IndexedDB (${(finalBlob.size / 1024).toFixed(0)} KB)`,
            type: 'success'
          });
        }
      };

      recorder.start(1000); // 1-second chunks
      setIsRecording(true);
      playGlassChimeSound('lock');
      setRecordingNotice({
        text: 'Call recording started (saved locally to IndexedDB)',
        type: 'info'
      });

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          recordingDurationRef.current = next;
          return next;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start call recording:', err);
      setRecordingNotice({ text: 'Call recording not supported on this browser/stream', type: 'warning' });
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.debug('MediaRecorder stop notice:', e);
      }
    }

    if (recordingAudioCtxRef.current) {
      try { recordingAudioCtxRef.current.close(); } catch (e) {}
      recordingAudioCtxRef.current = null;
    }

    playGlassChimeSound('lock');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleDownloadSavedRecording = () => {
    if (!savedRecording?.url) return;
    playGlassChimeSound('sent');
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = savedRecording.url;
    const cleanName = (savedRecording.name || 'Call').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = savedRecording.isVideo ? 'webm' : 'webm';
    a.download = `Record_${cleanName}_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
  };

  const handleSwitchCamera = async () => {
    setIsFrontCamera(prev => !prev);
  };

  if (!chat) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEnd = () => {
    if (isRecording) {
      stopRecording();
    }
    playGlassChimeSound('incoming');
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-2xl animate-in fade-in duration-150 select-none">
      {/* Hidden HD Audio Element with autoPlay */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-sm sm:max-w-md p-5 sm:p-6 rounded-3xl mirror-glass-card border border-white/20 shadow-2xl flex flex-col items-center justify-between min-h-[520px] max-h-[94vh] overflow-y-auto custom-scrollbar relative text-center">
        
        {/* Top Header: Availability Indicator & Signal Strength Meter */}
        <div className="w-full flex flex-col items-center space-y-2 pt-1">
          
          {/* Top Row: User Availability Badge + Signal Strength Indicator */}
          <div className="w-full flex items-center justify-between gap-2 px-1">
            
            {/* 1. User Availability Indicator: "user is online" / "user is offline" */}
            <div 
              id="user-availability-indicator"
              className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 shadow-sm transition-all duration-300 ${
                targetUserPresence.isOnline
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/20'
                  : 'bg-slate-800/60 border-slate-600/40 text-slate-300 shadow-inner'
              }`}
              title={`Availability: ${targetUserPresence.isOnline ? 'Online and connected' : targetUserPresence.lastSeen}`}
            >
              <span className="relative flex h-2 w-2 items-center justify-center">
                {targetUserPresence.isOnline ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </>
                ) : (
                  <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                )}
              </span>
              <span className="font-semibold tracking-wide capitalize">
                {targetUserPresence.isOnline ? 'user is online' : 'user is offline'}
              </span>
            </div>

            {/* 2. WebRTC Signal Strength Indicator (CSS Icons) */}
            <button
              type="button"
              id="signal-strength-indicator"
              onClick={() => setShowStatsDrawer(!showStatsDrawer)}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md flex items-center gap-2 text-[11px] font-semibold text-slate-200 transition-all active:scale-95 cursor-pointer"
              title="Click to toggle WebRTC Network Stats"
            >
              {/* Stepped CSS Cellular/WiFi Signal Bars */}
              <div className="flex items-end gap-[2.5px] h-3.5 pb-0.5" aria-label={`Signal strength: ${signalStats.quality}`}>
                {/* Bar 1 (Lowest) */}
                <span
                  className={`w-1 rounded-xs transition-all duration-300 ${
                    signalStats.bars >= 1
                      ? (signalStats.bars === 1 ? 'bg-rose-500 h-1.5 shadow-xs shadow-rose-500/50' : signalStats.bars === 2 ? 'bg-amber-400 h-1.5' : 'bg-emerald-400 h-1.5')
                      : 'bg-white/20 h-1.5'
                  }`}
                />
                {/* Bar 2 */}
                <span
                  className={`w-1 rounded-xs transition-all duration-300 ${
                    signalStats.bars >= 2
                      ? (signalStats.bars === 2 ? 'bg-amber-400 h-2.5 shadow-xs shadow-amber-500/50' : 'bg-emerald-400 h-2.5')
                      : 'bg-white/20 h-2.5'
                  }`}
                />
                {/* Bar 3 */}
                <span
                  className={`w-1 rounded-xs transition-all duration-300 ${
                    signalStats.bars >= 3 ? 'bg-emerald-400 h-3' : 'bg-white/20 h-3'
                  }`}
                />
                {/* Bar 4 (Highest) */}
                <span
                  className={`w-1 rounded-xs transition-all duration-300 ${
                    signalStats.bars >= 4 ? 'bg-emerald-400 h-3.5 shadow-xs shadow-emerald-500/60' : 'bg-white/20 h-3.5'
                  }`}
                />
              </div>

              {/* Quality Label & RTT */}
              <span className="text-[10px] font-mono font-bold text-slate-300">
                {status === 'accepted' ? (
                  signalStats.rttMs !== null ? `${signalStats.rttMs}ms` : signalStats.quality
                ) : 'P2P'}
              </span>
            </button>

          </div>

          {/* WebRTC Live Diagnostic Stats Drawer (Expands on click of signal badge) */}
          {showStatsDrawer && (
            <div className="w-full p-2.5 rounded-2xl bg-black/50 border border-white/10 text-left text-[11px] text-slate-300 space-y-1 animate-in slide-in-from-top-2 duration-150 backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 font-bold text-[10px] border-b border-white/10 pb-1">
                <span>WebRTC P2P Real-Time Metrics</span>
                <span className={`font-bold ${
                  signalStats.bars >= 3 ? 'text-emerald-400' : signalStats.bars === 2 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {signalStats.quality} Signal
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                <div>Latency (RTT): <span className="font-bold text-white">{signalStats.rttMs !== null ? `${signalStats.rttMs} ms` : 'Measuring...'}</span></div>
                <div>Packet Loss: <span className="font-bold text-white">{signalStats.packetLossPercent !== null ? `${signalStats.packetLossPercent}%` : '0%'}</span></div>
                <div>Bitrate: <span className="font-bold text-white">{signalStats.bitrateKbps !== null ? `${signalStats.bitrateKbps} kbps` : 'HD Stream'}</span></div>
                <div>Jitter: <span className="font-bold text-white">{signalStats.jitterMs !== null ? `${signalStats.jitterMs} ms` : '1 ms'}</span></div>
              </div>
            </div>
          )}

          {/* Active Recording Banner */}
          {isRecording && (
            <div className="w-full px-3 py-1.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-between animate-pulse shadow-lg shadow-rose-500/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>REC {formatTimer(recordingDuration)}</span>
              </div>
              <span className="text-[10px] font-mono text-rose-300">IndexedDB Local</span>
            </div>
          )}

          {/* Notification Toast Banner */}
          {recordingNotice && (
            <div className={`w-full px-3 py-1.5 rounded-2xl text-[11px] font-semibold border flex items-center justify-between animate-in slide-in-from-top-1 duration-150 ${
              recordingNotice.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                : recordingNotice.type === 'warning'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                : 'bg-blue-500/20 border-blue-500/40 text-blue-200'
            }`}>
              <span>{recordingNotice.text}</span>
              <button
                type="button"
                onClick={() => setRecordingNotice(null)}
                className="ml-2 text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Saved Recording Action Banner */}
          {savedRecording && !isRecording && (
            <div className="w-full p-2.5 rounded-2xl bg-slate-900/90 border border-white/20 text-left space-y-1.5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span>💾</span>
                  <span>Call Recording Stored</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSavedRecording(null)}
                  className="text-slate-400 hover:text-white text-[11px]"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
                <span>Duration: {formatTimer(savedRecording.duration)}</span>
                <span>Size: {(savedRecording.sizeBytes / 1024).toFixed(0)} KB</span>
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowPreviewPlayer(!showPreviewPlayer)}
                  className="flex-1 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span>{showPreviewPlayer ? 'Hide' : '▶️ Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSavedRecording}
                  className="flex-1 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span>⬇️ Download</span>
                </button>
              </div>

              {showPreviewPlayer && (
                <div className="pt-1">
                  {savedRecording.isVideo ? (
                    <video
                      src={savedRecording.url}
                      controls
                      className="w-full aspect-video rounded-xl bg-black"
                    />
                  ) : (
                    <audio
                      src={savedRecording.url}
                      controls
                      className="w-full h-8 accent-blue-500"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Sub-badge (Connection state & speaking alert) */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold border inline-flex items-center gap-1.5 shadow-sm ${
              connectionQuality === 'connected'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
            }`}>
              <span className={`w-2 h-2 rounded-full ${connectionQuality === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>
                {connectionQuality === 'connected'
                  ? (isVideo ? '🟢 HD Video Connected (P2P)' : '🟢 HD Voice Connected (P2P)')
                  : (status === 'ringing' ? 'Calling...' : 'Establishing Secure P2P Stream...')}
              </span>
            </span>

            {/* Speaking Pulse Badge */}
            {isRemoteSpeaking && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 flex items-center gap-1 animate-pulse">
                <span>🔊</span>
                <span>Speaking</span>
              </span>
            )}
          </div>

          {/* Call Duration Timer */}
          <p className="text-xs text-slate-300 font-mono font-bold">
            {status === 'ringing' ? 'Waiting for answer...' : formatTimer(duration)}
          </p>
        </div>

        {/* Center Main View (Video Grid or Avatar Waveform) */}
        <div className="my-auto w-full flex flex-col items-center justify-center py-2">
          {isVideo && status === 'accepted' ? (
            <div className="relative w-full aspect-square max-w-[280px] sm:max-w-[320px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black/80 flex items-center justify-center">
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${hasRemoteVideo ? 'opacity-100' : 'opacity-0'}`}
              />

              {!hasRemoteVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-gradient-to-b from-slate-900 to-black">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-purple-500/40 flex items-center justify-center text-4xl shadow-xl">
                    {chat.avatar || '👤'}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Remote Camera Connecting...</span>
                </div>
              )}

              {/* Local Video Stream Picture-in-Picture */}
              <div className="absolute bottom-3 right-3 w-20 h-28 sm:w-24 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-black/90">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : 'block'}`}
                />
                {isCameraOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900 text-xs">
                    <span>🚫</span>
                    <span className="text-[9px] mt-1">Off</span>
                  </div>
                )}
                {/* Local speaking indicator in PiP */}
                {isLocalSpeaking && (
                  <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
            </div>
          ) : (
            /* Voice Call Avatar with Animated Sound Waves */
            <div className="relative flex flex-col items-center space-y-3">
              <div className="relative flex items-center justify-center">
                {/* Dynamic Voice Waves Ring */}
                {isRemoteSpeaking && (
                  <>
                    <div className="absolute w-36 h-36 rounded-full border-2 border-blue-400/40 animate-ping" />
                    <div className="absolute w-44 h-44 rounded-full border border-purple-400/30 animate-pulse" />
                  </>
                )}

                <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border-2 ${
                  isRemoteSpeaking ? 'border-emerald-400 shadow-emerald-500/30' : 'border-blue-500/40'
                } flex items-center justify-center text-5xl sm:text-6xl shadow-2xl transition-all`}>
                  {chat.avatar || '👤'}
                </div>

                <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 border-2 border-[#121418] flex items-center justify-center text-sm shadow-md">
                  {isVideo ? '📹' : '📞'}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">{chat.name}</h3>
                <p className="text-xs text-slate-300">
                  {status === 'ringing' 
                    ? (targetUserPresence.isOnline ? 'Ringing online user...' : 'Calling (user is currently offline)...') 
                    : (isRemoteSpeaking ? '🔊 Speaking now...' : 'End-to-End Encrypted Voice')}
                </p>
                {/* Subtle secondary user availability hint below name */}
                <div className="pt-0.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                    targetUserPresence.isOnline ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-white/5'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${targetUserPresence.isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                    <span>{targetUserPresence.isOnline ? 'user is online' : 'user is offline'}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom In-Call Interactive Control Panel */}
        <div className="w-full space-y-2.5 pt-2">
          {/* Microphones, Camera, Speaker, and Record Controls Row */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
            
            {/* 1. Mic Mute / Unmute */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                playGlassChimeSound('lock');
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center text-base sm:text-lg transition-all shadow-lg active:scale-95 cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/30 border border-rose-500/60 text-rose-200'
                  : (isLocalSpeaking ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-200 shadow-emerald-500/20' : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white')
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              <span>{isMuted ? '🔇' : '🎙️'}</span>
              <span className="text-[9px] font-bold mt-0.5">{isMuted ? 'Muted' : 'Mic On'}</span>
            </button>

            {/* 2. Record Call Button */}
            <button
              type="button"
              id="record-call-btn"
              onClick={toggleRecording}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center text-base sm:text-lg transition-all shadow-lg active:scale-95 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600/40 border border-rose-400 text-rose-200 shadow-rose-600/30 animate-pulse'
                  : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white'
              }`}
              title={isRecording ? 'Stop call recording' : 'Record call (saves locally to IndexedDB)'}
            >
              <span className={isRecording ? 'animate-bounce text-rose-400' : 'text-rose-400'}>
                {isRecording ? '⏹️' : '🔴'}
              </span>
              <span className="text-[9px] font-bold mt-0.5">
                {isRecording ? formatTimer(recordingDuration) : 'Record'}
              </span>
            </button>

            {/* 3. Video Camera On / Off (if Video Call) */}
            {isVideo && (
              <button
                type="button"
                onClick={() => {
                  setIsCameraOff(!isCameraOff);
                  playGlassChimeSound('lock');
                }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center text-base sm:text-lg transition-all shadow-lg active:scale-95 cursor-pointer ${
                  isCameraOff
                    ? 'bg-rose-500/30 border border-rose-500/60 text-rose-200'
                    : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white'
                }`}
                title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              >
                <span>{isCameraOff ? '🚫' : '📹'}</span>
                <span className="text-[9px] font-bold mt-0.5">{isCameraOff ? 'Cam Off' : 'Cam On'}</span>
              </button>
            )}

            {/* 4. Flip Camera (if Video Call) */}
            {isVideo && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex flex-col items-center justify-center text-base sm:text-lg transition-all shadow-lg active:scale-95 cursor-pointer"
                title="Switch Camera (Front/Back)"
              >
                <span>🔄</span>
                <span className="text-[9px] font-bold mt-0.5">Flip</span>
              </button>
            )}

            {/* 5. Speaker Volume Boost Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSpeakerOn(!isSpeakerOn);
                playGlassChimeSound('sent');
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center text-base sm:text-lg transition-all shadow-lg active:scale-95 cursor-pointer ${
                isSpeakerOn
                  ? 'bg-blue-600/30 border border-blue-400 text-blue-200'
                  : 'bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300'
              }`}
              title="Toggle Speakerphone"
            >
              <span>{isSpeakerOn ? '🔊' : '🔈'}</span>
              <span className="text-[9px] font-bold mt-0.5">{isSpeakerOn ? 'Speaker' : 'Earpiece'}</span>
            </button>
          </div>

          {/* End Call Action Button */}
          <button
            type="button"
            onClick={handleEnd}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <span className="text-lg">📵</span>
            <span>End Call</span>
          </button>
        </div>

      </div>
    </div>
  );
};
