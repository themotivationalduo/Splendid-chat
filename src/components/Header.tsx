import React from 'react';
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
  return (
    <header className="sticky top-0 z-40 w-full pt-3 pb-2 px-4 mirror-glass-input backdrop-blur-xl border-b border-white/5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-500/20 ring-1 ring-white/20 text-xl select-none">
            💬
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-red-500 uppercase drop-shadow-[0_2px_10px_rgba(239,68,68,0.3)]">
                SPLENDID
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                CHAT
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentUser ? `@${currentUser.username}` : 'Not signed in'}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions (New Chat, Notification Bell with badge, Profile Avatar) */}
        <div className="flex items-center gap-2">
          {/* Start New Chat Icon Button */}
          {onOpenStartNewChat && (
            <button
              id="header-start-new-chat-btn"
              onClick={onOpenStartNewChat}
              className="relative w-10 h-10 rounded-full bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center text-base select-none"
              title="Start New Chat by Phone Number"
            >
              <span>💬➕</span>
            </button>
          )}

          {/* Notification Bell with red counter badge */}
          <button
            id="header-notification-btn"
            onClick={onOpenNotifications}
            className="relative w-10 h-10 rounded-full mirror-glass-input hover:mirror-glass-input border border-white/10 text-slate-200 transition-all shadow-md active:scale-95 flex items-center justify-center text-lg select-none"
            title="Notifications"
          >
            <span>🔔</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-extrabold text-white bg-red-600 rounded-full ring-2 ring-[#121418] shadow-md animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <button
            id="header-profile-btn"
            onClick={onOpenProfile}
            className="relative w-10 h-10 rounded-full bg-gradient-to-br from-red-600 via-red-500 to-rose-700 flex items-center justify-center text-white font-extrabold text-lg ring-2 ring-red-500/40 hover:ring-red-400 shadow-lg shadow-red-600/30 transition-all active:scale-95 select-none"
            title="My Profile & Settings"
          >
            <span>{currentUser?.avatar || '👤'}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#121418]" />
          </button>
        </div>
      </div>
    </header>
  );
};
