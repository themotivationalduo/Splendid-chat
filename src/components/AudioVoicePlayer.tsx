import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioVoicePlayerProps {
  audioUrl?: string;
  duration?: number;
  waveData?: number[];
  isUserMessage?: boolean;
  senderAvatar?: string;
  accentColor?: string;
}

const SPEED_OPTIONS = [1, 1.5, 2];

export const AudioVoicePlayer: React.FC<AudioVoicePlayerProps> = ({
  audioUrl,
  duration = 17,
  waveData = [],
  isUserMessage = false,
  senderAvatar,
  accentColor
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration || 17);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // Synchronize actualDuration if duration prop changes
  useEffect(() => {
    if (duration && duration > 0) {
      setActualDuration(duration);
    }
  }, [duration]);

  // Normalize / downsample waveform to fixed 22 responsive bars
  const normalizedBars = React.useMemo(() => {
    const TARGET_BARS = 22;
    if (!waveData || waveData.length === 0) {
      return [25, 40, 75, 55, 90, 45, 80, 65, 30, 85, 95, 50, 75, 40, 60, 90, 65, 35, 80, 50, 30, 20];
    }
    if (waveData.length === TARGET_BARS) return waveData;
    const result: number[] = [];
    const step = waveData.length / TARGET_BARS;
    for (let i = 0; i < TARGET_BARS; i++) {
      const idx = Math.floor(i * step);
      const val = waveData[idx] ?? 40;
      result.push(Math.max(18, Math.min(100, val)));
    }
    return result;
  }, [waveData]);

  // Fallback timer when audio element isn't playable
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !audioUrl) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.25 * playbackSpeed;
          if (next >= actualDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, audioUrl, actualDuration, playbackSpeed]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // If playback error, simulate
          setIsPlaying(true);
        });
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeedToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextSpeed = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleWaveformSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * actualDuration;

    setCurrentTime(targetTime);
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = targetTime;
    }
  }, [actualDuration]);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = actualDuration > 0 ? Math.min(100, Math.max(0, (currentTime / actualDuration) * 100)) : 0;
  const activeColor = accentColor || '#38bdf8'; // Default sky-400

  return (
    <div className="flex flex-col gap-1 py-0.5 px-0.5 w-full min-w-0 max-w-[260px] sm:max-w-[280px] select-none">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
              setActualDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      {/* Main Player Row: Play/Pause Button + Waveform */}
      <div className="flex items-center gap-2 w-full min-w-0">
        {/* Play/Pause Button */}
        <button
          onClick={handleTogglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md active:scale-90 ${
            isPlaying
              ? 'bg-white text-slate-900 shadow-white/20'
              : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
          }`}
          title={isPlaying ? 'Pause voice note' : 'Play voice note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Responsive Waveform Area with Click-to-Seek */}
        <div
          ref={waveformRef}
          onClick={handleWaveformSeek}
          className="flex-1 flex items-center gap-[2px] h-7 cursor-pointer relative py-1 group/wave min-w-0"
          title="Click to seek"
        >
          {normalizedBars.map((barHeight, idx) => {
            const barProgress = (idx / normalizedBars.length) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <div
                key={idx}
                className="flex-1 min-w-[2px] max-w-[4px] rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(20, Math.min(100, barHeight))}%`,
                  backgroundColor: isFilled
                    ? activeColor
                    : 'rgba(255, 255, 255, 0.28)'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Footer Info Row: Progress/Duration Time & Speed Pill */}
      <div className="flex items-center justify-between text-[10px] font-medium text-slate-200/90 pl-11 pr-0.5 leading-none">
        <span className="font-mono tracking-tight tabular-nums">
          {isPlaying
            ? `${formatTime(currentTime)} / ${formatTime(actualDuration)}`
            : formatTime(actualDuration)}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Speed Toggle for Voice Notes */}
          <button
            onClick={handleSpeedToggle}
            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono transition-all border ${
              playbackSpeed > 1
                ? 'bg-sky-500/30 text-sky-200 border-sky-400/50'
                : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20'
            }`}
            title="Change playback speed"
          >
            {playbackSpeed}x
          </button>

          {/* Subtle Mic Indicator */}
          <Mic className="w-3 h-3 opacity-60 text-slate-300 shrink-0" />
        </div>
      </div>
    </div>
  );
};


