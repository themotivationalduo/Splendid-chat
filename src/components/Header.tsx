import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenStartNewChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenStartNewChat
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Hide during any scrolling (up or down)
      setIsVisible(false);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 250);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
    <header
      className={`fixed top-2 inset-x-2 z-40 max-w-lg mx-auto py-1.5 px-3 rounded-2xl mirror-glass-nav border border-white/15 shadow-xl backdrop-blur-2xl transition-all duration-300 ease-out pt-[max(0.375rem,env(safe-area-inset-top,0px))] ${
        isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-md shadow-red-500/20 ring-1 ring-white/20 text-base select-none shrink-0">
            💬
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-base font-black tracking-tight text-red-500 uppercase drop-shadow-[0_2px_10px_rgba(239,68,68,0.3)] truncate">
                SPLENDID
              </span>
              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                CHAT
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{currentUser ? `@${currentUser.username}` : 'Not signed in'}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions (New Chat, Notification Bell with badge, Profile Avatar) */}
        <div className="flex items-center gap-1.5">
          {/* Start New Chat Icon Button */}
          {onOpenStartNewChat && (
            <button
              id="header-start-new-chat-btn"
              onClick={onOpenStartNewChat}
              className="relative w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center text-xs select-none"
              title="Start New Chat by Phone Number"
            >
              <span>💬➕</span>
            </button>
          )}

          {/* Notification Bell with red counter badge */}
          <button
            id="header-notification-btn"
            onClick={onOpenNotifications}
            className="relative w-8 h-8 rounded-full mirror-glass-input hover:mirror-glass-input border border-white/10 text-slate-200 transition-all shadow-md active:scale-95 flex items-center justify-center text-sm select-none"
            title="Notifications"
          >
            <span>🔔</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center text-[8px] font-extrabold text-white bg-red-600 rounded-full ring-1 ring-[#121418] shadow-md animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <button
            id="header-profile-btn"
            onClick={onOpenProfile}
            className="relative w-8 h-8 rounded-full bg-gradient-to-br from-red-600 via-red-500 to-rose-700 flex items-center justify-center text-white font-extrabold text-sm ring-1 ring-red-500/40 hover:ring-red-400 shadow-md shadow-red-600/30 transition-all active:scale-95 select-none"
            title="My Profile & Settings"
          >
            <span>{currentUser?.avatar || '👤'}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#121418]" />
          </button>
        </div>
      </div>
    </header>
  );
};
