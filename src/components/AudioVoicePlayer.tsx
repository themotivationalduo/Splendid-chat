import React, { useState, useRef, useEffect } from 'react';

interface AudioVoicePlayerProps {
  audioUrl?: string;
  duration?: number;
  waveData?: number[];
  isUserMessage?: boolean;
}

export const AudioVoicePlayer: React.FC<AudioVoicePlayerProps> = ({
  audioUrl,
  duration = 14,
  waveData = [30, 50, 80, 60, 90, 45, 70, 85, 40, 65, 95, 30, 75, 55, 80, 40, 60, 85, 50, 70, 90, 40, 60, 30],
  isUserMessage = false
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
    <div className="flex items-center gap-3 py-1 px-1 min-w-[200px] max-w-xs select-none">
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

      {/* Play/Pause Glass Button */}
      <button
        onClick={handleTogglePlay}
        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all shrink-0 text-sm ${
          isUserMessage
            ? 'bg-white text-red-600 shadow-md hover:bg-slate-100'
            : 'bg-red-600 text-white shadow-md hover:bg-red-500 shadow-red-600/30'
        }`}
      >
        <span>{isPlaying ? '⏸️' : '▶️'}</span>
      </button>

      {/* Waveform Bars */}
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-0.5 h-6">
          {waveData.map((barHeight, idx) => {
            const barProgress = (idx / waveData.length) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <div
                key={idx}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(20, Math.min(100, barHeight))}%`,
                  backgroundColor: isFilled
                    ? isUserMessage
                      ? '#FFFFFF'
                      : '#EF4444'
                    : isUserMessage
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.15)'
                }}
              />
            );
          })}
        </div>

        {/* Time duration indicator */}
        <div className="flex items-center justify-between text-[11px] font-medium opacity-80">
          <span className="flex items-center gap-1">
            <span>🎤</span>
            <span>Voice Memo</span>
          </span>
          <span>{isPlaying ? formatTime(currentTime) : formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
