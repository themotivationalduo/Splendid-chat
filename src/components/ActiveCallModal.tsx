import React, { useState, useEffect } from 'react';
import { Chat } from '../types';
import { playGlassChimeSound } from '../services/audioService';

interface ActiveCallModalProps {
  chat: Chat | null;
  isVideo: boolean;
  status?: 'ringing' | 'accepted' | 'declined' | 'ended';
  onEndCall: () => void;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  chat,
  isVideo,
  status = 'ringing',
  onEndCall
}) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    if (!chat || status === 'ringing') return;
    setDuration(0);
    const interval = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [chat, status]);

  if (!chat) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEnd = () => {
    playGlassChimeSound('incoming');
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-2xl animate-in fade-in duration-75">
      <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl flex flex-col items-center justify-between min-h-[460px] max-h-[90vh] overflow-y-auto custom-scrollbar relative text-center">
        {/* Top Status */}
        <div className="space-y-1 select-none">
          <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isVideo ? 'HD Video Call' : 'HD Voice Call'}</span>
          </span>
          <p className="text-xs text-slate-400 font-mono pt-1">
            {status === 'ringing' ? 'Calling...' : formatTimer(duration)}
          </p>
        </div>

        {/* Center Avatar & Info */}
        <div className="my-auto flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border-2 border-red-500/40 flex items-center justify-center text-5xl shadow-2xl animate-pulse">
              {chat.avatar || '👤'}
            </div>
            <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#121418] flex items-center justify-center text-xs">
              {isVideo ? '📹' : '📞'}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-white">{chat.name}</h3>
            <p className="text-xs text-slate-400">
              {status === 'ringing' ? 'Waiting for peer connection...' : (chat.participant?.phoneNumber || 'HD Audio stream established')}
            </p>
          </div>
        </div>

        {/* Bottom Call Controls */}
        <div className="w-full space-y-4 select-none">
          <div className="flex items-center justify-center gap-3">
            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all shadow-md ${
                isMuted
                  ? 'bg-rose-600/30 border border-rose-500 text-rose-300'
                  : 'bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200'
              }`}
              title="Mute microphone"
            >
              <span>{isMuted ? '🔇' : '🎙️'}</span>
            </button>

            {/* Video Toggle (if video) */}
            {isVideo && (
              <button
                onClick={() => setIsCameraOff(!isCameraOff)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all shadow-md ${
                  isCameraOff
                    ? 'bg-rose-600/30 border border-rose-500 text-rose-300'
                    : 'bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200'
                }`}
                title="Toggle camera"
              >
                <span>{isCameraOff ? '🚫' : '📹'}</span>
              </button>
            )}

            {/* Speaker Button */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all shadow-md ${
                isSpeakerOn
                  ? 'bg-red-600/20 border border-red-500/40 text-red-300'
                  : 'bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200'
              }`}
              title="Speakerphone"
            >
              <span>{isSpeakerOn ? '🔊' : '🔈'}</span>
            </button>
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEnd}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-red-600/40 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span className="text-lg">📵</span>
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
