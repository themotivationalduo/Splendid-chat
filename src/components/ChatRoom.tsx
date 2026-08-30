import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { Chat, Message, User, WALLPAPER_OPTIONS } from '../types';
import { AudioVoicePlayer } from './AudioVoicePlayer';
import { playGlassChimeSound } from '../services/audioService';
import { 
  saveChatDraft, 
  clearChatDraft, 
  getCachedChatDraft, 
  MEDIA_EXPIRATION_MS, 
  subscribeToUsers, 
  updateFirestoreMessage,
  clearChatMessages,
  toggleChatDisappearingMode,
  updateChatTheme
} from '../services/firestoreService';
import { GroupSettingsModal } from './GroupSettingsModal';
import { MediaGalleryModal } from './MediaGalleryModal';

const SAMPLE_GIFS = [
  { id: '1', title: 'Party Cat 🐱', url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif' },
  { id: '2', title: 'Mind Blown 🤯', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: '3', title: 'Popcorn Chill 🍿', url: 'https://media.giphy.com/media/uWzS6ZLs01I4/giphy.gif' },
  { id: '4', title: 'Victory Dance 💃', url: 'https://media.giphy.com/media/l0AMJzvhOScbXY0TY/giphy.gif' },
  { id: '5', title: 'Clapping 👏', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: '6', title: 'High Five 🖐️', url: 'https://media.giphy.com/media/3oEJHV0z8S7WM4MwnK/giphy.gif' },
];

const SAMPLE_STICKERS = [
  { id: 's1', title: 'Sparkle Heart', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=400&q=80' },
  { id: 's2', title: 'Cyber Neon', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80' },
  { id: 's3', title: 'Cute Panda', url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef9?auto=format&fit=crop&w=400&q=80' },
  { id: 's4', title: 'Golden Star', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' },
];

const POPULAR_EMOJIS = [
  '😊', '😂', '😍', '🔥', '❤️', '👍', '🎉', '🚀', 
  '🥳', '💩', '💯', '✨', '👏', '🙏', '😎', '🤖', 
  '👻', '🥑', '🍕', '🍻', '⚽', '🍿', '🎈', '💡', 
  '🌟', '💔', '🤯', '😴', '🙌', '👀', '⚡', '🌈'
];

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
  const [popoverTab, setPopoverTab] = useState<'emojis' | 'stickers' | 'gifs' | 'attachments'>('emojis');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  const handleSaveEdit = async (msg: Message) => {
    if (editingMessageText.trim() && editingMessageText !== msg.content) {
      await updateFirestoreMessage(chat.id, msg.id, editingMessageText);
    }
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  // Disappearing Media Pop-up notice state
  const [pendingMediaNotice, setPendingMediaNotice] = useState<{
    contentType: string;
    action: () => void;
  } | null>(null);
  const [dontShowNoticeSession, setDontShowNoticeSession] = useState(() => {
    return sessionStorage.getItem('splendid_notice_ack') === 'true';
  });

  const confirmOrExecuteMediaSend = (contentType: string, action: () => void) => {
    const isAck = dontShowNoticeSession || sessionStorage.getItem('splendid_notice_ack') === 'true';
    if (isAck) {
      action();
    } else {
      setPendingMediaNotice({ contentType, action });
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingSoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draftDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Re-sync draft when switching active chat
  useEffect(() => {
    const activeDraft = chat.draft || getCachedChatDraft(chat.id, currentUser.id) || '';
    setInputText(activeDraft);
    setReplyingTo(null);
  }, [chat.id]);

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

    // Typing sound & haptic (throttled)
    if (!typingSoundTimeoutRef.current) {
        if (navigator.vibrate) navigator.vibrate(10);
        playGlassChimeSound('typing');
        typingSoundTimeoutRef.current = setTimeout(() => {
            typingSoundTimeoutRef.current = null;
        }, 300);
    }

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
        confirmOrExecuteMediaSend('photo attachment', () => {
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
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendPresetImage = (url: string, title: string) => {
    confirmOrExecuteMediaSend(title, () => {
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
    });
  };

  const handleInsertEmoji = (emoji: string) => {
    handleInputChange(inputText + emoji);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              confirmOrExecuteMediaSend('keyboard media / sticker', () => {
                playGlassChimeSound('sent');
                const replyPayload = replyingTo ? {
                  id: replyingTo.id,
                  content: replyingTo.content,
                  senderName: replyingTo.senderName
                } : undefined;
                setReplyingTo(null);

                const isGif = file.type.includes('gif') || file.name.endsWith('.gif');
                const label = isGif ? 'Keyboard GIF' : 'Keyboard Sticker';

                onSendMessage(label, 'image', dataUrl, {
                  fileName: file.name || (isGif ? 'keyboard_sticker.gif' : 'keyboard_sticker.png'),
                  fileSize: `${Math.round(file.size / 1024)} KB`
                }, replyPayload);
                setShowAttachmentMenu(false);
              });
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    }

    const pastedText = e.clipboardData?.getData('text');
    if (pastedText && (
      pastedText.match(/^https?:\/\/.*\.(gif|webp|png|jpg|jpeg)($|\?)/i) ||
      pastedText.includes('giphy.com') ||
      pastedText.includes('tenor.com')
    )) {
      if (!inputText.trim()) {
        e.preventDefault();
        confirmOrExecuteMediaSend('keyboard GIF link', () => {
          playGlassChimeSound('sent');
          const replyPayload = replyingTo ? {
            id: replyingTo.id,
            content: replyingTo.content,
            senderName: replyingTo.senderName
          } : undefined;
          setReplyingTo(null);
          onSendMessage('Keyboard GIF / Sticker', 'image', pastedText.trim(), {
            fileName: 'keyboard_media.gif',
            fileSize: 'GIF Link'
          }, replyPayload);
          setShowAttachmentMenu(false);
        });
      }
    }
  };

  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptionsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const THEME_COLORS = [
    { name: 'Classic Purple', bubble: '#701a75', accent: '#38bdf8' },
    { name: 'Emerald', bubble: '#064e3b', accent: '#10b981' },
    { name: 'Midnight', bubble: '#1e1b4b', accent: '#6366f1' },
    { name: 'Crimson', bubble: '#4c0519', accent: '#f43f5e' },
    { name: 'Amber', bubble: '#78350f', accent: '#f59e0b' },
    { name: 'Teal', bubble: '#134e4a', accent: '#14b8a6' },
    { name: 'Blue', bubble: '#1e3a8a', accent: '#3b82f6' },
    { name: 'Indigo', bubble: '#312e81', accent: '#818cf8' },
  ];

  const handleUpdateTheme = async (bubble: string, accent: string) => {
    await updateChatTheme(chat.id, bubble, accent);
    playGlassChimeSound('sent');
  };

  const handleClearChat = async () => {
    setShowClearConfirm(false);
    await clearChatMessages(chat.id);
    clearChatDraft(chat.id, currentUser.id);
    playGlassChimeSound('sent');
  };

  const handleToggleDisappearing = async () => {
    const next = !chat.disappearingMode;
    await toggleChatDisappearingMode(chat.id, next);
    playGlassChimeSound('sent');
  };

  const [allUsersState, setAllUsersState] = useState<User[]>([]);

  // Float and hide top/bottom bars on chat scroll
  const [isBarsVisible, setIsBarsVisible] = useState(true);
  const chatScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChatScroll = () => {
    setIsBarsVisible(false);

    if (chatScrollTimeoutRef.current) {
      clearTimeout(chatScrollTimeoutRef.current);
    }
    chatScrollTimeoutRef.current = setTimeout(() => {
      setIsBarsVisible(true);
    }, 250);
  };

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
        allowPhoneNumberVisibility: chat.participant?.allowPhoneNumberVisibility,
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

  // Enhanced Touch & Mouse drag sliding gesture states
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredLongPress = useRef<boolean>(false);

  const handleDragStart = (clientX: number, clientY: number, msg: Message) => {
    // If user clicked or touched an interactive element like a button or link, ignore swipe
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    isDraggingRef.current = true;
    setSwipingMsgId(msg.id);
    setSwipeOffset(0);

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    hasTriggeredLongPress.current = false;

    // Trigger long press after 500ms of holding down
    longPressTimeoutRef.current = setTimeout(() => {
      hasTriggeredLongPress.current = true;
      setActiveReactionMessageId(msg.id);
      playGlassChimeSound('sent');
    }, 500);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !swipingMsgId) return;

    const diffX = clientX - dragStartXRef.current;
    const diffY = clientY - dragStartYRef.current;

    // If there is significant horizontal or vertical drift, abort the long press trigger
    if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }

    // Swiping right to trigger message reply
    if (diffX > 0) {
      // Apply elastic friction damping
      const dampedOffset = Math.min(diffX * 0.7, 110);
      setSwipeOffset(dampedOffset);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleDragEnd = (msg: Message) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (hasTriggeredLongPress.current) {
      setSwipingMsgId(null);
      setSwipeOffset(0);
      hasTriggeredLongPress.current = false;
      return;
    }

    // Trigger message reply if swiped far enough (65px)
    if (swipeOffset > 65) {
      setReplyingTo(msg);
      playGlassChimeSound('sent');
    }

    setSwipingMsgId(null);
    setSwipeOffset(0);
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
    <div className={`fixed inset-0 h-[100dvh] w-[100dvw] z-50 flex flex-col ${currentWallpaper.class} text-slate-100 antialiased overflow-hidden relative`}>
      {currentWallpaper.pattern && (
        <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center text-7xl font-black select-none overflow-hidden">
          <div className="whitespace-nowrap">{currentWallpaper.pattern} {currentWallpaper.pattern}</div>
        </div>
      )}
      {/* Top Navigation Bar - WhatsApp Style Floating Glass */}
      <header
        className={`fixed top-2 inset-x-2 z-40 max-w-4xl mx-auto px-2 py-1.5 rounded-2xl mirror-glass-nav border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-out flex items-center justify-between pt-[max(0.375rem,env(safe-area-inset-top,0px))] ${
          isBarsVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            id="chat-back-btn"
            onClick={onBack}
            className="p-1 text-slate-200 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
            title="Back to conversations"
          >
            <span className="text-lg font-bold">←</span>
          </button>

          {/* Recipient Profile & Info */}
          <div
            id="chat-header-user-profile-btn"
            onClick={handleHeaderProfileClick}
            className="flex items-center gap-2 min-w-0 cursor-pointer p-0.5 -m-0.5 rounded-xl hover:bg-white/5 transition-all group"
            title="View contact info & phone number"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm overflow-hidden shadow">
                <span>{chat.avatar || '👤'}</span>
              </div>
              {!chat.isGroup && chat.status === 'online' && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0b141a]" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate flex items-center gap-1">
                <span>{displayAccountName}</span>
              </h3>
              <p className="text-[10px] text-slate-400 truncate leading-tight">
                {isPeerTyping ? (
                  <span className="text-cyan-400 font-semibold animate-pulse">
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
        <div className="flex items-center gap-0.5 shrink-0 select-none">
          {/* Voice Call with small dropdown indicator */}
          <div className="flex items-center">
            <button
              id="start-voice-call-btn"
              onClick={() => onStartCall(chat, false)}
              className="p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-full transition-colors text-base flex items-center gap-0.5"
              title="Start Voice Call"
            >
              <span>📞</span>
              <span className="text-[9px] opacity-70">▾</span>
            </button>
          </div>

          {/* Video Call */}
          <button
            id="start-video-call-btn"
            onClick={() => onStartCall(chat, true)}
            className="p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-full transition-colors text-base"
            title="Start Video Call"
          >
            <span>📹</span>
          </button>

          {/* Options Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="chat-options-menu-btn"
              onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
              className={`p-1.5 rounded-full transition-all text-base ${
                showOptionsDropdown ? 'bg-white/20 text-white' : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
              title="Chat Settings & Options"
            >
              <span>⋮</span>
            </button>

            {showOptionsDropdown && (
              <div className="absolute top-full right-0 mt-2 w-52 rounded-2xl mirror-glass border border-white/20 shadow-2xl overflow-hidden z-[60] animate-in slide-in-from-top-2 duration-150 py-1.5">
                {/* Chat Info */}
                <button
                  onClick={() => { handleHeaderProfileClick(); setShowOptionsDropdown(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
                >
                  <span className="text-base">ℹ️</span>
                  <span>{chat.isGroup ? 'Group Information' : 'Contact Details'}</span>
                </button>

                {/* Theme Customization */}
                <button
                  onClick={() => { setShowThemePicker(true); setShowOptionsDropdown(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
                >
                  <span className="text-base">🎨</span>
                  <span>Chat Theme</span>
                </button>

                {/* Disappearing Messages */}
                <button
                  onClick={() => { handleToggleDisappearing(); setShowOptionsDropdown(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-xs font-semibold ${
                    chat.disappearingMode ? 'text-purple-400 hover:bg-purple-500/10' : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">🕒</span>
                  <div className="flex flex-col items-start">
                    <span>24h Disappearing Mode</span>
                    <span className="text-[8px] opacity-60">{chat.disappearingMode ? 'Active' : 'Off'}</span>
                  </div>
                </button>

                {/* Media & Files Gallery */}
                <button
                  onClick={() => { setIsMediaGalleryOpen(true); setShowOptionsDropdown(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold border-t border-white/5 mt-1 pt-2"
                >
                  <span className="text-base">🖼️</span>
                  <span>Media & Files Gallery</span>
                </button>

                {/* Clear Chat */}
                <button
                  onClick={() => { setShowClearConfirm(true); setShowOptionsDropdown(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-xs font-bold"
                >
                  <span className="text-base">🗑️</span>
                  <span>Clear Chat History</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Pinned Messages Banner */}
      {chat.pinnedMessages && chat.pinnedMessages.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md relative z-10">
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
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar pt-20 pb-36 overscroll-contain backdrop-blur-[2px] bg-black/5"
        onScroll={handleChatScroll}
      >
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
              <MessageBubble
                key={msg.id}
                msg={msg}
                isUser={isUser}
                currentUser={currentUser}
                chat={chat}
                onDeleteMessage={onDeleteMessage}
                onOpenForward={onOpenForward}
                onToggleReaction={onToggleReaction}
                onOpenLightbox={onOpenLightbox}
                onTogglePin={onTogglePin}
                editingMessageId={editingMessageId}
                setEditingMessageId={setEditingMessageId}
                editingMessageText={editingMessageText}
                setEditingMessageText={setEditingMessageText}
                handleSaveEdit={handleSaveEdit}
                activeReactionMessageId={activeReactionMessageId}
                setActiveReactionMessageId={setActiveReactionMessageId}
                swipingMsgId={swipingMsgId}
                swipeOffset={swipeOffset}
                setMessageToDelete={setMessageToDelete}
                setReplyingTo={setReplyingTo}
                MEDIA_EXPIRATION_MS={MEDIA_EXPIRATION_MS}
                handleDragStart={handleDragStart}
                handleDragMove={handleDragMove}
                handleDragEnd={handleDragEnd}
              />
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

      {/* Hidden File Input for Native Photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Floating Bottom Input Bar - WhatsApp Style */}
      <footer
        className={`fixed bottom-2 inset-x-2 z-40 max-w-2xl mx-auto transition-all duration-300 ease-out pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] ${
          isBarsVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        {/* Reply Context Banner - Attached on top of input bar */}
        {replyingTo && (
          <div className="mb-2 p-2.5 px-3 rounded-2xl bg-[#111b21]/95 border border-white/20 shadow-2xl backdrop-blur-2xl flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-150 z-50">
            <div className="flex items-center gap-2.5 text-slate-200 min-w-0 pr-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-sm shrink-0">
                ↩️
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-red-400 text-[11px] truncate">Replying to {replyingTo.senderName}</span>
                <span className="truncate text-slate-300 text-xs">{replyingTo.content || (replyingTo.type === 'image' ? '📷 Photo' : '🎤 Voice note')}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white shrink-0 transition-all active:scale-90 z-50 cursor-pointer"
              title="Cancel Reply"
            >
              ❌
            </button>
          </div>
        )}

        {/* Attachment & Emoji Popover - Attached on top of input bar */}
        {showAttachmentMenu && (
          <div className="mb-2 p-3 rounded-3xl bg-[#111b21]/95 border border-white/20 shadow-2xl backdrop-blur-2xl flex flex-col gap-3 animate-in slide-in-from-bottom duration-150 z-50 max-w-2xl mx-auto">
            {/* Popover Header Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setPopoverTab('emojis')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    popoverTab === 'emojis'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>😊</span> Emojis
                </button>
                <button
                  type="button"
                  onClick={() => setPopoverTab('stickers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    popoverTab === 'stickers'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>🎨</span> Stickers
                </button>
                <button
                  type="button"
                  onClick={() => setPopoverTab('gifs')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    popoverTab === 'gifs'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>🎬</span> GIFs
                </button>
                <button
                  type="button"
                  onClick={() => setPopoverTab('attachments')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    popoverTab === 'attachments'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>📎</span> Media
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachmentMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Tab Contents */}
            {popoverTab === 'emojis' && (
              <div className="space-y-2">
                <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleInsertEmoji(emoji)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-xl flex items-center justify-center transition-transform active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1 pt-1">
                  <span>⌨️</span> Tap to insert emoji, or use your device keyboard directly!
                </div>
              </div>
            )}

            {popoverTab === 'stickers' && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                  {SAMPLE_STICKERS.map((stk) => (
                    <button
                      key={stk.id}
                      type="button"
                      onClick={() => handleSendPresetImage(stk.url, stk.title)}
                      className="group flex flex-col items-center gap-1 p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                    >
                      <img
                        src={stk.url}
                        alt={stk.title}
                        className="w-14 h-14 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[10px] text-slate-300 font-semibold truncate w-full text-center">
                        {stk.title}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <span>✨</span> Tap a sticker to send, or paste stickers from your keyboard!
                </div>
              </div>
            )}

            {popoverTab === 'gifs' && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {SAMPLE_GIFS.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSendPresetImage(gif.url, gif.title)}
                      className="group relative rounded-xl overflow-hidden border border-white/10 bg-black/40 h-20 active:scale-95 transition-all"
                    >
                      <img
                        src={gif.url}
                        alt={gif.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[10px] font-bold text-white truncate text-center">
                        {gif.title}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <span>🎬</span> Send animated GIFs or copy/paste GIF links directly from device keyboard!
                </div>
              </div>
            )}

            {popoverTab === 'attachments' && (
              <div className="flex flex-wrap items-center justify-around gap-2 p-1">
                {/* Real Photo Upload from device / camera */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all active:scale-95"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-xl text-white shadow-md">
                    📷
                  </div>
                  <span className="text-[11px] font-semibold">24h Photo</span>
                </button>

                {/* Voice Memo recording panel */}
                <button
                  type="button"
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
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    handleSendPresetImage(
                      'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=800&q=80',
                      'Tokyo Neon Nights'
                    );
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all active:scale-95"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xl text-white shadow-md">
                    🌆
                  </div>
                  <span className="text-[11px] font-semibold">City View</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    handleSendPresetImage(
                      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
                      'Sunset Coastline'
                    );
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all active:scale-95"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-xl text-white shadow-md">
                    🏖️
                  </div>
                  <span className="text-[11px] font-semibold">Beach Photo</span>
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSendText} className="flex items-center gap-1.5 w-full max-w-2xl mx-auto">
          {/* Main Connected Capsule */}
          <div className="flex-1 bg-[#202c33] border border-white/10 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-md">
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => {
                setPopoverTab('emojis');
                setShowAttachmentMenu(!showAttachmentMenu);
              }}
              className="p-1 text-slate-300 hover:text-white transition-colors text-base shrink-0"
              title="Emoji & Stickers"
            >
              <span>😊</span>
            </button>

            {/* Message Input */}
            <div className="flex-1 min-w-0">
              <input
                id="chat-message-input"
                type="text"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onPaste={handlePaste}
                placeholder="Message or paste GIF/sticker..."
                className="w-full bg-transparent border-none text-white text-xs sm:text-sm focus:outline-none placeholder-slate-400 font-normal py-1"
              />
            </div>

            {/* Paperclip Button */}
            <button
              type="button"
              id="chat-attach-btn"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-1 text-slate-300 hover:text-white transition-colors text-base shrink-0"
              title="Attach Media"
            >
              <span>📎</span>
            </button>

            {/* Camera Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-slate-300 hover:text-white transition-colors text-base shrink-0"
              title="Take/Upload Photo"
            >
              <span>📷</span>
            </button>
          </div>

          {/* Standalone Circular Purple Action Button (Mic / Send) */}
          {inputText.trim() ? (
            <button
              type="submit"
              id="chat-send-btn"
              className="w-9 h-9 rounded-full bg-[#701a75] hover:bg-[#86198f] text-white flex items-center justify-center text-base shadow-md shadow-purple-950/50 transition-all active:scale-95 shrink-0"
              title="Send Message"
            >
              <span>🚀</span>
            </button>
          ) : (
            <button
              type="button"
              id="chat-mic-btn"
              onClick={onOpenVoiceRecorder}
              className="w-9 h-9 rounded-full bg-[#701a75] hover:bg-[#86198f] text-white flex items-center justify-center text-base shadow-md shadow-purple-950/50 transition-all active:scale-95 shrink-0"
              title="Record Voice Note"
            >
              <span>🎤</span>
            </button>
          )}
        </form>
      </footer>

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-red-500/30 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center text-3xl shadow-inner mb-2">
                🗑️
              </div>
              <h3 className="text-xl font-bold text-white">Clear entire chat?</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                This will permanently delete all sent and received messages, images, and voice notes from this chat and Firebase storage.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all active:scale-95"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Picker Modal */}
      {showThemePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/20 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-3xl shadow-inner mb-2">
                🎨
              </div>
              <h3 className="text-xl font-bold text-white">Customize Chat Theme</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select a bubble and accent color for this chat.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {THEME_COLORS.map((tc) => (
                <button
                  key={tc.name}
                  onClick={() => handleUpdateTheme(tc.bubble, tc.accent)}
                  className={`flex flex-col items-start gap-2 p-3 rounded-2xl border transition-all active:scale-95 ${
                    chat.bubbleColor === tc.bubble 
                      ? 'bg-white/15 border-white/40 ring-1 ring-white/20' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: tc.bubble }} />
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: tc.accent }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-200">{tc.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowThemePicker(false)}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-95 mt-4"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Disappearing Media & Expressive Content Notice Pop-up Modal */}
      {pendingMediaNotice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 mirror-glass backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-purple-500/30 shadow-2xl space-y-4 animate-in zoom-in-95 duration-75 relative">
            {/* Cancellation Icon (X) */}
            <button
              onClick={() => setPendingMediaNotice(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm transition-all active:scale-90"
              title="Cancel"
            >
              ❌
            </button>

            <div className="flex flex-col items-center text-center space-y-2 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-purple-600/30 mb-1">
                📸🎨
              </div>
              <h3 className="text-base font-bold text-white">Disappearing Media Notice</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sent and received media, stickers, emojis, and GIFs automatically disappear and are deleted from Firebase storage and user accounts.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-300 select-none">
              <input
                type="checkbox"
                id="dont-show-disappearing-notice"
                checked={dontShowNoticeSession}
                onChange={(e) => setDontShowNoticeSession(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="dont-show-disappearing-notice" className="cursor-pointer">
                Don't show again for this session
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setPendingMediaNotice(null)}
                className="py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
              >
                <span>❌</span>
                <span>Cancel</span>
              </button>
              <button
                onClick={() => {
                  const action = pendingMediaNotice.action;
                  if (dontShowNoticeSession) {
                    sessionStorage.setItem('splendid_notice_ack', 'true');
                  }
                  setPendingMediaNotice(null);
                  action();
                }}
                className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-1 active:scale-95"
              >
                <span>🚀</span>
                <span>Proceed & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
