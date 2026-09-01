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
      id: 'updates',
      label: 'Updates',
      emoji: '⏳'
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
      className={`fixed bottom-3 inset-x-0 z-40 w-auto max-w-[min(305px,90vw)] mx-auto px-1.5 transition-all duration-200 ease-out pointer-events-none pb-[env(safe-area-inset-bottom,0px)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex items-center justify-around py-1.5 px-2 rounded-full mirror-glass-nav border border-white/10 shadow-2xl backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-0.5 px-2 rounded-full transition-all duration-150 select-none ${
                isActive
                  ? 'text-indigo-400 scale-105 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {/* Active Indicator Glow Background */}
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 border border-indigo-500/30 -z-10 shadow-[0_0_10px_rgba(244,63,94,0.35)]" />
              )}

              <div className="relative text-sm leading-none">
                <span>{item.emoji}</span>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[12px] h-3 px-0.5 rounded-full bg-indigo-600 text-white text-[7px] font-extrabold flex items-center justify-center ring-1 ring-[#0b0d13] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[8.5px] tracking-tight mt-0.5 ${isActive ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

