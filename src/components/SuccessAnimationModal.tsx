import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export type SuccessAnimationType = 'status' | 'profile' | 'login' | 'register' | 'logout' | 'delete' | 'generic';

interface SuccessAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: SuccessAnimationType;
  title: string;
  subtitle?: string;
  duration?: number;
}

export const triggerConfetti = () => {
  try {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#60a5fa', '#2563eb', '#ef4444', '#f43f5e', '#10b981', '#fbbf24']
    });
  } catch (e) {
    console.debug('Confetti effect ignored:', e);
  }
};

export const SuccessAnimationModal: React.FC<SuccessAnimationModalProps> = ({
  isOpen,
  onClose,
  type = 'generic',
  title,
  subtitle,
  duration = 1800
}) => {
  useEffect(() => {
    if (!isOpen) return;

    if (type !== 'logout' && type !== 'delete') {
      triggerConfetti();
    }

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, type, duration, onClose]);

  if (!isOpen) return null;

  const getIconAndGlow = () => {
    switch (type) {
      case 'status':
        return {
          icon: '🚀',
          ringColor: 'ring-blue-500/50',
          bgColor: 'from-blue-600 to-indigo-600',
          shadow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]'
        };
      case 'profile':
        return {
          icon: '✨',
          ringColor: 'ring-blue-500/50',
          bgColor: 'from-blue-500 to-cyan-600',
          shadow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]'
        };
      case 'login':
        return {
          icon: '🎉',
          ringColor: 'ring-blue-500/50',
          bgColor: 'from-blue-600 to-emerald-600',
          shadow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]'
        };
      case 'register':
        return {
          icon: '🌟',
          ringColor: 'ring-blue-500/50',
          bgColor: 'from-blue-600 to-violet-600',
          shadow: 'shadow-[0_0_40px_rgba(59,130,246,0.7)]'
        };
      case 'logout':
        return {
          icon: '👋',
          ringColor: 'ring-blue-500/50',
          bgColor: 'from-blue-600 to-indigo-700',
          shadow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]'
        };
      case 'delete':
        return {
          icon: '🗑️',
          ringColor: 'ring-blue-500/50',
          bgColor: 'from-blue-600 to-indigo-700',
          shadow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]'
        };
      default:
        return {
          icon: '✅',
          ringColor: 'ring-blue-500/50',
          bgColor: 'from-blue-600 to-indigo-600',
          shadow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]'
        };
    }
  };

  const style = getIconAndGlow();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs p-6 rounded-3xl mirror-glass-card border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-3.5 relative overflow-hidden"
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600" />

        {/* Animated Icon Circle */}
        <div className="relative">
          <div
            className={`w-16 h-16 rounded-full bg-gradient-to-tr ${style.bgColor} flex items-center justify-center text-3xl text-white ring-4 ${style.ringColor} ${style.shadow} animate-bounce`}
          >
            <span>{style.icon}</span>
          </div>
          <div className="absolute -inset-1 rounded-full bg-blue-400/20 blur-md -z-10 animate-pulse" />
        </div>

        {/* Text Details */}
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Checkmark indicator button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-1 px-5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition-all active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
};
