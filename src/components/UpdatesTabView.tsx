import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, UserStatus, STATUS_BACKGROUND_OPTIONS, BroadcastFeed, BroadcastFeedPost, Chat } from '../types';
import { postUserStatus, createBroadcastFeed, postToBroadcastFeed, subscribeToBroadcastFeeds, subscribeToFeedPosts, followBroadcastFeed, unfollowBroadcastFeed, reactToBroadcastFeedPost, deleteBroadcastFeedPost } from '../services/firestoreService';
import { startRecording, stopRecording, cancelRecording, createSimulatedVoiceNote, RecordingResult } from '../services/audioService';
import { ChatList } from './ChatList';

const BROADCAST_EMOJIS = ['📢', '🚀', '📰', '🔥', '💡', '💬', '🏆', '🎵', '🎒', '🛡️', '🌟', '💻', '🔮', '🎉', '✈️', '🍔', '🎨', '⚡', '🍿', '🌍', '📌', '❤️', '🍿', '🏁'];

interface UpdatesTabViewProps {
  currentUser: User;
  users: User[];
  activeStatuses: UserStatus[];
  onOpenStatusViewer: (userId: string, statuses: UserStatus[]) => void;
  chats?: Chat[];
  selectedChatId?: string | null;
  onSelectChat?: (chat: Chat) => void;
  onDeleteChat?: (chatId: string) => void;
  onTogglePin?: (chatId: string) => void;
  onOpenCreateGroup?: () => void;
  onOpenGroupProfile?: (chat: Chat) => void;
}

export const UpdatesTabView: React.FC<UpdatesTabViewProps> = ({
  currentUser,
  users,
  activeStatuses,
  onOpenStatusViewer,
  chats = [],
  selectedChatId = null,
  onSelectChat,
  onDeleteChat,
  onTogglePin,
  onOpenCreateGroup,
  onOpenGroupProfile
}) => {
  // Modal toggle states
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [boostSuccessMsg, setBoostSuccessMsg] = useState<string | null>(null);

  // Status values
  const [textStatus, setTextStatus] = useState('');
  const [selectedBg, setSelectedBg] = useState('indigo');
  const [imageFileUrl, setImageFileUrl] = useState<string | null>(null);
  const [voiceResult, setVoiceResult] = useState<RecordingResult | null>(null);

  // Search & Filter state for Broadcast Feeds and Groups
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'feeds' | 'groups' | 'following'>('all');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Voice recording live states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [freqBars, setFreqBars] = useState<number[]>([10, 20, 15, 30, 25, 40]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  // Loading/submitting states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Broadcast Feeds state
  const [broadcastFeeds, setBroadcastFeeds] = useState<BroadcastFeed[]>([]);
  const [isCreateFeedModalOpen, setIsCreateFeedModalOpen] = useState(false);
  const [feedName, setFeedName] = useState('');
  const [feedAvatar, setFeedAvatar] = useState('📢');
  const [feedDescription, setFeedDescription] = useState('');
  const [selectedFeed, setSelectedFeed] = useState<BroadcastFeed | null>(null);
  const [feedPosts, setFeedPosts] = useState<BroadcastFeedPost[]>([]);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);

  const REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '👏', '🎉'];

  const longPressTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleStartPress = (postId: string) => {
    if (longPressTimers.current[postId]) {
      clearTimeout(longPressTimers.current[postId]);
    }
    longPressTimers.current[postId] = setTimeout(() => {
      setReactingPostId(postId);
    }, 500);
  };

  const handleEndPress = (postId: string) => {
    if (longPressTimers.current[postId]) {
      clearTimeout(longPressTimers.current[postId]);
      delete longPressTimers.current[postId];
    }
  };

  // Keep selectedFeed reference updated with real-time Firestore updates
  useEffect(() => {
    if (selectedFeed) {
      const updated = broadcastFeeds.find((f) => f.id === selectedFeed.id);
      if (updated) {
        setSelectedFeed(updated);
      }
    }
  }, [broadcastFeeds]);

  // Automated cleanup for old posts (after 1 week)
  useEffect(() => {
    if (selectedFeed && feedPosts.length > 0) {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const oldPosts = feedPosts.filter(p => p.createdAt < oneWeekAgo);
      oldPosts.forEach(async (post) => {
        await deleteBroadcastFeedPost(post.id);
      });
    }
  }, [feedPosts, selectedFeed]);

  // Composers inside feed
  const [feedText, setFeedText] = useState('');
  const [feedImageFile, setFeedImageFile] = useState<string | null>(null);

  // Subscribe to all broadcast feeds in real-time
  useEffect(() => {
    const unsubscribe = subscribeToBroadcastFeeds((feeds) => {
      setBroadcastFeeds(feeds);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to posts for the selected broadcast feed in real-time
  useEffect(() => {
    if (!selectedFeed) {
      setFeedPosts([]);
      return;
    }
    const unsubscribe = subscribeToFeedPosts(selectedFeed.id, (posts) => {
      setFeedPosts(posts);
    });
    return () => unsubscribe();
  }, [selectedFeed]);

  // Timer for voice note duration counter
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
        setFreqBars([...Array(8)].map(() => Math.floor(Math.random() * 80) + 15));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, []);

  // Map active statuses by user
  const groupedStatuses: Record<string, UserStatus[]> = {};
  activeStatuses.forEach((status) => {
    if (!groupedStatuses[status.userId]) {
      groupedStatuses[status.userId] = [];
    }
    groupedStatuses[status.userId].push(status);
  });

  // Extract my statuses
  const myStatuses = groupedStatuses[currentUser.id] || [];
  // Extract others' statuses
  const otherUsersStatuses = Object.entries(groupedStatuses).filter(
    ([userId]) => {
      if (userId === currentUser.id) return false;
      const creator = users.find(u => u.id === userId);
      if (!creator) return false;
      const privacy = creator.statusPrivacy || "everyone";
      if (privacy === "everyone") return true;
      if (privacy === "specific") {
        return creator.statusAllowedUsers?.includes(currentUser.id);
      }
      return true;
    }
  );

  // Create text status
  const handlePostTextStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textStatus.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isReshareAllowed = currentUser.allowReshare !== false;
      await postUserStatus(currentUser, 'text', textStatus.trim(), undefined, selectedBg, isReshareAllowed);
      setTextStatus('');
      setIsTextModalOpen(false);
    } catch (err) {
      console.error('Error posting text status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert image to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageFileUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Create image status
  const handlePostImageStatus = async () => {
    if (!imageFileUrl || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isReshareAllowed = currentUser.allowReshare !== false;
      await postUserStatus(currentUser, 'image', imageFileUrl, undefined, undefined, isReshareAllowed);
      setImageFileUrl(null);
      setIsImageModalOpen(false);
    } catch (err) {
      console.error('Error posting image status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Voice Recording Actions
  const handleStartVoiceRecord = () => {
    setRecordingSeconds(0);
    setMicPermissionError(null);
    setVoiceResult(null);

    startRecording(() => {})
      .then((success) => {
        if (success) {
          setIsRecording(true);
        } else {
          setMicPermissionError('Microphone block detected. Use the simulated record function.');
        }
      })
      .catch((err) => {
        console.error('Error starting voice status:', err);
      });
  };

  const handleStopVoiceRecord = async () => {
    const res = await stopRecording();
    setIsRecording(false);
    if (res) {
      setVoiceResult(res);
    }
  };

  const handleSimulateVoiceRecord = async () => {
    const res = await createSimulatedVoiceNote(4);
    setVoiceResult(res);
  };

  // Post voice note status
  const handlePostVoiceStatus = async () => {
    if (!voiceResult || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Audio = event.target?.result as string;
        const isReshareAllowed = currentUser.allowReshare !== false;
        await postUserStatus(currentUser, 'voice', base64Audio, voiceResult.duration, undefined, isReshareAllowed);
        setVoiceResult(null);
        setIsVoiceModalOpen(false);
      };
      reader.readAsDataURL(voiceResult.audioBlob);
    } catch (err) {
      console.error('Error posting voice status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Broadcast Feed
  const handleCreateFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createBroadcastFeed(currentUser, feedName.trim(), feedAvatar, feedDescription.trim());
      setFeedName('');
      setFeedAvatar('📢');
      setFeedDescription('');
      setIsCreateFeedModalOpen(false);
    } catch (err) {
      console.error('Error creating broadcast feed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert post image to base64
  const handleFeedPostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFeedImageFile(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Create Broadcast Post
  const handleCreateFeedPost = async (type: 'text' | 'image' | 'voice', content: string, duration?: number) => {
    if (!selectedFeed || !content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await postToBroadcastFeed(currentUser, selectedFeed.id, type, content, duration);
      if (type === 'text') setFeedText('');
      if (type === 'image') setFeedImageFile(null);
    } catch (err) {
      console.error('Error posting to broadcast feed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter groups according to search
  const groupChats = useMemo(() => {
    return chats.filter(c => c.isGroup);
  }, [chats]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupChats;
    const q = searchQuery.toLowerCase().trim();
    return groupChats.filter(group => {
      const matchName = group.name?.toLowerCase().includes(q);
      const matchDesc = group.description?.toLowerCase().includes(q);
      const matchLastMsg = group.lastMessage?.text?.toLowerCase().includes(q);
      return matchName || matchDesc || matchLastMsg;
    });
  }, [groupChats, searchQuery]);

  // Filter broadcast feeds according to search & filter tab
  const filteredBroadcastFeeds = useMemo(() => {
    let list = broadcastFeeds;

    if (activeFilter === 'following') {
      list = list.filter(f => f.followers?.includes(currentUser.id) || f.creatorId === currentUser.id);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(feed => {
      const matchName = feed.name?.toLowerCase().includes(q);
      const matchDesc = feed.description?.toLowerCase().includes(q);
      const matchCreator = feed.creatorName?.toLowerCase().includes(q);
      return matchName || matchDesc || matchCreator;
    });
  }, [broadcastFeeds, searchQuery, activeFilter, currentUser.id]);

  const totalResultsCount = (activeFilter === 'feeds' ? 0 : filteredGroups.length) + (activeFilter === 'groups' ? 0 : filteredBroadcastFeeds.length);

  return (
    <div className="w-full px-4 py-3 space-y-5 pb-32 text-slate-100 select-none">
      
      {/* ─── TOP HEADER BAR ─── */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Updates
        </h1>

        <div className="flex items-center gap-1.5">
          {/* Camera shortcut for photo status */}
          <button
            onClick={() => setIsImageModalOpen(true)}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 text-slate-200 hover:text-white flex items-center justify-center border border-white/5 transition-all text-base cursor-pointer"
            title="Post photo status"
          >
            <span>📷</span>
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchActive(!isSearchActive)}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all text-sm cursor-pointer active:scale-90 ${
              isSearchActive 
                ? 'bg-rose-600/30 border-rose-500/50 text-rose-300' 
                : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-200 hover:text-white'
            }`}
            title="Search channels & groups"
          >
            <span>🔍</span>
          </button>

          {/* Quick Creator / Actions Menu */}
          <div className="relative group">
            <button
              onClick={() => setIsTextModalOpen(true)}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 text-slate-200 hover:text-white flex items-center justify-center border border-white/5 transition-all text-base cursor-pointer"
              title="Add text status"
            >
              <span>✏️</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── STATUS SECTION (WHATSAPP BUSINESS EXACT CARD STYLE) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white tracking-wide">
            Status
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              title="Voice Status"
            >
              <span>🎤</span>
              <span>Voice</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => setIsTextModalOpen(true)}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>✏️</span>
              <span>Write</span>
            </button>
          </div>
        </div>

        {/* Horizontal Status Cards Carousel */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-0.5 px-0.5 custom-scrollbar snap-x select-none">
          
          {/* 1. MY STATUS CARD ("Add status") */}
          <div
            onClick={() => {
              if (myStatuses.length > 0) {
                onOpenStatusViewer(currentUser.id, myStatuses);
              } else {
                setIsTextModalOpen(true);
              }
            }}
            className="relative shrink-0 w-[105px] h-[168px] rounded-[22px] overflow-hidden border border-white/10 bg-gradient-to-b from-[#1c222e] via-[#141822] to-[#0d1017] shadow-xl flex flex-col justify-between p-3 cursor-pointer group snap-start transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Background preview for my active status if exists */}
            {myStatuses.length > 0 && myStatuses[0].type === 'image' && (
              <img 
                src={myStatuses[0].content} 
                alt="My Status preview" 
                className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-45 transition-opacity" 
              />
            )}
            {myStatuses.length > 0 && myStatuses[0].type === 'text' && (
              <div className={`absolute inset-0 bg-gradient-to-br ${STATUS_BACKGROUND_OPTIONS.find(b => b.id === myStatuses[0].backgroundColor)?.class || 'from-indigo-900 to-purple-950'} opacity-35`} />
            )}

            {/* Subtle top shade */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

            {/* Upper / Center User Avatar with white plus badge */}
            <div className="relative z-10 mx-auto mt-2.5">
              <div className="relative w-13 h-13 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-white/20 flex items-center justify-center text-2xl shadow-lg">
                <span>{currentUser.avatar || '👤'}</span>
                
                {/* Plus (+) white badge on bottom-right of avatar */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTextModalOpen(true);
                  }}
                  className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-white text-slate-950 font-black flex items-center justify-center text-xs shadow-md border border-slate-300 hover:scale-110 active:scale-95 transition-transform"
                  title="Add new status"
                >
                  +
                </div>

                {/* Pulsing ring if status active */}
                {myStatuses.length > 0 && (
                  <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-pulse pointer-events-none" />
                )}
              </div>
            </div>

            {/* Bottom Label */}
            <div className="relative z-10 text-center pb-0.5">
              <p className="text-[12px] font-extrabold text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {myStatuses.length > 0 ? 'My status' : 'Add status'}
              </p>
              {myStatuses.length > 0 && (
                <p className="text-[9px] text-emerald-400 font-bold">
                  {myStatuses.length} {myStatuses.length === 1 ? 'update' : 'updates'}
                </p>
              )}
            </div>
          </div>

          {/* 2. OTHER USERS' STATUS CARDS */}
          {otherUsersStatuses.map(([userId, statuses]) => {
            const mostRecent = statuses[0];
            const userContact = users.find((u) => u.id === userId);
            const displayName = userContact ? (userContact.fullName || userContact.username) : mostRecent.userFullName;
            const avatar = userContact ? userContact.avatar : mostRecent.userAvatar;

            return (
              <div
                key={userId}
                onClick={() => onOpenStatusViewer(userId, statuses)}
                className="relative shrink-0 w-[105px] h-[168px] rounded-[22px] overflow-hidden border border-white/10 bg-gradient-to-b from-[#1a1f2c] via-[#121620] to-[#0a0d14] shadow-xl flex flex-col justify-between p-3 cursor-pointer group snap-start transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Background Image / Gradient Preview */}
                {mostRecent.type === 'image' && (
                  <img
                    src={mostRecent.content}
                    alt={`${displayName} status`}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                  />
                )}
                {mostRecent.type === 'text' && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${STATUS_BACKGROUND_OPTIONS.find(b => b.id === mostRecent.backgroundColor)?.class || 'from-rose-900 to-indigo-950'} opacity-65 flex items-center justify-center p-2 text-[9px] font-bold text-white/80 text-center select-none overflow-hidden`}>
                    <p className="line-clamp-4 leading-tight">{mostRecent.content}</p>
                  </div>
                )}
                {mostRecent.type === 'voice' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 opacity-70 flex items-center justify-center">
                    <span className="text-3xl opacity-30">🎙️</span>
                  </div>
                )}

                {/* Dark Vignette Overlay for Crisp Readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />

                {/* Top Center: Circular Avatar with Emerald-Green Border Ring */}
                <div className="relative z-10 mx-auto mt-2">
                  <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 to-green-500 shadow-md">
                    <div className="w-full h-full rounded-full bg-slate-900 border border-slate-950 flex items-center justify-center text-xl overflow-hidden">
                      <span>{avatar || '👤'}</span>
                    </div>

                    {/* Multiple Updates Counter badge */}
                    {statuses.length > 1 && (
                      <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[8px] shadow">
                        {statuses.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Center: Display Name */}
                <div className="relative z-10 text-center pb-0.5">
                  <p className="text-[11px] font-extrabold text-white tracking-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] leading-tight px-0.5">
                    {displayName}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Empty state hint if no other contact statuses */}
          {otherUsersStatuses.length === 0 && (
            <div className="shrink-0 flex items-center justify-center px-4 py-6 rounded-[22px] border border-dashed border-white/10 bg-white/[0.01] text-center text-slate-400 text-xs space-y-1">
              <div>
                <p className="text-sm font-semibold text-slate-300">No new status</p>
                <p className="text-[10px] text-slate-500">Tap + to share yours</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── "📢 Boost status" Pill Button ─── */}
        <button
          onClick={() => setIsBoostModalOpen(true)}
          className="w-full py-2.5 px-4 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] active:scale-[0.99] text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <span className="text-sm">📢</span>
          <span>Boost status</span>
        </button>
      </div>

      {/* ─── CHANNELS SECTION (BROADCAST FEEDS & GROUPS) ─── */}
      <div className="space-y-4 pt-2 border-t border-white/10 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white tracking-wide">
            Channels
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveFilter('all');
                setIsSearchActive(true);
              }}
              className="px-3.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Explore
            </button>
            <button
              onClick={() => setIsCreateFeedModalOpen(true)}
              className="px-3 py-1 rounded-full bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <span>➕</span>
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Integrated Search Bar for Broadcast Feeds and Groups */}
        <div className="space-y-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Broadcast Feeds, Channels & Groups..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all font-medium"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-[10px] font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
              }`}
            >
              All Channels ({filteredGroups.length + filteredBroadcastFeeds.length})
            </button>

            <button
              onClick={() => setActiveFilter('feeds')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                activeFilter === 'feeds'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
              }`}
            >
              <span>📢</span>
              <span>Broadcasts ({filteredBroadcastFeeds.length})</span>
            </button>

            <button
              onClick={() => setActiveFilter('groups')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                activeFilter === 'groups'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
              }`}
            >
              <span>👥</span>
              <span>Groups ({filteredGroups.length})</span>
            </button>

            <button
              onClick={() => setActiveFilter('following')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                activeFilter === 'following'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
              }`}
            >
              <span>⭐</span>
              <span>Following</span>
            </button>
          </div>
        </div>

        {/* ─── COMBINED CHANNELS LIST / SECTIONS ─── */}
        {totalResultsCount === 0 ? (
          <div className="p-8 rounded-3xl mirror-glass-card border border-white/10 text-center space-y-3 bg-white/[0.01]">
            <span className="text-3xl block">🔍</span>
            <p className="text-sm font-bold text-slate-200">No channels or groups found</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {searchQuery ? `No results matching "${searchQuery}". Try a different name.` : 'Create a new Broadcast Feed or Group Channel to get started.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setIsCreateFeedModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                📢 New Feed
              </button>
              <button
                onClick={() => onOpenCreateGroup && onOpenCreateGroup()}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                👥 New Group
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* 1. Broadcast Feeds List */}
            {activeFilter !== 'groups' && filteredBroadcastFeeds.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <span>📢</span>
                    <span>Broadcast Feeds</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {filteredBroadcastFeeds.length} active
                  </span>
                </div>

                <div className="space-y-2">
                  {filteredBroadcastFeeds.map((feed) => {
                    const isCreator = feed.creatorId === currentUser.id;
                    const isFollowing = feed.followers?.includes(currentUser.id) || isCreator;

                    return (
                      <div
                        key={feed.id}
                        onClick={() => setSelectedFeed(feed)}
                        className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between gap-3.5 transition-all cursor-pointer group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-white/10 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                            {feed.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-extrabold text-slate-100 group-hover:text-rose-400 transition-colors truncate">
                                {feed.name}
                              </h4>
                              {isCreator && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-600/20 border border-rose-500/30 text-rose-300 text-[9px] font-black uppercase">
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">
                              {feed.description || 'Tap to view broadcast updates and media'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            {new Date(feed.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
                              👥 {feed.followers?.length || 0}
                            </span>

                            {isFollowing ? (
                              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold" title="Following">
                                ✓
                              </span>
                            ) : (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await followBroadcastFeed(feed.id, currentUser.id);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow"
                              >
                                Follow
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Group Channels List */}
            {activeFilter !== 'feeds' && filteredGroups.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <span>👥</span>
                    <span>Group Channels</span>
                  </h3>
                  <button
                    onClick={() => onOpenCreateGroup && onOpenCreateGroup()}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>➕ New Group</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <ChatList
                    chats={filteredGroups}
                    selectedChatId={selectedChatId || null}
                    onSelectChat={onSelectChat || (() => {})}
                    onDeleteChat={onDeleteChat || (() => {})}
                    onTogglePin={onTogglePin || (() => {})}
                    onOpenNewChat={onOpenCreateGroup || (() => {})}
                    onOpenGroupProfile={onOpenGroupProfile}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 0. BOOST STATUS MODAL ─── */}
      {isBoostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-75">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📢</span>
                <span>Boost Status & Reach</span>
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsBoostModalOpen(false);
                  setBoostSuccessMsg(null);
                }} 
                className="text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-2 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
                📢
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Promote Your Status</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                  Pin your updates to the top of contacts' feeds, broadcast status alerts to your groups, or copy a direct status share link.
                </p>
              </div>

              {boostSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in">
                  {boostSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setBoostSuccessMsg('📋 Status link copied to clipboard!');
                    setTimeout(() => setBoostSuccessMsg(null), 3000);
                  }}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 transition-all cursor-pointer"
                >
                  <span className="text-lg">🔗</span>
                  <div>
                    <p className="text-xs font-bold text-white">Copy Status Link</p>
                    <p className="text-[10px] text-slate-400">Share status directly with anyone</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setBoostSuccessMsg('🚀 Status prioritized to top of contacts updates!');
                    setTimeout(() => setBoostSuccessMsg(null), 3000);
                  }}
                  className="p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center gap-3 transition-all cursor-pointer"
                >
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Spotlight Status</p>
                    <p className="text-[10px] text-slate-400">High priority card in carousel</p>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setIsBoostModalOpen(false);
                setBoostSuccessMsg(null);
              }}
              className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── 1. CREATE TEXT STATUS MODAL ─── */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-75">
          <form 
            onSubmit={handlePostTextStatus}
            className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-center"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Create Text Status</h3>
              <button 
                type="button" 
                onClick={() => setIsTextModalOpen(false)} 
                className="text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {(() => {
              const selectedBgObj = STATUS_BACKGROUND_OPTIONS.find(b => b.id === selectedBg) || STATUS_BACKGROUND_OPTIONS[0];
              const selectedBgClass = selectedBgObj.class;
              return (
                <textarea
                  value={textStatus}
                  onChange={(e) => setTextStatus(e.target.value)}
                  placeholder="Type a status update..."
                  maxLength={150}
                  rows={4}
                  required
                  className={`w-full p-6 rounded-2xl bg-gradient-to-tr ${selectedBgClass} border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 text-base font-bold text-center resize-none shadow-inner`}
                />
              );
            })()}

            {/* Background Color Selector dots */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Theme</label>
              <div className="flex flex-wrap gap-2 justify-center py-1">
                {STATUS_BACKGROUND_OPTIONS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setSelectedBg(bg.id)}
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${bg.class} border transition-all flex items-center justify-center relative active:scale-90 cursor-pointer ${
                      selectedBg === bg.id ? 'border-white scale-110 ring-2 ring-rose-500' : 'border-white/20 hover:scale-105'
                    }`}
                    title={bg.name}
                  >
                    {selectedBg === bg.id && (
                      <span className="text-[10px] text-white">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Characters</span>
              <span>{textStatus.length} / 150</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !textStatus.trim()}
              className="w-full h-11 rounded-2xl hero-red-pill text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Posting status...' : '🚀 Post Text Status'}
            </button>
          </form>
        </div>
      )}

      {/* ─── 2. CREATE IMAGE STATUS MODAL ─── */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-75">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Post Image Status</h3>
              <button 
                type="button" 
                onClick={() => {
                  setImageFileUrl(null);
                  setIsImageModalOpen(false);
                }} 
                className="text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {!imageFileUrl ? (
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 hover:border-rose-500/40 transition-colors flex flex-col items-center justify-center gap-3 relative cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="text-3xl">🖼️</span>
                <p className="text-xs font-bold text-slate-300">Tap to upload / choose image</p>
                <p className="text-[10px] text-slate-500">Supports PNG, JPG, WebP</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-900 border border-white/15 flex items-center justify-center relative">
                  <img src={imageFileUrl} alt="Selected Status" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageFileUrl(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
                <button
                  onClick={handlePostImageStatus}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-2xl hero-red-pill text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Posting status...' : '🚀 Publish Photo'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. CREATE VOICE STATUS MODAL ─── */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-75">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Record Voice Status</h3>
              <button 
                type="button" 
                onClick={() => {
                  setVoiceResult(null);
                  setIsVoiceModalOpen(false);
                }} 
                className="text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {!voiceResult ? (
              <div className="py-6 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-3xl shadow-lg relative">
                  {isRecording && (
                    <span className="absolute inset-0 rounded-full bg-rose-500/20 border border-rose-500 animate-ping" />
                  )}
                  🎙️
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-300">
                    {isRecording ? 'Now Recording...' : 'Tap below to record status'}
                  </p>
                  {isRecording && (
                    <p className="text-[11px] text-rose-400 font-mono">
                      {recordingSeconds} seconds recorded
                    </p>
                  )}
                </div>

                {micPermissionError && (
                  <p className="text-[10px] text-amber-300 px-2 max-w-xs leading-relaxed">
                    {micPermissionError}
                  </p>
                )}

                <div className="flex items-center justify-center gap-3 pt-2 w-full">
                  {!isRecording ? (
                    <>
                      <button
                        onClick={handleStartVoiceRecord}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow"
                      >
                        Start Recording
                      </button>
                      <button
                        onClick={handleSimulateVoiceRecord}
                        className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/15 cursor-pointer"
                      >
                        Demo Voice
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleStopVoiceRecord}
                      className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow"
                    >
                      Finish and Preview
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎙️</span>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-200">Voice Note Status</p>
                      <p className="text-[10px] text-slate-400">{voiceResult.duration} seconds length</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const audio = new Audio(voiceResult.audioUrl);
                      audio.play().catch(e => { if (e.name !== "AbortError") console.error("Audio playback error:", e); });
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                  >
                    ▶ Play Preview
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setVoiceResult(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 font-bold text-xs border border-white/10"
                  >
                    Re-record
                  </button>
                  <button
                    onClick={handlePostVoiceStatus}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer"
                  >
                    {isSubmitting ? 'Posting...' : '🚀 Post Voice Status'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 4. CREATE BROADCAST FEED MODAL ─── */}
      {isCreateFeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-75">
          <form 
            onSubmit={handleCreateFeedSubmit}
            className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-rose-400 uppercase tracking-wider">Create Broadcast Feed</h3>
              <button 
                type="button" 
                onClick={() => setIsCreateFeedModalOpen(false)} 
                className="text-slate-400 hover:text-slate-200 text-xs font-extrabold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Feed Avatar Emoji</label>
                <div className="flex gap-2 overflow-x-auto py-1.5 px-0.5 custom-scrollbar snap-x">
                  {BROADCAST_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFeedAvatar(emoji)}
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xl cursor-pointer transition-all border ${
                        feedAvatar === emoji 
                          ? 'bg-rose-600/30 border-rose-500 scale-110' 
                          : 'bg-white/5 border-white/10 hover:bg-white/12'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Feed Name</label>
                <input
                  type="text"
                  required
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="e.g., EarnAds/HashCash, Crypto, Tech Insights"
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Description</label>
                <textarea
                  value={feedDescription}
                  onChange={(e) => setFeedDescription(e.target.value)}
                  placeholder="What is this channel about? Only you can post here."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none leading-relaxed font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !feedName.trim()}
              className="w-full h-11 rounded-2xl hero-red-pill text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
            >
              {isSubmitting ? 'Creating...' : '🚀 Create Feed'}
            </button>
          </form>
        </div>
      )}

      {/* ─── 5. BROADCAST FEED DETAILED VIEWER MODAL ─── */}
      {selectedFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-100">
          <div className="w-full max-w-md h-[80vh] flex flex-col rounded-3xl mirror-glass-card border border-white/15 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl shrink-0">
                  {selectedFeed.avatar}
                </div>
                <div className="min-w-0 text-left">
                  <h3 className="text-sm font-extrabold text-slate-100 truncate">{selectedFeed.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">{selectedFeed.description || 'No description'}</p>
                </div>
              </div>

              {/* Follow / Unfollow controls and Follower counts */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  👥 {selectedFeed.followers?.length || 0}
                </span>

                {selectedFeed.creatorId !== currentUser.id ? (
                  <button
                    onClick={async () => {
                      const isFollowing = selectedFeed.followers?.includes(currentUser.id);
                      if (isFollowing) {
                        await unfollowBroadcastFeed(selectedFeed.id, currentUser.id);
                      } else {
                        await followBroadcastFeed(selectedFeed.id, currentUser.id);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                      selectedFeed.followers?.includes(currentUser.id)
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {selectedFeed.followers?.includes(currentUser.id) ? 'Unfollow' : 'Follow'}
                  </button>
                ) : (
                  <span className="text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
                    👑 Owner
                  </span>
                )}

                <button 
                  onClick={() => {
                    setSelectedFeed(null);
                    setFeedText('');
                    setFeedImageFile(null);
                    setReactingPostId(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 text-xs font-extrabold px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Posts Stream with Follow check gating */}
            {(() => {
              const isCreator = selectedFeed.creatorId === currentUser.id;
              const isFollowing = selectedFeed.followers?.includes(currentUser.id) || isCreator;

              if (!isFollowing) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950/20">
                    <span className="text-4xl animate-bounce">🔒</span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider text-rose-400">Content Locked</h4>
                      <p className="text-xs text-slate-300 max-w-[280px] mx-auto leading-relaxed">
                        Follow <strong>@{selectedFeed.creatorName}</strong>'s Broadcast Feed to view updates, browse media, and react with emojis.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await followBroadcastFeed(selectedFeed.id, currentUser.id);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      💚 Follow Channel
                    </button>
                    <p className="text-[10px] text-slate-500 font-extrabold">
                      👥 Join {selectedFeed.followers?.length || 0} followers active now
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-950/20 text-left">
                  {feedPosts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-slate-500 py-12">
                      <span className="text-3xl">🤫</span>
                      <p className="text-xs font-bold text-slate-400">Quiet in here...</p>
                      <p className="text-[10px] text-slate-500 max-w-[220px]">
                        {selectedFeed.creatorId === currentUser.id 
                          ? "Start broadcasting text updates, photos, or voice notes to your feed!"
                          : `Only @${selectedFeed.creatorName} can publish updates to this broadcast channel.`}
                      </p>
                    </div>
                  ) : (
                    feedPosts.map((post) => (
                      <div 
                        key={post.id} 
                        onMouseDown={() => handleStartPress(post.id)}
                        onMouseUp={() => handleEndPress(post.id)}
                        onMouseLeave={() => handleEndPress(post.id)}
                        onTouchStart={() => handleStartPress(post.id)}
                        onTouchEnd={() => handleEndPress(post.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setReactingPostId(post.id);
                        }}
                        className="relative max-w-[85%] rounded-2xl bg-white/[0.04] border border-white/5 p-3 space-y-2 select-none hover:bg-white/[0.06] transition-all duration-150 cursor-pointer"
                        title="Hold or right-click to react with emojis"
                      >
                        {/* Reaction Floating Bar */}
                        {reactingPostId === post.id && (
                          <div className="absolute -top-12 left-0 right-0 mx-auto w-max z-20 flex items-center gap-1 p-1 rounded-full bg-slate-900/95 backdrop-blur border border-white/15 shadow-2xl animate-in zoom-in-90 duration-100">
                            {REACTION_EMOJIS.map((emoji) => {
                              const hasReacted = post.reactions?.[currentUser.id] === emoji;
                              return (
                                <button
                                  key={emoji}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await reactToBroadcastFeedPost(post.id, currentUser.id, hasReacted ? null : emoji);
                                    setReactingPostId(null);
                                  }}
                                  className={`w-7 h-7 flex items-center justify-center text-sm rounded-full hover:bg-white/10 active:scale-125 transition-transform cursor-pointer ${
                                    hasReacted ? 'bg-rose-500/25 border border-rose-500/30' : ''
                                  }`}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReactingPostId(null);
                              }}
                              className="text-[9px] text-slate-400 hover:text-slate-200 font-extrabold px-1.5 cursor-pointer ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        )}



                        {/* Content type renders */}
                        {post.type === 'text' && (
                          <p className="text-xs text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        )}

                        {post.type === 'image' && (
                          <div className="rounded-xl overflow-hidden border border-white/5 bg-slate-950/40">
                            <img 
                              src={post.content} 
                              alt="Broadcast update" 
                              className="max-h-56 w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {post.type === 'voice' && (
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-lg">🎙️</span>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-200">Voice broadcast</p>
                                <p className="text-[8px] text-slate-400 font-mono">{post.duration || 0}s length</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const audio = new Audio(post.content);
                                audio.play().catch(err => { if (err.name !== "AbortError") console.error("Audio playback error:", err); });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold shrink-0 transition-all"
                            >
                              ▶ Play
                            </button>
                          </div>
                        )}

                        {/* Render existing aggregate emoji counts */}
                        {post.reactions && Object.keys(post.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(() => {
                              const reactionCounts: { [emoji: string]: number } = {};
                              const reactionsObj = post.reactions || {};
                              Object.values(reactionsObj).forEach((emojiVal) => {
                                const emoji = emojiVal as string;
                                reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                              });
                              return Object.entries(reactionCounts).map(([emoji, count]) => {
                                const hasUserReacted = (post.reactions as Record<string, string>)?.[currentUser.id] === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await reactToBroadcastFeedPost(post.id, currentUser.id, hasUserReacted ? null : emoji);
                                    }}
                                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold flex items-center gap-1 transition-all cursor-pointer border ${
                                      hasUserReacted 
                                        ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow' 
                                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{count}</span>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })()}

            {/* Footer Composer (Visible ONLY to Feed Creator, else show follow/unfollow notes) */}
            <div className="p-3 border-t border-white/10 bg-white/[0.01] shrink-0">
              {(() => {
                const isCreator = selectedFeed.creatorId === currentUser.id;
                const isFollowing = selectedFeed.followers?.includes(currentUser.id) || isCreator;

                if (!isFollowing) {
                  return (
                    <div className="py-2 px-3 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
                        <span>🔒</span>
                        <span>Follow this channel to see updates & express emoji reactions.</span>
                      </p>
                    </div>
                  );
                }

                if (isCreator) {
                  return (
                    <div className="space-y-2">
                      {/* Media pre-upload status flags */}
                      {feedImageFile && (
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📷</span>
                            <span className="text-[10px] font-bold text-slate-300">Photo attached successfully</span>
                          </div>
                          <button 
                            onClick={() => setFeedImageFile(null)}
                            className="text-rose-400 hover:text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* Input area */}
                      <div className="flex items-center gap-2">
                        {/* Attach Photo Button */}
                        <label className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sm cursor-pointer shrink-0 transition-all">
                          <span>📷</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            onChange={handleFeedPostImageChange} 
                          />
                        </label>

                        {/* Simulate Voice note button */}
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await createSimulatedVoiceNote(5);
                            if (res) {
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                const base64Audio = event.target?.result as string;
                                await handleCreateFeedPost('voice', base64Audio, res.duration);
                              };
                              reader.readAsDataURL(res.audioBlob);
                            }
                          }}
                          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sm cursor-pointer shrink-0 transition-all"
                          title="Post Simulated Voice Note"
                        >
                          <span>🎙️</span>
                        </button>

                        {/* Input field */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={feedText}
                            onChange={(e) => setFeedText(e.target.value)}
                            placeholder="Type broadcast update..."
                            className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                          />
                        </div>

                        {/* Send / Post action button */}
                        <button
                          onClick={() => {
                            if (feedImageFile) {
                              handleCreateFeedPost('image', feedImageFile);
                            } else if (feedText.trim()) {
                              handleCreateFeedPost('text', feedText.trim());
                            }
                          }}
                          disabled={isSubmitting || (!feedText.trim() && !feedImageFile)}
                          className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-xs cursor-pointer shrink-0 transition-all active:scale-90 disabled:opacity-50"
                        >
                          <span>➡️</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // If Following but NOT Creator:
                return (
                  <div className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
                      <span>🎉</span>
                      <span>You are following @{selectedFeed.creatorName}. Long press any post to react!</span>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
