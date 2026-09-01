import React from 'react';
import { FilterType } from '../types';

interface UserManagementBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: {
    all: number;
    unread: number;
    read: number;
    pinned: number;
  };
  isUserManagementOpen: boolean;
  onToggleUserManagement: () => void;
  onOpenStartNewChat: () => void;
}

export const UserManagementBar: React.FC<UserManagementBarProps> = ({
  activeFilter,
  onFilterChange,
  counts,
  isUserManagementOpen,
  onToggleUserManagement,
  onOpenStartNewChat
}) => {
  return (
    <div className="w-full px-2.5 pt-1.5 pb-1.5">
      <div className="max-w-[390px] mx-auto space-y-2">
        {/* Exact Hero Red Pill Button from Screenshot: Start New Chat + */}
        <button
          id="open-start-new-chat-top-btn"
          onClick={onOpenStartNewChat}
          className="w-full py-2 px-4 rounded-full hero-blue-pill text-white font-bold text-xs flex items-center justify-center gap-2 border border-indigo-400/40 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_0_22px_rgba(225,29,72,0.4)] select-none tracking-wide"
          title="Start new chat with registered contact"
        >
          <span>Start New Chat</span>
          <span className="w-4 h-4 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[10px] font-black leading-none ml-0.5">
            ➕
          </span>
        </button>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 select-none ${
              activeFilter === 'all'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>💬</span>
            <span>All ({counts.all})</span>
          </button>

          <button
            onClick={() => onFilterChange('unread')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 select-none ${
              activeFilter === 'unread'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>🔴</span>
            <span>Unread ({counts.unread})</span>
          </button>

          <button
            onClick={() => onFilterChange('groups')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 select-none ${
              activeFilter === 'groups'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>👥</span>
            <span>Groups</span>
          </button>

          <button
            onClick={() => onFilterChange('pinned')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap select-none ${
              activeFilter === 'pinned'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'text-indigo-500/70 hover:text-indigo-300 hover:bg-indigo-950/30'
            }`}
          >
            <span>📌</span>
            <span>Pinned ({counts.pinned})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

