import React, { useState } from 'react';
import { Chat, Message, User } from '../types';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  chats: Chat[];
  users: User[];
  currentUser: User;
  onForward: (targetChatIds: string[]) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  chats,
  users,
  currentUser,
  onForward
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);

  if (!isOpen || !message) return null;

  // Build combined destination list from chats and users
  const destinations = chats.map(chat => ({
    id: chat.id,
    name: chat.name,
    avatar: chat.avatar,
    subtitle: chat.phoneNumber || (chat.isGroup ? 'Group Chat' : 'Direct Message'),
    isChat: true
  }));

  const filteredDestinations = destinations.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedChatIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmForward = () => {
    if (selectedChatIds.length === 0) return;
    onForward(selectedChatIds);
    setSelectedChatIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-xl animate-in fade-in duration-75">
      <div className="w-full max-w-md p-5 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 max-h-[85vh] flex flex-col relative text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">↗️</span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Forward Message</h3>
              <p className="text-[11px] text-slate-400">Share with contacts or active chats</p>
            </div>
          </div>
          <button
            id="close-forward-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-red-400 font-semibold">
            <span>Original message by {message.senderName}</span>
            <span className="text-[10px] text-slate-400">{message.timestamp}</span>
          </div>
          <div className="text-xs text-slate-200 line-clamp-2">
            {message.type === 'text' && (message.content || 'Text message')}
            {message.type === 'image' && (
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span>📷</span>
                <span>Photo {message.content ? `• ${message.content}` : ''}</span>
              </span>
            )}
            {message.type === 'voice' && (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span>🎤</span>
                <span>Voice Note ({message.mediaMeta?.duration || '0:05'}s)</span>
              </span>
            )}
            {message.type === 'file' && (
              <span className="flex items-center gap-1.5 text-amber-300">
                <span>📎</span>
                <span>File {message.mediaMeta?.fileName || ''}</span>
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500/50"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>

        {/* Destination List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 min-h-[160px]">
          {filteredDestinations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching conversations found
            </div>
          ) : (
            filteredDestinations.map(dest => {
              const isSelected = selectedChatIds.includes(dest.id);
              return (
                <div
                  key={dest.id}
                  id={`forward-dest-${dest.id}`}
                  onClick={() => toggleSelect(dest.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-red-500/20 border-red-500/50 text-white shadow-sm'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-lg shrink-0">
                      {dest.avatar}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{dest.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{dest.subtitle}</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-red-600 border-red-500 text-white text-xs'
                      : 'border-white/20 bg-black/20'
                  }`}>
                    {isSelected && '✓'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            {selectedChatIds.length} recipient{selectedChatIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            id="submit-forward-btn"
            disabled={selectedChatIds.length === 0}
            onClick={handleConfirmForward}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Forward</span>
            <span>↗️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
