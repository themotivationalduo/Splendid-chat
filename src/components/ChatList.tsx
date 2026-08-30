import React, { useState } from 'react';
import { Chat, User, UserStatus } from '../types';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onTogglePin: (chatId: string) => void;
  onOpenNewChat: () => void;
  onOpenUserProfile?: (user: User) => void;
  onOpenGroupProfile?: (chat: Chat) => void;
  activeStatuses?: UserStatus[];
  onOpenStatusViewer?: (userId: string, statuses: UserStatus[]) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onDeleteChat,
  onTogglePin,
  onOpenNewChat,
  onOpenUserProfile,
  onOpenGroupProfile,
  activeStatuses = [],
  onOpenStatusViewer
}) => {
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  const getChatDisplayName = (chat: Chat) => {
    if (chat.isGroup) return chat.name;
    const rawUsername = chat.username || chat.participant?.username || (chat.name.startsWith('@') ? chat.name.slice(1) : chat.name);
    return `@${rawUsername.replace(/^@/, '')}`;
  };

  const handleAvatarClick = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    if (chat.isGroup) {
      if (onOpenGroupProfile) onOpenGroupProfile(chat);
      return;
    }
    if (onOpenUserProfile) {
      const targetUser: User = chat.participant || {
        id: chat.id,
        fullName: chat.name,
        username: chat.username || chat.name.toLowerCase().replace(/[@\s]/g, ''),
        phoneNumber: chat.phoneNumber || '',
        avatar: chat.avatar || '👤',
        avatarType: 'emoji',
        status: chat.status || 'online',
        lastSeen: chat.lastSeen || 'Active now',
        createdAt: chat.createdAt || Date.now()
      };
      onOpenUserProfile(targetUser);
    } else {
      onSelectChat(chat);
    }
  };

  if (chats.length === 0) {
    return (
      <div className="w-full px-4 py-16 text-center max-w-md mx-auto animate-in fade-in duration-75">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3 text-3xl shadow-lg shadow-red-500/10">
          💬
        </div>
        <h3 className="text-base font-bold text-slate-100">No conversations yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
          Your inbox is clean and empty. Search contacts or start a new conversation using their @username or phone number!
        </p>
        <button
          id="empty-state-start-chat-btn"
          onClick={onOpenNewChat}
          className="mt-5 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center gap-2 mx-auto"
        >
          <span>💬➕</span>
          <span>Find Contact & Chat</span>
        </button>
      </div>
    );
  }

  return (
    <div 
      className="w-full px-4 divide-y divide-white/5 max-w-md mx-auto pb-28 animate-in fade-in duration-75 will-change-transform"
      style={{ willChange: 'transform' }}
    >
      {chats.map((chat) => {
        const isSelected = selectedChatId === chat.id;
        const isMenuOpen = activeMenuChatId === chat.id;
        const displayName = getChatDisplayName(chat);

        return (
          <div
            key={chat.id}
            id={`chat-item-${chat.id}`}
            onClick={() => onSelectChat(chat)}
            className={`group relative flex items-center gap-3.5 py-3 px-2 rounded-2xl transition-all cursor-pointer select-none ${
              isSelected
                ? 'mirror-glass-input border border-white/10 shadow-lg'
                : 'hover:bg-white/[0.04] active:bg-white/[0.07]'
            }`}
          >
            {/* Clickable Avatar with Online indicator to inspect profile */}
            {(() => {
              const participantId = chat.participant?.id || chat.id;
              const participantStatuses = activeStatuses.filter(s => s.userId === participantId);
              const hasStatus = !chat.isGroup && participantStatuses.length > 0;

              return (
                <div 
                  className="relative shrink-0 cursor-pointer group/avatar"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasStatus && onOpenStatusViewer) {
                      onOpenStatusViewer(participantId, participantStatuses);
                    } else {
                      handleAvatarClick(e, chat);
                    }
                  }}
                  title={hasStatus ? "Click to view Status update" : "Click to view user profile & phone number"}
                >
                  <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e2330] to-[#121620] border flex items-center justify-center text-xl shadow-md transition-all ${
                    hasStatus 
                      ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#121418] border-red-500/30' 
                      : 'border-white/10 group-hover/avatar:border-red-500/50'
                  }`}>
                    <span>{chat.avatar || '👤'}</span>
                  </div>
                  {!chat.isGroup && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#121418] ${
                        chat.status === 'online'
                          ? 'bg-emerald-500'
                          : chat.status === 'away'
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                  )}
                </div>
              );
            })()}

            {/* Chat Details */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h4 className="text-[15px] font-bold text-slate-100 truncate tracking-tight group-hover:text-red-400 transition-colors">
                    {displayName}
                  </h4>
                  {chat.isPinned && (
                    <span title="Pinned Chat" className="text-xs shrink-0">
                      📌
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-400 shrink-0">
                  {chat.lastMessage?.timestamp || 'New'}
                </span>
              </div>

              {/* Message Preview or Draft Preview */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[13px] truncate">
                  {chat.draft ? (
                    <div className="flex items-center gap-1 text-rose-400 font-medium truncate">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        Draft
                      </span>
                      <span className="truncate text-slate-300">{chat.draft}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-400 truncate">
                      {chat.lastMessage?.type === 'voice' && (
                        <span className="text-xs shrink-0">🎤</span>
                      )}
                      {chat.lastMessage?.type === 'image' && (
                        <span className="text-xs shrink-0">📷</span>
                      )}
                      <span className="truncate">
                        {chat.lastMessage?.text || 'Tap to send a message...'}
                      </span>
                    </div>
                  )}
                </div>

                {chat.unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow shrink-0 animate-pulse">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>

            {/* 3-Dots / Options Action Button */}
            <div className="relative shrink-0">
              <button
                id={`chat-options-btn-${chat.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuChatId(isMenuOpen ? null : chat.id);
                }}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-center text-sm"
                title="Options"
              >
                <span>⚙️</span>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuChatId(null);
                    }}
                  />
                  <div
                    className="absolute right-0 top-8 z-50 w-44 p-1.5 rounded-2xl mirror-glass-card shadow-2xl border border-white/10 text-xs font-medium space-y-1 animate-in fade-in zoom-in-95 duration-75"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        if (chat.isGroup) {
                          if (onOpenGroupProfile) onOpenGroupProfile(chat);
                        } else if (onOpenUserProfile) {
                          onOpenUserProfile(chat.participant);
                        }
                        setActiveMenuChatId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/10 transition-colors text-left"
                    >
                      <span>ℹ️</span>
                      <span>{chat.isGroup ? 'View Group Info' : 'View Profile Info'}</span>
                    </button>

                    <button
                      onClick={() => {
                        onTogglePin(chat.id);
                        setActiveMenuChatId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/10 transition-colors text-left"
                    >
                      <span>📌</span>
                      <span>{chat.isPinned ? 'Unpin chat' : 'Pin to top'}</span>
                    </button>

                    <button
                      onClick={() => {
                        onDeleteChat(chat.id);
                        setActiveMenuChatId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <span>🗑️</span>
                      <span>Delete chat</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
