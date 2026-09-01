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
      className={`fixed top-2.5 inset-x-2.5 z-40 max-w-[370px] mx-auto py-1.5 px-2.5 rounded-full mirror-glass-nav border border-white/10 shadow-2xl backdrop-blur-2xl transition-all duration-200 ease-out pt-[max(0.375rem,env(safe-area-inset-top,0px))] ${
        isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <div className="w-full flex items-center justify-between">
        {/* Left: Glowing User Profile Avatar (Blue Sapphire Glow) */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="header-profile-avatar-btn"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-sm ring-2 ring-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.65)] hover:scale-105 active:scale-95 transition-all select-none"
            title="My Profile & Settings"
          >
            <span>{currentUser?.avatar || '👤'}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#090a0f]" />
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute top-full left-0 mt-2 w-44 rounded-2xl mirror-glass border border-white/15 shadow-2xl overflow-hidden z-[60] animate-in slide-in-from-top-2 duration-150 py-1.5">
              <div className="px-3 py-1.5 border-b border-white/10 mb-1">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Signed In As</p>
                <p className="text-[11px] text-white font-bold truncate">@{currentUser?.username || 'user'}</p>
                <p className="text-[9px] text-slate-400 font-mono truncate">{currentUser?.phoneNumber}</p>
              </div>

              <button
                onClick={() => { onOpenProfile(); setShowProfileDropdown(false); }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-semibold"
              >
                <span>👤</span>
                <span>My Profile</span>
              </button>

              {onOpenSettings && (
                <button
                  onClick={() => { onOpenSettings(); setShowProfileDropdown(false); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-semibold"
                >
                  <span>⚙️</span>
                  <span>App Settings</span>
                </button>
              )}

              <button
                onClick={() => { onToggleTheme?.(); setShowProfileDropdown(false); }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-semibold"
              >
                <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </button>

              <button
                onClick={() => { onLogout?.(); setShowProfileDropdown(false); }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 text-indigo-400 hover:text-white hover:bg-indigo-600/30 transition-colors text-[11px] font-bold border-t border-white/10 mt-1 pt-1.5"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Red & Blue action icons */}
        <div className="flex items-center gap-2">
          {/* Support Contact Button */}
          <a
            href="sms:+2348082076038"
            className="w-7 h-7 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:text-blue-300 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95 flex items-center justify-center text-xs select-none"
            title="Contact Support"
          >
            <span className="text-xs">🎧</span>
          </a>

          {/* Messages / Notifications Button */}
          <button
            id="header-chat-btn"
            onClick={onOpenNotifications}
            className="relative w-7 h-7 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:text-blue-300 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95 flex items-center justify-center text-xs select-none"
            title="Messages & Notifications"
          >
            <span>💬</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 flex items-center justify-center text-[7px] font-extrabold text-white bg-indigo-600 rounded-full ring-1 ring-[#090a0f] shadow-[0_0_8px_#f43f5e] animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Settings Gear Button */}
          <button
            id="header-settings-btn"
            onClick={() => onOpenSettings ? onOpenSettings() : onOpenProfile()}
            className="w-7 h-7 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:text-blue-300 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95 flex items-center justify-center text-xs select-none"
            title="Settings"
          >
            <span>⚙️</span>
          </button>
        </div>
      </div>
    </header>
  );
};

