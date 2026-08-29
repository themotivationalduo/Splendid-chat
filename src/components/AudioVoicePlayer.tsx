import React, { useState, useRef, useEffect } from 'react';

interface AudioVoicePlayerProps {
  audioUrl?: string;
  duration?: number;
  waveData?: number[];
  isUserMessage?: boolean;
  senderAvatar?: string;
}

export const AudioVoicePlayer: React.FC<AudioVoicePlayerProps> = ({
  audioUrl,
  duration = 17,
  waveData = [30, 50, 80, 60, 90, 45, 70, 85, 40, 65, 95, 30, 75, 55, 80, 40, 60, 85, 50, 70, 90, 40, 60, 30],
  isUserMessage = false,
  senderAvatar = '👤'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[240px] max-w-xs select-none">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Play/Pause Button */}
      <button
        onClick={handleTogglePlay}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 text-slate-100 hover:text-white hover:scale-105 active:scale-95"
      >
        <span className="text-2xl">{isPlaying ? '⏸' : '▶'}</span>
      </button>

      {/* Waveform & Progress Bar */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="relative flex items-center gap-0.5 h-6">
          {/* Blue progress dot indicator */}
          <div
            className="absolute -top-1 w-3 h-3 rounded-full bg-cyan-400 border border-slate-900 z-10 shadow-sm transition-all duration-75"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
          {waveData.map((barHeight, idx) => {
            const barProgress = (idx / waveData.length) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <div
                key={idx}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(25, Math.min(100, barHeight))}%`,
                  backgroundColor: isFilled ? '#38bdf8' : 'rgba(255, 255, 255, 0.3)'
                }}
              />
            );
          })}
        </div>

        {/* Time duration indicator */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 opacity-90">
          <span>{isPlaying ? formatTime(currentTime) : formatTime(duration)}</span>
        </div>
      </div>

      {/* Avatar Badge on right */}
      <div className="relative shrink-0 ml-1">
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-lg overflow-hidden shadow">
          {senderAvatar}
        </div>
        <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[9px] font-bold shadow">
          🎙
        </div>
      </div>
    </div>
  );
};

