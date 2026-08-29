import React, { useState, useRef, useEffect } from 'react';
import { Chat, Message, User, WALLPAPER_OPTIONS } from '../types';
import { AudioVoicePlayer } from './AudioVoicePlayer';
import { playGlassChimeSound } from '../services/audioService';
import { saveChatDraft, clearChatDraft, getCachedChatDraft, MEDIA_EXPIRATION_MS, subscribeToUsers } from '../services/firestoreService';
import { GroupSettingsModal } from './GroupSettingsModal';
import { MediaGalleryModal } from './MediaGalleryModal';

interface ChatRoomProps {
  chat: Chat;
  currentUser: User;
  messages: Message[];
  onBack: () => void;
  onSendMessage: (content: string, type?: 'text' | 'image' | 'voice' | 'file', mediaUrl?: string, mediaMeta?: any) => void;
  onOpenLightbox: (imageUrl: string, caption?: string) => void;
  onOpenVoiceRecorder: () => void;
  onStartCall: (chat: Chat, isVideo: boolean) => void;
  onTyping?: (isTyping: boolean) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onOpenForward?: (message: Message) => void;
  onOpenProfile?: (user: User) => void;
  onTogglePin?: (message: Message) => void;
  isPeerTyping?: boolean;
  peerTypingName?: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  chat,
  currentUser,
  messages,
  onBack,
  onSendMessage,
  onOpenLightbox,
  onOpenVoiceRecorder,
  onStartCall,
  onTyping,
  onToggleReaction,
  onDeleteMessage,
  onOpenForward,
  onOpenProfile,
  onTogglePin,
  isPeerTyping = false,
  peerTypingName
}) => {
  // Draft Sync state
  const initialDraft = chat.draft || getCachedChatDraft(chat.id, currentUser.id) || '';
  const [inputText, setInputText] = useState(initialDraft);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);

  // Time state for updating 24h countdowns
  const [nowMs, setNowMs] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Re-sync draft when switching active chat
  useEffect(() => {
    const activeDraft = chat.draft || getCachedChatDraft(chat.id, currentUser.id) || '';
    setInputText(activeDraft);
    setReplyingTo(null);
  }, [chat.id]);

  // Periodic ticker for 24h disappearing media countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPeerTyping]);

  const handleInputChange = (val: string) => {
    setInputText(val);

    // Save draft in Firestore & local storage with debouncing
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      saveChatDraft(chat.id, currentUser.id, val);
    }, 600);

    // Notify typing status
    if (onTyping) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 2500);
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    if (onTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onTyping(false);
    }

    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    clearChatDraft(chat.id, currentUser.id);

    const replyPayload = replyingTo ? {
      id: replyingTo.id,
      content: replyingTo.content,
      senderName: replyingTo.senderName
    } : undefined;

    setInputText('');
    setReplyingTo(null);
    playGlassChimeSound('sent');
    
    onSendMessage(clean, 'text', undefined, undefined, replyPayload);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        playGlassChimeSound('sent');
        const replyPayload = replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.senderName
        } : undefined;
        setReplyingTo(null);
        onSendMessage('Photo Attachment', 'image', dataUrl, {
          fileName: file.name,
          fileSize: `${Math.round(file.size / 1024)} KB`
        }, replyPayload);
        setShowAttachmentMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendPresetImage = (url: string, title: string) => {
    playGlassChimeSound('sent');
    const replyPayload = replyingTo ? {
      id: replyingTo.id,
      content: replyingTo.content,
      senderName: replyingTo.senderName
    } : undefined;
    setReplyingTo(null);
    onSendMessage(title, 'image', url, {
      fileName: `${title.replace(/\s+/g, '_')}.png`,
      fileSize: '512 KB'
    }, replyPayload);
    setShowAttachmentMenu(false);
  };

  // Helper to format remaining time for 24h disappearing media
  const getDisappearingMediaTimeLeft = (msg: Message) => {
    const expires = msg.expiresAt || (msg.createdAt + MEDIA_EXPIRATION_MS);
    const diff = expires - nowMs;
    if (diff <= 0) return 'Expiring...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${Math.max(1, minutes)}m left`;
  };

  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const [allUsersState, setAllUsersState] = useState<User[]>([]);

  useEffect(() => {
    const unsub = subscribeToUsers((users) => {
      setAllUsersState(users);
    });
    return () => unsub();
  }, []);

  const handleHeaderProfileClick = () => {
    if (chat.isGroup) {
      setIsGroupSettingsOpen(true);
      return;
    }
    if (onOpenProfile) {
      const targetUser = chat.participant || {
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
      onOpenProfile(targetUser);
    }
  };

  const REACTION_EMOJIS = [
    '👍', '❤️', '🔥', '😂', '👏', '🎉', '🚀', '⭐', '🙏', '😢',
    '😮', '💯', '🎯', '👑', '💎', '💡', '👀', '☕', '🌟', '🍀'
  ];

  // Touch / swipe gesture handlers for reply by tap sliding
  const touchStartXRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent, msg: Message) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (diff > 70) {
      // Swiped right -> trigger reply
      setReplyingTo(msg);
    }
  };

  // Calculate peer or group name display
  const isGroupChat = chat.isGroup;
  const rawUsername = chat.username || chat.participant?.username || (chat.name.startsWith('@') ? chat.name.slice(1) : chat.name);
  const displayAccountName = isGroupChat ? chat.name : `@${rawUsername.replace(/^@/, '')}`;
  const displaySubtitle = isGroupChat 
    ? `${chat.groupMembers?.length || 2} members` 
    : (chat.lastSeen || 'Active now');
  const currentWallpaper = WALLPAPER_OPTIONS.find(w => w.id === currentUser.wallpaper) || WALLPAPER_OPTIONS[0];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${currentWallpaper.class} text-slate-100 antialiased overflow-hidden relative`}>
      {currentWallpaper.pattern && (
        <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center text-7xl font-black select-none overflow-hidden">
          <div className="whitespace-nowrap">{currentWallpaper.pattern} {currentWallpaper.pattern}</div>
        </div>
      )}
      {/* Top Glass Navigation Bar */}
      <header className="shrink-0 w-full px-3 py-2.5 mirror-glass border-b border-white/10 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            id="chat-back-btn"
            onClick={onBack}
            className="w-9 h-9 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center text-lg select-none shrink-0"
            title="Back to conversations"
          >
            <span>⬅️</span>
          </button>

          {/* Clickable Peer Profile Area in Header */}
          <div
            id="chat-header-user-profile-btn"
            onClick={handleHeaderProfileClick}
            className="flex items-center gap-2.5 min-w-0 select-none cursor-pointer p-1 -m-1 rounded-2xl hover:bg-white/5 transition-all group"
            title="View contact info & phone number"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1e2330] to-[#121620] border border-white/10 group-hover:border-red-500/50 flex items-center justify-center text-xl shadow-md transition-all">
                <span>{chat.avatar || '👤'}</span>
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121418] ${
                  chat.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-red-400 transition-colors truncate">
                  {displayAccountName}
                </h3>
                <span className="text-[10px] text-slate-400 opacity-60 group-hover:opacity-100">ℹ️</span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                {isPeerTyping ? (
                  <span className="text-red-400 font-semibold animate-pulse">
                    {peerTypingName ? `${peerTypingName} is typing...` : 'typing...'}
                  </span>
                ) : (
                  <span>{displaySubtitle}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {/* Media Gallery Button */}
          <button
            id="chat-media-btn"
            onClick={() => setIsMediaGalleryOpen(true)}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center justify-center text-base"
            title="Media Gallery"
          >
            <span>🖼️</span>
          </button>

          {/* View Profile Info Button */}
          <button
            id="chat-info-btn"
            onClick={handleHeaderProfileClick}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center justify-center text-base"
            title="Contact Info"
          >
            <span>ℹ️</span>
          </button>

          {/* Voice Call */}
          <button
            id="start-voice-call-btn"
            onClick={() => onStartCall(chat, false)}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-white transition-colors flex items-center justify-center text-base"
            title="Start Voice Call"
          >
            <span>📞</span>
          </button>

          {/* Video Call */}
          <button
            id="start-video-call-btn"
            onClick={() => onStartCall(chat, true)}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-white transition-colors flex items-center justify-center text-base"
            title="Start Video Call"
          >
            <span>📹</span>
          </button>
        </div>
      </header>

      {/* Pinned Messages Banner */}
      {chat.pinnedMessages && chat.pinnedMessages.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-amber-400 text-sm shrink-0">📌</span>
            <div className="truncate text-xs">
              <span className="font-bold text-amber-300 mr-1.5">
                {chat.pinnedMessages[chat.pinnedMessages.length - 1].senderName}:
              </span>
              <span className="text-slate-200 truncate">
                {chat.pinnedMessages[chat.pinnedMessages.length - 1].content}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {chat.pinnedMessages.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                +{chat.pinnedMessages.length - 1} more
              </span>
            )}
            <button
              onClick={() => {
                const latest = chat.pinnedMessages![chat.pinnedMessages!.length - 1];
                const el = document.getElementById(`message-${latest.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-all"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-2xl shadow-inner">
              👋
            </div>
            <p className="text-sm font-semibold text-slate-200">Say hello to {displayAccountName}!</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Start this conversation by sending a text message, sharing a 24h photo, or leaving a disappearing voice memo.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.senderId === currentUser.id;
            const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
            const isMedia = msg.type === 'image' || msg.type === 'voice';

            return (
              <div
                key={msg.id}
                id={`message-${msg.id}`}
                onTouchStart={(e) => handleTouchStart(e, msg)}
                onTouchEnd={(e) => handleTouchEnd(e, msg)}
                className={`flex flex-col ${isUser ? 'items-end animate-in slide-in-from-right-4 fade-in' : 'items-start animate-in slide-in-from-left-4 fade-in'} group relative transition-all duration-75`}
              >
                {/* Message Bubble Container */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-md transition-all ${
                    isUser
                      ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-br-none shadow-red-950/40'
                      : 'mirror-glass-card text-slate-100 rounded-bl-none border border-white/10'
                  }`}
                >
                  {/* Forwarded Header Banner */}
                  {msg.isForwarded && (
                    <div className="flex items-center gap-1 text-[10px] text-red-300 font-semibold mb-1 opacity-90">
                      <span>↗️</span>
                      <span>Forwarded {msg.forwardedFrom ? `from ${msg.forwardedFrom}` : ''}</span>
                    </div>
                  )}

                  {/* 24h Disappearing Media Badge */}
                  {isMedia && (
                    <div className="flex items-center justify-between gap-1.5 px-2 py-0.5 mb-2 rounded-md bg-black/40 border border-white/10 text-[10px] text-amber-300 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="animate-spin text-[9px]">⏳</span>
                        <span>24h Disappearing Media</span>
                      </span>
                      <span className="font-bold text-amber-200">{getDisappearingMediaTimeLeft(msg)}</span>
                    </div>
                  )}

                  {/* Reply preview if present */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${
                        isUser
                          ? 'bg-black/20 border-white/60 text-white/90'
                          : 'bg-white/5 border-red-500 text-slate-300'
                      }`}
                    >
                      <span className="font-bold block text-[10px] text-red-300">
                        {msg.replyTo.senderName}
                      </span>
                      <span className="truncate block opacity-90">{msg.replyTo.content}</span>
                    </div>
                  )}

                  {/* Content Rendering based on Type */}
                  {msg.type === 'text' && (
                    <p className="text-[13.5px] leading-relaxed break-words whitespace-pre-wrap font-normal">
                      {msg.content}
                    </p>
                  )}

                  {msg.type === 'image' && (
                    <div className="space-y-1.5">
                      {msg.mediaUrl && (
                        <div
                          onClick={() => onOpenLightbox(msg.mediaUrl!, msg.content)}
                          className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-white/10 max-h-60"
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="24h Disappearing Photo"
                            referrerPolicy="no-referrer"
                            className="w-full h-auto object-cover group-hover/img:scale-105 transition-transform duration-75"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] backdrop-blur-sm font-semibold flex items-center gap-1">
                              <span>🔍</span>
                              <span>View Full Size</span>
                            </span>
                          </div>
                        </div>
                      )}
                      {msg.content && msg.content !== 'Photo Attachment' && (
                        <p className="text-xs pt-1">{msg.content}</p>
                      )}
                    </div>
                  )}

                  {msg.type === 'voice' && (
                    <AudioVoicePlayer
                      audioUrl={msg.mediaUrl}
                      duration={msg.mediaMeta?.duration || 14}
                      waveData={msg.mediaMeta?.waveData}
                      isUserMessage={isUser}
                    />
                  )}

                  {/* Reactions Badge row */}
                  {hasReactions && (
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {Object.entries(msg.reactions || {}).map(([emoji, users]) => {
                        const userList = (Array.isArray(users) ? users : []) as string[];
                        const userReacted = userList.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => onToggleReaction && onToggleReaction(msg.id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                              userReacted
                                ? 'bg-red-500/30 border-red-400 text-white shadow-sm'
                                : 'bg-black/40 border-white/15 text-slate-300 hover:bg-black/60'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{userList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bubble Footer (Time, Disappearing icon, & Read Receipts) */}
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] select-none ${
                      isUser ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {isMedia && (
                      <span title="Disappears in 24 hours" className="text-[10px]">
                        ⏳
                      </span>
                    )}
                    <span>{msg.timestamp}</span>

                    {/* Read Receipts with visual distinction */}
                    {isUser && (
                      <span
                        title={msg.status === 'read' ? 'Read by recipient' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}
                        className={`text-[11px] font-bold flex items-center ${
                          msg.status === 'read'
                            ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(103,232,249,0.7)]'
                            : 'opacity-75'
                        }`}
                      >
                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions (Reactions, Forward, Reply, Delete) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 mt-1 px-1 z-10">
                  {/* Reaction trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                      title="Add Reaction"
                    >
                      <span>😊</span>
                    </button>

                    {activeReactionMessageId === msg.id && (
                      <div className="absolute bottom-full mb-2 left-0 z-40 grid grid-cols-5 gap-1.5 p-2.5 rounded-2xl mirror-glass-input border border-white/20 shadow-2xl animate-in zoom-in-95 duration-75 max-w-[240px]">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              if (onToggleReaction) onToggleReaction(msg.id, emoji);
                              setActiveReactionMessageId(null);
                            }}
                            className="w-9 h-9 rounded-xl hover:bg-white/10 hover:scale-125 transition-all flex items-center justify-center text-lg active:scale-95"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Forward Message Button */}
                  {onOpenForward && (
                    <button
                      onClick={() => onOpenForward(msg)}
                      className="p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                      title="Forward to another chat"
                    >
                      <span>↗️</span>
                      <span>Forward</span>
                    </button>
                  )}

                  {/* Reply Button */}
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                    title="Reply"
                  >
                    <span>↩️</span>
                    <span>Reply</span>
                  </button>

                  {/* Pin / Unpin Button */}
                  {onTogglePin && (
                    <button
                      onClick={() => onTogglePin(msg)}
                      className={`p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 ${
                        (chat.pinnedMessages || []).some(p => p.id === msg.id) ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                      title={(chat.pinnedMessages || []).some(p => p.id === msg.id) ? 'Unpin Message' : 'Pin Message'}
                    >
                      <span>📌</span>
                      <span>{(chat.pinnedMessages || []).some(p => p.id === msg.id) ? 'Pinned' : 'Pin'}</span>
                    </button>
                  )}

                  {/* Delete Button */}
                  {isUser && onDeleteMessage && (
                    <button
                      onClick={() => setMessageToDelete(msg.id)}
                      className="p-1 px-1.5 rounded bg-white/5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-[11px]"
                      title="Delete message"
                    >
                      <span>🗑️</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Peer Typing Indicator */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 p-3 rounded-2xl mirror-glass max-w-[150px] text-slate-300 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] text-red-400 font-semibold ml-1">typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Context Bar */}
      {replyingTo && (
        <div className="px-4 py-2 mirror-glass-input border-t border-white/10 flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-75">
          <div className="flex items-center gap-2 text-slate-300 truncate">
            <span>↩️</span>
            <span className="font-semibold text-red-400">Replying to {replyingTo.senderName}:</span>
            <span className="truncate text-slate-400">{replyingTo.content}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            ❌
          </button>
        </div>
      )}

      {/* Attachment Popover */}
      {showAttachmentMenu && (
        <div className="p-3 mirror-glass-input backdrop-blur-2xl border-t border-white/10 flex flex-wrap items-center justify-around gap-2 z-30 animate-in slide-in-from-bottom duration-75">
          {/* Real Photo Upload from device / camera */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-xl text-white shadow-md">
              📷
            </div>
            <span className="text-[11px] font-semibold">24h Photo</span>
          </button>

          {/* Voice Memo recording panel */}
          <button
            onClick={() => {
              setShowAttachmentMenu(false);
              onOpenVoiceRecorder();
            }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-xl text-white shadow-md shadow-red-600/30">
              🎤
            </div>
            <span className="text-[11px] font-semibold">24h Voice Note</span>
          </button>

          {/* Preset Sample Images */}
          <button
            onClick={() => handleSendPresetImage(
              'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=800&q=80',
              'Tokyo Neon Nights'
            )}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xl text-white shadow-md">
              🌆
            </div>
            <span className="text-[11px] font-semibold">City View</span>
          </button>

          <button
            onClick={() => handleSendPresetImage(
              'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
              'Sunset Coastline'
            )}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-xl text-white shadow-md">
              🏖️
            </div>
            <span className="text-[11px] font-semibold">Beach Photo</span>
          </button>
        </div>
      )}

      {/* Hidden File Input for Native Photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Floating Bottom Input Bar */}
      <footer className="shrink-0 w-full p-3 mirror-glass-input backdrop-blur-2xl border-t border-white/10 z-20">
        <form onSubmit={handleSendText} className="flex items-center gap-2 max-w-xl mx-auto">
          {/* Attachment Toggle Button */}
          <button
            type="button"
            id="chat-attach-btn"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className={`w-11 h-11 rounded-full transition-all shrink-0 flex items-center justify-center text-lg ${
              showAttachmentMenu
                ? 'bg-red-600 text-white'
                : 'mirror-glass-input text-slate-300 hover:text-white hover:mirror-glass-input border border-white/10'
            }`}
            title="Attach 24h Media"
          >
            <span>{showAttachmentMenu ? '❌' : '📎'}</span>
          </button>

          {/* Text Input */}
          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-11 px-4 rounded-full mirror-glass-input border border-white/10 text-slate-100 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
          />

          {/* Voice Record Button or Send Button */}
          {inputText.trim() ? (
            <button
              type="submit"
              id="chat-send-btn"
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center text-lg shadow-lg shadow-red-600/30 transition-all active:scale-95 shrink-0"
              title="Send Message"
            >
              <span>🚀</span>
            </button>
          ) : (
            <button
              type="button"
              id="chat-mic-btn"
              onClick={onOpenVoiceRecorder}
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center text-lg shadow-lg shadow-red-600/30 transition-all active:scale-95 shrink-0"
              title="Record 24h Voice Memo"
            >
              <span>🎤</span>
            </button>
          )}
        </form>
      </footer>

      {/* Group Settings & Participants Modal */}
      {isGroupSettingsOpen && (
        <GroupSettingsModal
          isOpen={isGroupSettingsOpen}
          onClose={() => setIsGroupSettingsOpen(false)}
          chat={chat}
          currentUser={currentUser}
          allUsers={allUsersState}
          onChatUpdated={() => {}}
          onGroupExitedOrDeleted={onBack}
        />
      )}

      {/* Media Gallery Modal */}
      {isMediaGalleryOpen && (
        <MediaGalleryModal
          isOpen={isMediaGalleryOpen}
          onClose={() => setIsMediaGalleryOpen(false)}
          messages={messages}
          onOpenLightbox={onOpenLightbox}
        />
      )}

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 mirror-glass backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-rose-500/30 shadow-2xl space-y-5 animate-in zoom-in-95 duration-75">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mb-2">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-white">Delete Message?</h3>
              <p className="text-sm text-slate-300">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setMessageToDelete(null)}
                className="py-2.5 rounded-xl mirror-glass border border-white/10 text-slate-300 hover:text-white font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDeleteMessage) {
                    onDeleteMessage(messageToDelete);
                  }
                  setMessageToDelete(null);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-600/30 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
