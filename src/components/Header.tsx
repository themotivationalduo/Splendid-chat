import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  theme?: 'dark' | 'light';
  onOpenStartNewChat?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenProfile,
  onLogout,
  onToggleTheme,
  theme,
  onOpenStartNewChat,
  onOpenSettings
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(false);
      setShowProfileDropdown(false);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 200);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
    <header
      className={`fixed top-3 inset-x-3 z-40 max-w-md mx-auto py-2 px-3 rounded-full mirror-glass-nav border border-white/10 shadow-2xl backdrop-blur-2xl transition-all duration-200 ease-out pt-[max(0.5rem,env(safe-area-inset-top,0px))] ${
        isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <div className="w-full flex items-center justify-between">
        {/* Left: Glowing User Profile Avatar (Exact match to screenshot) */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="header-profile-avatar-btn"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="relative w-10 h-10 rounded-full bg-gradient-to-br from-rose-700 via-rose-600 to-red-700 flex items-center justify-center text-white font-extrabold text-base ring-2 ring-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.65)] hover:scale-105 active:scale-95 transition-all select-none"
            title="My Profile & Settings"
          >
            <span>{currentUser?.avatar || '👤'}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#090a0f]" />
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute top-full left-0 mt-3 w-48 rounded-2xl mirror-glass border border-white/15 shadow-2xl overflow-hidden z-[60] animate-in slide-in-from-top-2 duration-150 py-2">
              <div className="px-4 py-2 border-b border-white/10 mb-1">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Signed In As</p>
                <p className="text-xs text-white font-bold truncate">@{currentUser?.username || 'user'}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser?.phoneNumber}</p>
              </div>

              <button
                onClick={() => { onOpenProfile(); setShowProfileDropdown(false); }}
                className="w-full px-4 py-2 flex items-center gap-3 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
              >
                <span>👤</span>
                <span>My Profile</span>
              </button>

              {onOpenSettings && (
                <button
                  onClick={() => { onOpenSettings(); setShowProfileDropdown(false); }}
                  className="w-full px-4 py-2 flex items-center gap-3 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
                >
                  <span>⚙️</span>
                  <span>App Settings</span>
                </button>
              )}

              <button
                onClick={() => { onToggleTheme?.(); setShowProfileDropdown(false); }}
                className="w-full px-4 py-2 flex items-center gap-3 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
              >
                <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </button>

              <button
                onClick={() => { onLogout?.(); setShowProfileDropdown(false); }}
                className="w-full px-4 py-2 flex items-center gap-3 text-rose-400 hover:text-white hover:bg-rose-600/30 transition-colors text-xs font-bold border-t border-white/10 mt-1.5 pt-2"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Two red-outline action icons matching screenshot (💬 and ⚙️) */}
        <div className="flex items-center gap-2.5">
          {/* Messages / Notifications Button */}
          <button
            id="header-chat-btn"
            onClick={onOpenNotifications}
            className="relative w-9 h-9 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:text-rose-300 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] active:scale-95 flex items-center justify-center text-base select-none"
            title="Messages & Notifications"
          >
            <span>💬</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center text-[8px] font-extrabold text-white bg-rose-600 rounded-full ring-1 ring-[#090a0f] shadow-[0_0_8px_#f43f5e] animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Settings Gear Button */}
          <button
            id="header-settings-btn"
            onClick={() => onOpenSettings ? onOpenSettings() : onOpenProfile()}
            className="w-9 h-9 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:text-rose-300 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] active:scale-95 flex items-center justify-center text-base select-none"
            title="Settings"
          >
            <span>⚙️</span>
          </button>
        </div>
      </div>
    </header>
  );
};

