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
    <div className="w-full px-4 pt-3 pb-2">
      <div className="max-w-md mx-auto space-y-3">
        {/* User Management & Start New Chat Row */}
        <div className="flex items-center justify-between py-1 gap-2">
          <button
            id="open-start-new-chat-top-btn"
            onClick={onOpenStartNewChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all active:scale-95 shrink-0"
            title="Start new chat with registered phone number"
          >
            <span>💬➕</span>
            <span>Start New Chat</span>
          </button>

          <button
            onClick={onToggleUserManagement}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-semibold"
          >
            <span>👥</span>
            <span>{isUserManagementOpen ? 'Hide Contacts' : 'All Contacts'}</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'mirror-glass-input text-white border border-white/20 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>💬</span>
            <span>All {counts.all}</span>
          </button>

          <button
            onClick={() => onFilterChange('unread')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'unread'
                ? 'mirror-glass-input text-white border border-white/20 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>📬</span>
            <span>Unread {counts.unread}</span>
          </button>

          <button
            onClick={() => onFilterChange('read')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'read'
                ? 'mirror-glass-input text-white border border-white/20 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>📖</span>
            <span>Read {counts.read}</span>
          </button>

          <button
            onClick={() => onFilterChange('pinned')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'pinned'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30 shadow-md'
                : 'text-rose-500/70 hover:text-rose-300 hover:bg-rose-950/30'
            }`}
          >
            <span>📌</span>
            <span>Pinned {counts.pinned}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
