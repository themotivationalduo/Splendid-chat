import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { Chat, User, UserStatus } from '../types';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  currentUserId?: string;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onTogglePin: (chatId: string) => void;
  onMovePinUp?: (chatId: string) => void;
  onMovePinDown?: (chatId: string) => void;
  onOpenNewChat: () => void;
  onOpenUserProfile?: (user: User) => void;
  onOpenGroupProfile?: (chat: Chat) => void;
  activeStatuses?: UserStatus[];
  onOpenStatusViewer?: (userId: string, statuses: UserStatus[]) => void;
}

interface SwipeableChatItemProps {
  chat: Chat;
  isSelected: boolean;
  displayName: string;
  currentUserId?: string;
  hasStatus: boolean;
  participantId: string;
  participantStatuses: UserStatus[];
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onTogglePin: (chatId: string) => void;
  onMovePinUp?: (chatId: string) => void;
  onMovePinDown?: (chatId: string) => void;
  onOpenUserProfile?: (user: User) => void;
  onOpenGroupProfile?: (chat: Chat) => void;
  onOpenStatusViewer?: (userId: string, statuses: UserStatus[]) => void;
  handleAvatarClick: (e: React.MouseEvent, chat: Chat) => void;
}

const SwipeableChatItem: React.FC<SwipeableChatItemProps> = ({
  chat,
  isSelected,
  displayName,
  currentUserId,
  hasStatus,
  participantId,
  participantStatuses,
  onSelectChat,
  onDeleteChat,
  onTogglePin,
  onMovePinUp,
  onMovePinDown,
  onOpenUserProfile,
  onOpenGroupProfile,
  onOpenStatusViewer,
  handleAvatarClick
}) => {
  const [activeMenu, setActiveMenu] = useState(false);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);

  const x = useMotionValue(0);

  // Left underlay: Revealed on Slide-Right (DELETE)
  const deleteOpacity = useTransform(x, [10, 45, 85], [0, 0.6, 1]);
  const deleteScale = useTransform(x, [10, 50, 90], [0.8, 0.95, 1.1]);
  const deleteBgOpacity = useTransform(x, [0, 30, 80], [0, 0.4, 0.9]);

  // Right underlay: Revealed on Slide-Left (PIN / UNPIN)
  const pinOpacity = useTransform(x, [-10, -45, -85], [0, 0.6, 1]);
  const pinScale = useTransform(x, [-10, -50, -90], [0.8, 0.95, 1.1]);
  const pinBgOpacity = useTransform(x, [0, -30, -80], [0, 0.4, 0.9]);

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    // Slide Right -> Delete
    if (offsetX > 65 || velocityX > 250) {
      if (navigator.vibrate) navigator.vibrate(40);
      onDeleteChat(chat.id);
    }
    // Slide Left -> Pin / Unpin
    else if (offsetX < -65 || velocityX < -250) {
      if (navigator.vibrate) navigator.vibrate(40);
      onTogglePin(chat.id);
    }
  };

  const handleCardClick = () => {
    if (isDraggingRef.current || Math.abs(dragDistanceRef.current) > 6) {
      return;
    }
    onSelectChat(chat);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[18px] select-none touch-pan-y">
      {/* ─── LEFT UNDERLAY: SLIDE RIGHT TO DELETE ─── */}
      <motion.div
        style={{ opacity: deleteBgOpacity }}
        onClick={(e) => {
          e.stopPropagation();
          if (navigator.vibrate) navigator.vibrate(40);
          onDeleteChat(chat.id);
        }}
        className="absolute inset-0 z-0 flex items-center justify-start pl-4 rounded-[18px] bg-gradient-to-r from-rose-600/35 via-rose-500/20 to-transparent border border-rose-500/30 text-rose-300 cursor-pointer backdrop-blur-md"
      >
        <motion.div
          style={{ opacity: deleteOpacity, scale: deleteScale }}
          className="flex items-center gap-2 font-bold text-xs text-rose-200"
        >
          <span className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-sm shadow-md shadow-rose-500/20">
            🗑️
          </span>
          <span className="tracking-wide">Delete</span>
        </motion.div>
      </motion.div>

      {/* ─── RIGHT UNDERLAY: SLIDE LEFT TO PIN / UNPIN ─── */}
      <motion.div
        style={{ opacity: pinBgOpacity }}
        onClick={(e) => {
          e.stopPropagation();
          if (navigator.vibrate) navigator.vibrate(40);
          onTogglePin(chat.id);
        }}
        className={`absolute inset-0 z-0 flex items-center justify-end pr-4 rounded-[18px] cursor-pointer backdrop-blur-md border ${
          chat.isPinned
            ? 'bg-gradient-to-l from-amber-600/35 via-amber-500/20 to-transparent border-amber-500/30 text-amber-300'
            : 'bg-gradient-to-l from-indigo-600/35 via-indigo-500/20 to-transparent border-indigo-500/30 text-indigo-300'
        }`}
      >
        <motion.div
          style={{ opacity: pinOpacity, scale: pinScale }}
          className="flex items-center gap-2 font-bold text-xs text-slate-100"
        >
          <span className="tracking-wide">{chat.isPinned ? 'Unpin' : 'Pin to Top'}</span>
          <span
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm shadow-md ${
              chat.isPinned
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-amber-500/20'
                : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-indigo-500/20'
            }`}
          >
            📌
          </span>
        </motion.div>
      </motion.div>

      {/* ─── FOREGROUND CHAT CARD (DRAGGABLE) ─── */}
      <motion.div
        id={`chat-card-${chat.id}`}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -110, right: 110 }}
        dragElastic={0.22}
        style={{ x }}
        onDragStart={() => {
          isDraggingRef.current = true;
          dragDistanceRef.current = 0;
        }}
        onDrag={(_, info) => {
          dragDistanceRef.current = info.offset.x;
        }}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        whileTap={{ cursor: 'grabbing' }}
        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
        className={`group relative z-10 flex items-center gap-2.5 p-2.5 rounded-[18px] bg-[#12141d]/95 backdrop-blur-md border transition-colors duration-150 cursor-pointer select-none shadow-xl ${
          isSelected
            ? 'border-indigo-500/50 bg-[#161a26]/95 shadow-[0_0_18px_rgba(244,63,94,0.25)]'
            : 'border-white/10 hover:border-indigo-500/30 hover:bg-[#141722]/95 active:scale-[0.99]'
        }`}
      >
        {/* Top Glow Pill Accent */}
        <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-16 h-[2px] rounded-full bg-indigo-500 card-top-pill pointer-events-none" />

        {/* Avatar with Status Story or Profile Click */}
        <div
          className="relative shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (hasStatus && onOpenStatusViewer) {
              onOpenStatusViewer(participantId, participantStatuses);
            } else {
              handleAvatarClick(e, chat);
            }
          }}
          title={hasStatus ? 'Click to view Status story' : 'Click to view user profile'}
        >
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#23293a] to-[#121520] ring-2 ring-blue-500 avatar-blue-glow flex items-center justify-center text-base transition-all">
            <span>{chat.avatar || '👤'}</span>
          </div>

          {/* Online Indicator Green Dot or Group Indicator */}
          {chat.isGroup ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-900 border border-blue-400/50 flex items-center justify-center text-[8px]">
              👥
            </span>
          ) : (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0f15] shadow-sm ${
                chat.status === 'online'
                  ? 'bg-[#10b981]'
                  : chat.status === 'away'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
          )}
        </div>

        {/* Chat Info */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="text-[13px] font-bold text-white truncate tracking-tight group-hover:text-blue-300 transition-colors">
                {displayName}
              </h4>
              {chat.isPinned && (
                <span title="Pinned Chat" className="text-[11px] shrink-0">
                  📌
                </span>
              )}
            </div>

            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              {chat.lastMessage?.timestamp || 'Just now'}
            </span>
          </div>

          {/* Latest message preview + Unread indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] truncate">
              {chat.draft ? (
                <div className="flex items-center gap-1 text-blue-400 font-medium truncate">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    Draft
                  </span>
                  <span className="truncate text-slate-300">{chat.draft}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-300 truncate">
                  {chat.lastMessage?.type === 'voice' && (
                    <span className="text-[11px] shrink-0">🎙️</span>
                  )}
                  {chat.lastMessage?.type === 'image' && (
                    <span className="text-[11px] shrink-0">📷</span>
                  )}
                  <span className="truncate">
                    {chat.lastMessage?.text || 'Tap to send a message...'}
                  </span>
                </div>
              )}
            </div>

            {(() => {
              const hasUnread =
                (chat.unreadCount && chat.unreadCount > 0) ||
                (chat.lastMessage && !chat.lastMessage.isRead && chat.lastMessage.senderId !== currentUserId);
              const badgeNumber = chat.unreadCount || (hasUnread ? 1 : 0);

              if (!hasUnread) return null;

              return (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 unread-blue-dot flex items-center justify-center text-[10px] font-bold text-white">
                    {badgeNumber}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Quick 3-Dots / Options Action Button */}
        <div className="relative shrink-0">
          <button
            id={`chat-options-btn-${chat.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(!activeMenu);
            }}
            className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-center text-[11px]"
            title="Options"
          >
            <span>⚙️</span>
          </button>

          {/* Dropdown Menu */}
          {activeMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(false);
                }}
              />
              <div
                className="absolute right-0 top-8 z-50 w-44 p-1.5 rounded-2xl mirror-glass-card shadow-2xl border border-white/15 text-xs font-medium space-y-1 animate-in fade-in zoom-in-95 duration-75"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    if (chat.isGroup) {
                      if (onOpenGroupProfile) onOpenGroupProfile(chat);
                    } else if (onOpenUserProfile) {
                      onOpenUserProfile(chat.participant);
                    }
                    setActiveMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/10 transition-colors text-left"
                >
                  <span>👤</span>
                  <span>{chat.isGroup ? 'View Group Info' : 'View Profile Info'}</span>
                </button>

                <button
                  onClick={() => {
                    onTogglePin(chat.id);
                    setActiveMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/10 transition-colors text-left"
                >
                  <span>📌</span>
                  <span>{chat.isPinned ? 'Unpin chat' : 'Pin to top'}</span>
                </button>

                {chat.isPinned && (
                  <>
                    <button
                      onClick={() => {
                        if (onMovePinUp) onMovePinUp(chat.id);
                        setActiveMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/10 transition-colors text-left"
                    >
                      <span>⬆️</span>
                      <span>Move Pin Up</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onMovePinDown) onMovePinDown(chat.id);
                        setActiveMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/10 transition-colors text-left"
                    >
                      <span>⬇️</span>
                      <span>Move Pin Down</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    onDeleteChat(chat.id);
                    setActiveMenu(false);
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
      </motion.div>
    </div>
  );
};

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  currentUserId,
  onSelectChat,
  onDeleteChat,
  onTogglePin,
  onMovePinUp,
  onMovePinDown,
  onOpenNewChat,
  onOpenUserProfile,
  onOpenGroupProfile,
  activeStatuses = [],
  onOpenStatusViewer
}) => {
  const getChatDisplayName = (chat: Chat) => {
    if (chat.isGroup) return chat.name;
    const rawUsername = chat.username || chat.participant?.username || (chat.name.startsWith('@') ? chat.name.slice(1) : chat.name);
    return chat.participant?.fullName || `@${rawUsername.replace(/^@/, '')}`;
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
        status: chat.status || 'offline',
        lastSeen: chat.lastSeen || 'Offline',
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
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-3xl shadow-lg shadow-indigo-500/20">
          💬
        </div>
        <h3 className="text-base font-bold text-slate-100">No conversations yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
          Your inbox is clean and empty. Search contacts or start a new conversation using their @username or phone number!
        </p>
        <button
          id="empty-state-start-chat-btn"
          onClick={onOpenNewChat}
          className="mt-5 px-6 py-2.5 rounded-full hero-blue-pill text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2 mx-auto"
        >
          <span>💬➕</span>
          <span>Start New Chat</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full px-2.5 max-w-[390px] mx-auto space-y-2 pb-24 animate-in fade-in duration-75 will-change-transform"
      style={{ willChange: 'transform' }}
    >
      {/* Visual Gesture Tip Bar */}
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-slate-500 select-none">
        <span className="flex items-center gap-1 text-rose-400/80">
          <span>👉</span>
          <span>Slide right to Delete</span>
        </span>
        <span className="flex items-center gap-1 text-indigo-400/80">
          <span>Slide left to Pin</span>
          <span>👈</span>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {chats.map((chat) => {
          const isSelected = selectedChatId === chat.id;
          const displayName = getChatDisplayName(chat);

          const participantId = chat.participant?.id || chat.id;
          const participantStatuses = activeStatuses.filter((s) => s.userId === participantId);
          const hasStatus = !chat.isGroup && participantStatuses.length > 0;

          return (
            <SwipeableChatItem
              key={chat.id}
              chat={chat}
              isSelected={isSelected}
              displayName={displayName}
              currentUserId={currentUserId}
              hasStatus={hasStatus}
              participantId={participantId}
              participantStatuses={participantStatuses}
              onSelectChat={onSelectChat}
              onDeleteChat={onDeleteChat}
              onTogglePin={onTogglePin}
              onMovePinUp={onMovePinUp}
              onMovePinDown={onMovePinDown}
              onOpenUserProfile={onOpenUserProfile}
              onOpenGroupProfile={onOpenGroupProfile}
              onOpenStatusViewer={onOpenStatusViewer}
              handleAvatarClick={handleAvatarClick}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};
