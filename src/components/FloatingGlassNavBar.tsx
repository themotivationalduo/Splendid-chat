import React, { useState, useEffect, useRef } from 'react';
import { TabType } from '../types';

interface FloatingGlassNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadMessagesCount: number;
}

export const FloatingGlassNavBar: React.FC<FloatingGlassNavBarProps> = ({
  activeTab,
  onTabChange,
  unreadMessagesCount
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Hide floating nav bar whenever scrolling occurs (up or down)
      setIsVisible(false);

      // When user stops scrolling, automatically reveal navbar almost instantly (after 120ms)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const navItems: { id: TabType; label: string; emoji: string; badge?: number }[] = [
    {
      id: 'chats',
      label: 'Chats',
      emoji: '💬',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined
    },
    {
      id: 'users',
      label: 'Contacts',
      emoji: '👤'
    },
    {
      id: 'groups',
      label: 'Groups',
      emoji: '👥'
    },
    {
      id: 'calls',
      label: 'Calls',
      emoji: '📞'
    },
    {
      id: 'settings',
      label: 'Settings',
      emoji: '⚙️'
    }
  ];

  return (
    <nav
      className={`fixed bottom-4 inset-x-0 z-40 w-auto max-w-[min(380px,94vw)] mx-auto px-2 transition-all duration-200 ease-out pointer-events-none pb-[env(safe-area-inset-bottom,0px)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex items-center justify-around py-2 px-3 rounded-full mirror-glass-nav border border-white/10 shadow-2xl backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-150 select-none ${
                isActive
                  ? 'text-rose-400 scale-105 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {/* Active Indicator Glow Background */}
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-rose-500/20 border border-rose-500/30 -z-10 shadow-[0_0_12px_rgba(244,63,94,0.35)]" />
              )}

              <div className="relative text-lg leading-none">
                <span>{item.emoji}</span>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-extrabold flex items-center justify-center ring-1 ring-[#0b0d13] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'text-rose-300' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

