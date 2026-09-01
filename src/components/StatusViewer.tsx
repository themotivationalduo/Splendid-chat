import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserStatus, User, STATUS_BACKGROUND_OPTIONS } from '../types';
import { 
  toggleLikeStatus, 
  markStatusAsViewed, 
  deleteUserStatus, 
  createOrGetFirestoreChat, 
  sendFirestoreMessage 
} from '../services/firestoreService';
import { saveStatusToIndexedDB } from '../services/indexedDBService';
import { playGlassChimeSound } from '../services/audioService';

interface StatusViewerProps {
  userId: string;
  userStatuses: UserStatus[];
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onReshareStatus?: (status: UserStatus) => void;
}

const QUICK_REACTION_EMOJIS = ['🔥', '❤️', '😂', '👏', '😍', '🙌', '😮', '🎉'];

export const StatusViewer: React.FC<StatusViewerProps> = ({
  userId,
  userStatuses,
  onClose,
  currentUser,
  allUsers,
  onReshareStatus
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isHoldPaused, setIsHoldPaused] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showHoldMenu, setShowHoldMenu] = useState(false);
  const [showViewsDrawer, setShowViewsDrawer] = useState(false);
  
  // Quick Reply states
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseStartTimeRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  const currentStatus = userStatuses[activeIndex];
  const isMyStatus = currentStatus?.userId === currentUser.id;
  const isOverallPaused = isHoldPaused || isManualPaused || isReplying || showHoldMenu || showViewsDrawer;

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  const handleNext = useCallback(() => {
    if (activeIndex < userStatuses.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [activeIndex, userStatuses.length, onClose]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    } else {
      setActiveIndex(0);
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  }, [activeIndex]);

  // Auto advance status timer (7 seconds standard duration for comfort & reading pace)
  useEffect(() => {
    if (!currentStatus || isOverallPaused) return;

    if (progress === 0) {
      startTimeRef.current = Date.now();
    }

    const isVoice = currentStatus.type === 'voice';
    const duration = isVoice 
      ? Math.max(7000, ((currentStatus.duration || 5) + 2) * 1000) 
      : 7000;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(progressIntervalRef.current!);
        handleNext();
      }
    }, 30);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [activeIndex, userId, isOverallPaused, currentStatus, progress, handleNext]);

  // Handle voice playback and overall status lifecycle
  useEffect(() => {
    if (!currentStatus) return;

    setProgress(0);
    startTimeRef.current = Date.now();
    setReplyText('');
    setIsReplying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingVoice(false);
    }
    setShowHoldMenu(false);
    setShowViewsDrawer(false);

    // Persist status into device IndexedDB upon viewing
    saveStatusToIndexedDB(currentStatus).catch(() => {});

    // Mark as viewed in Firestore
    if (!isMyStatus && !currentStatus.views?.includes(currentUser.id)) {
      markStatusAsViewed(currentStatus.id, currentUser.id, currentStatus).catch(console.error);
    }

    const isVoice = currentStatus.type === 'voice';
    if (isVoice && currentStatus.content) {
      const audio = new Audio(currentStatus.content);
      audioRef.current = audio;
      
      if (!isOverallPaused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlayingVoice(true))
            .catch(e => {
              if (e.name !== 'AbortError') console.error('Audio play error', e);
            });
        }
      }
      
      audio.onended = () => {
        setIsPlayingVoice(false);
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsPlayingVoice(false);
      }
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [activeIndex, userId]);

  // Handle Pause/Resume hold gestures
  const handleHoldStart = () => {
    if (isReplying || showHoldMenu || showViewsDrawer) return;
    setIsHoldPaused(true);
    pauseStartTimeRef.current = Date.now();
    if (audioRef.current) audioRef.current.pause();

    // Trigger hold menu for my statuses after 500ms
    if (isMyStatus) {
      holdTimerRef.current = setTimeout(() => {
        setShowHoldMenu(true);
      }, 500);
    }
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (showHoldMenu || showViewsDrawer || isManualPaused || isReplying) return;

    if (isHoldPaused && pauseStartTimeRef.current) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      startTimeRef.current += pauseDuration;
      setIsHoldPaused(false);
      if (audioRef.current && isPlayingVoice) {
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error('Audio play error', e);
        });
      }
    }
  };

  const toggleManualPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isManualPaused) {
      // Resume
      if (pauseStartTimeRef.current) {
        const pauseDuration = Date.now() - pauseStartTimeRef.current;
        startTimeRef.current += pauseDuration;
      }
      setIsManualPaused(false);
      if (audioRef.current && currentStatus?.type === 'voice') {
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error('Audio play error', e);
        });
      }
    } else {
      // Pause
      pauseStartTimeRef.current = Date.now();
      setIsManualPaused(true);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const closeMenus = () => {
    setShowHoldMenu(false);
    setShowViewsDrawer(false);
    if (pauseStartTimeRef.current && !isManualPaused && !isReplying) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      startTimeRef.current += pauseDuration;
      setIsHoldPaused(false);
      if (audioRef.current && isPlayingVoice) {
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error('Audio play error', e);
        });
      }
    }
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showHoldMenu || showViewsDrawer || isReplying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    // Left 30% clicks go previous, right 70% go next
    if (clickX < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this status?")) {
      await deleteUserStatus(currentStatus.id);
      handleNext();
    } else {
      closeMenus();
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStatus.type === 'text') {
      navigator.clipboard.writeText(currentStatus.content);
      showToast('📋 Status text copied to clipboard!');
    } else {
      const link = document.createElement('a');
      link.href = currentStatus.content;
      link.download = `status_${currentStatus.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('⬇️ Saved media download started');
    }
    closeMenus();
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleLikeStatus(currentStatus.id, currentUser.id);
    playGlassChimeSound('incoming');
  };

  // Quick Reply handler to send direct message to the status creator
  const handleSendReply = async (messageContent: string, isEmojiReaction = false) => {
    if (!messageContent.trim() || isSendingReply) return;

    // Resolve creator user
    const targetUser: User = allUsers.find(u => u.id === currentStatus.userId) || {
      id: currentStatus.userId,
      fullName: currentStatus.userFullName || 'User',
      username: currentStatus.userFullName?.toLowerCase().replace(/[@\s]/g, '') || 'user',
      phoneNumber: '',
      avatar: currentStatus.userAvatar || '👤',
      avatarType: 'emoji',
      status: 'online',
      createdAt: Date.now()
    };

    setIsSendingReply(true);
    try {
      // 1. Get or create 1-on-1 Firestore chat with creator
      const chat = await createOrGetFirestoreChat(currentUser, targetUser);

      // 2. Format reply content with status context snippet
      const statusSnippet = currentStatus.type === 'text'
        ? `Status: "${currentStatus.content.length > 40 ? currentStatus.content.slice(0, 40) + '...' : currentStatus.content}"`
        : (currentStatus.type === 'image' ? 'Status: 📷 Photo' : 'Status: 🎤 Voice Note');

      const formattedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      await sendFirestoreMessage(
        chat.id,
        {
          chatId: chat.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          senderAvatar: currentUser.avatar,
          content: messageContent.trim(),
          timestamp: formattedTimestamp,
          createdAt: Date.now(),
          status: 'sent',
          type: 'text',
          replyTo: {
            id: currentStatus.id,
            senderName: `${currentStatus.userFullName}'s Status`,
            content: statusSnippet,
            type: currentStatus.type,
            mediaUrl: currentStatus.type === 'image' ? currentStatus.content : undefined
          }
        },
        currentUser.id
      );

      // Play audio chime confirmation
      playGlassChimeSound('sent');

      // Feedback toast
      if (isEmojiReaction) {
        showToast(`✨ Sent ${messageContent} to ${currentStatus.userFullName}`);
      } else {
        showToast(`✓ Reply sent to ${currentStatus.userFullName}`);
      }

      setReplyText('');
      if (replyInputRef.current) {
        replyInputRef.current.blur();
      }
      setIsReplying(false);
    } catch (err: any) {
      console.error('Quick reply error:', err);
      showToast('❌ Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      handleSendReply(replyText.trim(), false);
    }
  };

  if (!currentStatus) return null;

  // Background style helper for text status
  const getGradientBackground = (status: UserStatus) => {
    if (status.backgroundColor) {
      const opt = STATUS_BACKGROUND_OPTIONS.find(b => b.id === status.backgroundColor);
      if (opt) return opt.class;
    }
    const statusId = status.id;
    const charCodeSum = statusId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const gradients = [
      'from-[#312e81] via-[#1e1b4b] to-[#020617]', // indigo/dark
      'from-[#581c87] via-[#3b0764] to-[#090514]', // purple
      'from-[#881337] via-[#4c0519] to-[#0d0205]', // rose/maroon
      'from-[#065f46] via-[#022c22] to-[#01140e]', // emerald
      'from-[#1e3a8a] via-[#172554] to-[#030712]', // blue
      'from-[#7c2d12] via-[#431407] to-[#0c0301]', // orange
    ];
    return gradients[charCodeSum % gradients.length];
  };

  const hasLiked = currentStatus.likes?.includes(currentUser.id);
  const viewsCount = currentStatus.views?.length || 0;
  const likesCount = currentStatus.likes?.length || 0;

  const getFullUsers = (userIds: string[]) => {
    return userIds.map(uid => allUsers.find(u => u.id === uid)).filter(Boolean) as User[];
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-75 select-none will-change-transform"
      style={{ willChange: 'transform' }}
    >
      <div 
        className="relative w-full max-w-lg h-full max-h-[100dvh] md:max-h-[88vh] md:rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between shadow-2xl bg-[#090b0f] will-change-transform"
        style={{ willChange: 'transform' }}
      >
        
        {/* Floating Success / Action Toast */}
        {toastMessage && (
          <div className="absolute top-20 inset-x-0 z-30 flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-2 fade-in duration-100">
            <div className="px-4 py-2 rounded-full bg-black/80 border border-blue-500/50 backdrop-blur-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2">
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Progress Bars Indicator */}
        <div className="absolute top-0 inset-x-0 z-20 px-3 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex gap-1.5 pointer-events-none">
          {userStatuses.map((_, idx) => {
            let widthPct = 0;
            if (idx < activeIndex) widthPct = 100;
            else if (idx === activeIndex) widthPct = progress;
            return (
              <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-75 ease-linear"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header */}
        <div 
          className="absolute top-5 inset-x-0 z-20 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-lg shadow-md shrink-0">
              {currentStatus.userAvatar || '👤'}
            </div>
            <div className="text-left truncate">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-100 truncate">{currentStatus.userFullName}</h4>
                {isOverallPaused && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    PAUSED
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pause / Resume Button */}
            <button
              type="button"
              onClick={toggleManualPause}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all border shadow-sm ${
                isManualPaused 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
              }`}
              title={isManualPaused ? 'Resume Status' : 'Pause Status'}
            >
              {isManualPaused ? '▶' : '❚❚'}
            </button>

            {/* Like button for quick interaction */}
            {!isMyStatus && (
              <button 
                type="button"
                onClick={handleLike}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all border shadow-sm ${
                  hasLiked 
                    ? 'bg-blue-500/25 text-blue-400 border-blue-500/50' 
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                }`}
                title={hasLiked ? 'Unlike' : 'Like'}
              >
                {hasLiked ? '❤️' : '🤍'}
              </button>
            )}

            {/* Save / Copy */}
            <button 
              type="button"
              onClick={handleSave}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 flex items-center justify-center text-xs transition-all"
              title="Save / Copy Status"
            >
              ⬇️
            </button>

            {/* Close */}
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-blue-500/40 text-slate-200 hover:text-white flex items-center justify-center transition-all border border-white/10 text-xs active:scale-90"
              title="Close Status"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Interactive Content Display Area */}
        <div 
          onClick={handleScreenClick}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          className="flex-1 w-full flex items-center justify-center relative cursor-pointer overflow-hidden"
        >
          {/* TEXT TYPE STATUS */}
          {currentStatus.type === 'text' && (
            <div className={`absolute inset-0 bg-gradient-to-tr ${getGradientBackground(currentStatus)} flex items-center justify-center p-6 text-center`}>
              <div className="max-w-md p-6 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-2xl shadow-2xl space-y-4">
                <p className="text-xl md:text-2xl font-extrabold text-white leading-relaxed whitespace-pre-wrap select-text selection:bg-blue-500/40">
                  {currentStatus.content}
                </p>
              </div>
            </div>
          )}

          {/* IMAGE TYPE STATUS */}
          {currentStatus.type === 'image' && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <img 
                src={currentStatus.content} 
                alt="Status" 
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* VOICE NOTE TYPE STATUS */}
          {currentStatus.type === 'voice' && (
            <div className={`absolute inset-0 bg-gradient-to-br ${getGradientBackground(currentStatus)} flex items-center justify-center p-6 text-center`}>
              <div className="w-full max-w-sm p-6 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col items-center space-y-5 select-none">
                <div className="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-4xl shadow-xl animate-pulse">
                  🎙️
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Voice Note Status</h4>
                  <p className="text-xs text-slate-400">Duration: {currentStatus.duration || 5}s</p>
                </div>
                {/* Visual pulsating bars */}
                <div className="flex items-center gap-1.5 h-6 justify-center">
                  {[...Array(12)].map((_, i) => {
                    const randomHeight = isPlayingVoice ? Math.floor(Math.random() * 16) + 4 : 4;
                    return (
                      <span 
                        key={i} 
                        className="w-1 rounded-full bg-blue-500 transition-all duration-100"
                        style={{ height: `${randomHeight}px` }}
                      />
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest animate-pulse">
                  {isPlayingVoice ? 'Now Playing Stream' : 'Audio Stream Loaded'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hold Menu (For My Status) */}
        {showHoldMenu && (
          <div 
            className="absolute inset-0 bg-black/75 z-40 flex flex-col items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#121418] border border-white/15 rounded-3xl p-5 w-72 space-y-2.5 animate-in zoom-in-95 shadow-2xl">
              <h4 className="text-slate-200 text-sm font-bold text-center mb-3">Status Options</h4>
              <button 
                onClick={handleSave} 
                className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                ⬇️ Save Status
              </button>
              <button 
                onClick={handleDelete} 
                className="w-full p-3 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 font-semibold flex items-center justify-center gap-2 border border-blue-500/30 transition-all active:scale-95"
              >
                🗑️ Delete Status
              </button>
              <button 
                onClick={closeMenus} 
                className="w-full p-3 rounded-2xl hover:bg-white/5 text-slate-400 font-semibold mt-1 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Views Drawer (For My Status) */}
        {showViewsDrawer && (
          <div 
            className="absolute bottom-0 inset-x-0 bg-[#121418] border-t border-white/15 rounded-t-3xl z-40 h-auto max-h-[75%] flex flex-col animate-in slide-in-from-bottom shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <h4 className="font-bold text-slate-200 flex gap-4 text-xs md:text-sm">
                <span>👁️ {viewsCount} Viewed</span>
                <span className="text-blue-400">❤️ {likesCount} Liked</span>
              </h4>
              <button 
                onClick={closeMenus} 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 active:scale-95"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2.5 custom-scrollbar flex-1 pb-10">
              {getFullUsers(currentStatus.views || []).map(u => (
                <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg shrink-0 border border-white/5 shadow-inner">
                    {u.avatar || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-200 truncate text-xs">{u.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">@{u.username}</p>
                  </div>
                  {currentStatus.likes?.includes(u.id) && (
                    <span className="text-blue-500 text-lg mr-2 animate-in zoom-in-50">❤️</span>
                  )}
                </div>
              ))}
              {viewsCount === 0 && (
                <p className="text-center text-slate-500 text-xs mt-4">No views yet.</p>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION & QUICK REPLY SECTION */}
        <div 
          className="relative inset-x-0 z-30 px-3.5 py-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-2 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* If NOT my status: Rich Quick Reply Interface */}
          {!isMyStatus ? (
            <div className="space-y-2 w-full">
              {/* Quick 1-Tap Emoji Reactions Bar */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
                {QUICK_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    disabled={isSendingReply}
                    onClick={() => handleSendReply(emoji, true)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-sm transition-all duration-75 hover:scale-110 active:scale-95 cursor-pointer shadow-sm shrink-0"
                    title={`Send ${emoji}`}
                  >
                    <span>{emoji}</span>
                  </button>
                ))}

                {/* Reshare button if allowed */}
                {currentStatus.allowReshare !== false && onReshareStatus && (
                  <button
                    type="button"
                    onClick={() => onReshareStatus(currentStatus)}
                    className="px-2.5 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] tracking-wider uppercase flex items-center gap-1 transition-all shrink-0 shadow-md shadow-blue-600/30"
                    title="Reshare Status"
                  >
                    <span>🔄 Reshare</span>
                  </button>
                )}
              </div>

              {/* Text Quick Reply Form */}
              <form onSubmit={handleTextSubmit} className="flex items-center gap-2 w-full">
                <div className="relative flex-1 flex items-center">
                  <input
                    ref={replyInputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => {
                      setIsReplying(true);
                      pauseStartTimeRef.current = Date.now();
                      if (audioRef.current) audioRef.current.pause();
                    }}
                    onBlur={() => {
                      setIsReplying(false);
                      if (pauseStartTimeRef.current && !isManualPaused) {
                        const pauseDuration = Date.now() - pauseStartTimeRef.current;
                        startTimeRef.current += pauseDuration;
                        if (audioRef.current && currentStatus?.type === 'voice') {
                          audioRef.current.play().catch(() => {});
                        }
                      }
                    }}
                    placeholder={`Reply to ${currentStatus.userFullName}...`}
                    className="w-full h-10 px-4 pr-10 rounded-full bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 backdrop-blur-xl shadow-inner transition-all"
                  />
                  {replyText && (
                    <button
                      type="button"
                      onClick={() => setReplyText('')}
                      className="absolute right-3 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className={`h-10 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-75 shadow-lg ${
                    replyText.trim() && !isSendingReply
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer active:scale-95'
                      : 'bg-white/10 text-slate-500 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  <span>{isSendingReply ? '...' : 'Send'}</span>
                  <span>➤</span>
                </button>
              </form>
            </div>
          ) : (
            /* If MY status: Views & Options Bar */
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHoldPaused(true);
                  pauseStartTimeRef.current = Date.now();
                  if (audioRef.current) audioRef.current.pause();
                  setShowViewsDrawer(true);
                }}
                className="px-4 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all backdrop-blur-xl shadow-lg active:scale-95"
              >
                <span>👁️ {viewsCount} Views</span>
                {likesCount > 0 && <span className="text-blue-400">❤️ {likesCount}</span>}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3.5 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>⬇️ Save</span>
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 h-10 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>🗑️ Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
