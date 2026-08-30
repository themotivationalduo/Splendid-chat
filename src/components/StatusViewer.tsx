import React, { useState, useEffect, useRef } from 'react';
import { UserStatus, User, STATUS_BACKGROUND_OPTIONS } from '../types';
import { playGlassChimeSound } from '../services/audioService';

interface StatusViewerProps {
  userId: string;
  userStatuses: UserStatus[];
  onClose: () => void;
  currentUser: User;
  onReshareStatus?: (status: UserStatus) => void;
}

export const StatusViewer: React.FC<StatusViewerProps> = ({
  userId,
  userStatuses,
  onClose,
  currentUser,
  onReshareStatus
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStatus = userStatuses[activeIndex];

  // Auto advance status
  useEffect(() => {
    if (!currentStatus) return;

    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingVoice(false);
    }

    // Voice statuses play the voice first, progress runs during audio play or falls back to timer
    const isVoice = currentStatus.type === 'voice';
    const duration = isVoice ? (currentStatus.duration || 5) * 1000 : 4000; // 4 seconds for text/image

    const startTime = Date.now();
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(progressIntervalRef.current!);
        handleNext();
      }
    }, 40);

    // If voice, play it automatically
    if (isVoice && currentStatus.content) {
      const audio = new Audio(currentStatus.content);
      audioRef.current = audio;
      audio.play().then(() => {
        setIsPlayingVoice(true);
      }).catch(err => {
        console.warn('Auto play voice status blocked:', err);
      });

      audio.onended = () => {
        setIsPlayingVoice(false);
      };
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [activeIndex, userId]);

  const handleNext = () => {
    if (activeIndex < userStatuses.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    } else {
      setActiveIndex(0);
    }
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Left 30% clicks go previous, right 70% go next
    if (clickX < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (!currentStatus) return null;

  // Background style helper for text status
  const getGradientBackground = (status: UserStatus) => {
    if (status.backgroundColor) {
      const opt = STATUS_BACKGROUND_OPTIONS.find(b => b.id === status.backgroundColor);
      if (opt) return opt.class;
    }
    const statusId = status.id;
    const charCodeSum = statusId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const gradients = [
      'from-[#312e81] via-[#1e1b4b] to-[#020617]', // indigo/dark
      'from-[#581c87] via-[#3b0764] to-[#090514]', // purple
      'from-[#881337] via-[#4c0519] to-[#0d0205]', // rose/maroon
      'from-[#065f46] via-[#022c22] to-[#01140e]', // emerald
      'from-[#1e3a8a] via-[#172554] to-[#030712]', // blue
      'from-[#7c2d12] via-[#431407] to-[#0c0301]', // orange
    ];
    return gradients[charCodeSum % gradients.length];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-100 select-none">
      <div className="relative w-full max-w-lg h-full max-h-[100dvh] md:max-h-[85vh] md:rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between shadow-2xl bg-[#090b0f]">
        
        {/* Progress Bars Indicator */}
        <div className="absolute top-0 inset-x-0 z-10 px-3 py-4 bg-gradient-to-b from-black/70 to-transparent flex gap-1.5 pointer-events-none">
          {userStatuses.map((_, idx) => {
            let widthPct = 0;
            if (idx < activeIndex) widthPct = 100;
            else if (idx === activeIndex) widthPct = progress;

            return (
              <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-75 ease-linear"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header */}
        <div className="absolute top-7 inset-x-0 z-10 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-xl shadow-md">
              {currentStatus.userAvatar || '👤'}
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-slate-100">{currentStatus.userFullName}</h4>
              <p className="text-[10px] text-slate-400 font-mono">
                {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-all border border-white/10 text-sm active:scale-90 cursor-pointer"
            title="Close Status"
          >
            ✕
          </button>
        </div>

        {/* Interactive Interactive Content Area */}
        <div 
          onClick={handleScreenClick}
          className="flex-1 w-full flex items-center justify-center relative cursor-pointer"
        >
          {/* TEXT TYPE STATUS */}
          {currentStatus.type === 'text' && (
            <div className={`absolute inset-0 bg-gradient-to-tr ${getGradientBackground(currentStatus)} flex items-center justify-center p-8 text-center`}>
              <div className="max-w-md p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
                <p className="text-xl md:text-2xl font-extrabold text-white leading-relaxed whitespace-pre-wrap select-text selection:bg-red-500/30">
                  {currentStatus.content}
                </p>
              </div>
            </div>
          )}

          {/* IMAGE TYPE STATUS */}
          {currentStatus.type === 'image' && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <img 
                src={currentStatus.content} 
                alt="Status" 
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* VOICE NOTE TYPE STATUS */}
          {currentStatus.type === 'voice' && (
            <div className={`absolute inset-0 bg-gradient-to-br ${getGradientBackground(currentStatus)} flex items-center justify-center p-8 text-center`}>
              <div className="w-full max-w-sm p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col items-center space-y-5 select-none">
                <div className="w-20 h-20 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-4xl shadow-xl animate-pulse">
                  🎙️
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Voice Note Status</h4>
                  <p className="text-xs text-slate-400">Duration: {currentStatus.duration || 5}s</p>
                </div>
                {/* Visual pulsating bar indicator */}
                <div className="flex items-center gap-1.5 h-6 justify-center">
                  {[...Array(12)].map((_, i) => {
                    const randomHeight = isPlayingVoice ? Math.floor(Math.random() * 16) + 4 : 4;
                    return (
                      <span 
                        key={i} 
                        className="w-1 rounded-full bg-red-500 transition-all duration-150"
                        style={{ height: `${randomHeight}px` }}
                      />
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest animate-pulse">
                  {isPlayingVoice ? 'Now Playing Stream' : 'Audio Loaded'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Swipe Hint & Action overlay bar at the bottom */}
        <div className="px-4 py-3 bg-black/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 select-none">
          <span>Tap left to go back, right to skip</span>
          {currentStatus.userId !== currentUser.id && currentStatus.allowReshare !== false && onReshareStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReshareStatus(currentStatus);
              }}
              className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg shadow-red-600/20"
              title="Reshare this status to your updates"
            >
              <span>Reshare 🔄</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
