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
  const lastScrollY = useRef(0);
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
      }, 120);
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
      className={`fixed bottom-3 inset-x-0 z-40 w-auto max-w-[min(280px,92vw)] mx-auto px-2 transition-all duration-100 ease-out pointer-events-none pb-[env(safe-area-inset-bottom,0px)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex items-center justify-around py-1 px-2 rounded-full mirror-glass-nav border border-white/15 shadow-2xl backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex items-center justify-center p-1.5 rounded-full transition-all duration-75 select-none ${
                isActive
                  ? 'text-red-400 scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:scale-105'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {/* Active Indicator Glow Background */}
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-red-500/20 border border-red-500/30 -z-10 animate-in zoom-in-95 duration-75 shadow-sm" />
              )}

              <div className="relative text-lg leading-none">
                <span>{item.emoji}</span>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-600 text-white text-[8px] font-extrabold flex items-center justify-center ring-1 ring-[#121418] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
