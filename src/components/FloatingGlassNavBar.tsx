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
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      
      // If user is scrolling down and past initial threshold, hide nav
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        // Scrolling up -> show immediately
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      // When user stops scrolling, automatically reveal navbar after 250ms
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
      className={`fixed bottom-4 inset-x-0 z-40 max-w-sm mx-auto px-4 transition-all duration-75 ease-out pointer-events-none ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex items-center justify-around py-2 px-3 rounded-full mirror-glass-nav border border-white/15 shadow-2xl backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3.5 rounded-full transition-all duration-75 select-none ${
                isActive
                  ? 'text-red-400 scale-105 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:scale-105 font-medium'
              }`}
            >
              {/* Active Indicator Glow Background */}
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-red-500/15 border border-red-500/30 -z-10 animate-in zoom-in-95 duration-75 shadow-sm" />
              )}

              <div className="relative text-lg leading-tight">
                <span>{item.emoji}</span>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-[#121418] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
