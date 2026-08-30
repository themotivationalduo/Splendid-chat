import React, { useState, useRef, useEffect } from 'react';
import { User, UserStatus, STATUS_BACKGROUND_OPTIONS, BroadcastFeed, BroadcastFeedPost } from '../types';
import { postUserStatus, createBroadcastFeed, postToBroadcastFeed, subscribeToBroadcastFeeds, subscribeToFeedPosts, followBroadcastFeed, unfollowBroadcastFeed, reactToBroadcastFeedPost, deleteBroadcastFeedPost } from '../services/firestoreService';
import { startRecording, stopRecording, cancelRecording, createSimulatedVoiceNote, RecordingResult } from '../services/audioService';

const BROADCAST_EMOJIS = ['📢', '🚀', '📰', '🔥', '💡', '💬', '🏆', '🎵', '🎒', '🛡️', '🌟', '💻', '🔮', '🎉', '✈️', '🍔', '🎨', '⚡', '🍿', '🌍', '📌', '❤️', '🍿', '🏁'];


interface UpdatesTabViewProps {
  currentUser: User;
  users: User[];
  activeStatuses: UserStatus[];
  onOpenStatusViewer: (userId: string, statuses: UserStatus[]) => void;
}

export const UpdatesTabView: React.FC<UpdatesTabViewProps> = ({
  currentUser,
  users,
  activeStatuses,
  onOpenStatusViewer
}) => {
  // Modal toggle states
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Status values
  const [textStatus, setTextStatus] = useState('');
  const [selectedBg, setSelectedBg] = useState('indigo');
  const [imageFileUrl, setImageFileUrl] = useState<string | null>(null);
  const [voiceResult, setVoiceResult] = useState<RecordingResult | null>(null);

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
  const [isFeedVoiceModalOpen, setIsFeedVoiceModalOpen] = useState(false);

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
        // Random visualizer bars for voice note recording feedback
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
      // Audio blobs are read as base64 URLs for seamless serverless transport
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
      // clear relevant field
      if (type === 'text') setFeedText('');
      if (type === 'image') setFeedImageFile(null);
    } catch (err) {
      console.error('Error posting to broadcast feed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="w-full px-4 py-4 space-y-5 pb-28 text-slate-100 select-none">
      
      {/* WhatsApp-style Horizontal Status Updates */}
      <div className="p-4 rounded-3xl mirror-glass-card border border-white/10 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Status Updates</h3>
          
          {/* Quick status creation shortcuts */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTextModalOpen(true)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/12 text-slate-200 hover:text-white flex items-center justify-center border border-white/5 transition-all text-xs cursor-pointer active:scale-90"
              title="Add text status"
            >
              <span>✏️</span>
            </button>
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/12 text-slate-200 hover:text-white flex items-center justify-center border border-white/5 transition-all text-xs cursor-pointer active:scale-90"
              title="Add image status"
            >
              <span>📷</span>
            </button>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/12 text-slate-200 hover:text-white flex items-center justify-center border border-white/5 transition-all text-xs cursor-pointer active:scale-90"
              title="Add voice note status"
            >
              <span>🎤</span>
            </button>
          </div>
        </div>

        {/* Horizontal scroll container */}
        <div className="flex items-start gap-4 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar snap-x select-none">
          {/* MY STATUS ITEM */}
          <div 
            onClick={() => {
              if (myStatuses.length > 0) {
                onOpenStatusViewer(currentUser.id, myStatuses);
              } else {
                setIsTextModalOpen(true);
              }
            }}
            className="flex flex-col items-center text-center space-y-1.5 min-w-[70px] max-w-[75px] shrink-0 snap-start cursor-pointer group"
          >
            <div className="relative shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-white/10 transition-transform group-hover:scale-105 active:scale-95 select-none">
              <span className="relative z-10">{currentUser.avatar || '👤'}</span>
              
              {/* Outer status indicator ring */}
              {myStatuses.length > 0 ? (
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500 scale-110 animate-pulse" />
              ) : (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-white text-[10px] font-bold">
                  +
                </div>
              )}
            </div>
            <div className="text-center w-full min-w-0">
              <h4 className="text-[11px] font-extrabold text-slate-200 truncate">My Status</h4>
              <p className="text-[9px] text-slate-400 font-medium truncate">
                {myStatuses.length > 0 ? `${myStatuses.length} updates` : 'Tap to add'}
              </p>
            </div>
          </div>

          {/* OTHERS STATUS ITEMS */}
          {otherUsersStatuses.map(([userId, statuses]) => {
            const mostRecent = statuses[0];
            const userContact = users.find((u) => u.id === userId);
            const displayName = userContact ? (userContact.fullName || userContact.username) : mostRecent.userFullName;
            const avatar = userContact ? userContact.avatar : mostRecent.userAvatar;

            return (
              <div
                key={userId}
                onClick={() => onOpenStatusViewer(userId, statuses)}
                className="flex flex-col items-center text-center space-y-1.5 min-w-[70px] max-w-[75px] shrink-0 snap-start cursor-pointer group"
              >
                <div className="relative shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-white/10 transition-transform group-hover:scale-105 active:scale-95 select-none">
                  <span className="relative z-10">{avatar || '👤'}</span>
                  <div className="absolute inset-0 rounded-full border-2 border-red-500 scale-110" />
                  
                  {/* Status count badge */}
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-600 border border-white/10 text-[8px] font-mono font-bold text-white shadow-md z-20">
                    {statuses.length}
                  </span>
                </div>
                <div className="text-center w-full min-w-0">
                  <h4 className="text-[11px] font-extrabold text-slate-200 truncate">{displayName}</h4>
                  <p className="text-[9px] text-slate-400 font-medium truncate">
                    {new Date(mostRecent.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}

          {otherUsersStatuses.length === 0 && (
            <div className="flex items-center text-slate-400 text-xs py-4 pl-2 font-medium">
              ✨ No other updates available
            </div>
          )}
        </div>
      </div>

      {/* 📢 Broadcast Feeds Dashboard Section */}
      <div className="space-y-3.5 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Broadcast Feeds</h3>
          <button
            onClick={() => setIsCreateFeedModalOpen(true)}
            className="px-3 py-1.5 rounded-full bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>Create Feed</span>
            <span>＋</span>
          </button>
        </div>

        {broadcastFeeds.length === 0 ? (
          <div className="p-8 rounded-3xl mirror-glass-card border border-white/10 text-center space-y-3.5 bg-white/[0.01]">
            <span className="text-3xl block animate-bounce">📢</span>
            <p className="text-sm font-bold text-slate-300">No Broadcast Feeds yet</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Create a custom broadcast feed channel where only you can post updates, or explore feeds posted by other creators.
            </p>
            <button
              onClick={() => setIsCreateFeedModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 active:scale-95 cursor-pointer transition-all"
            >
              Start Your First Feed
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {broadcastFeeds.map((feed) => {
              const isCreator = feed.creatorId === currentUser.id;
              return (
                <div
                  key={feed.id}
                  onClick={() => setSelectedFeed(feed)}
                  className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex flex-col justify-between space-y-3 transition-all cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                      {feed.avatar}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-100 group-hover:text-red-400 transition-colors truncate">{feed.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 font-medium leading-relaxed">{feed.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                    <span className="text-slate-400 font-bold">
                      {isCreator ? '👑 You (Creator)' : `By @${feed.creatorName}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-extrabold flex items-center gap-0.5">
                        👥 {feed.followers?.length || 0}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 font-mono font-medium">
                        {new Date(feed.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. CREATE TEXT STATUS MODAL */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-75">
          <form 
            onSubmit={handlePostTextStatus}
            className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-center"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Create Text Status</h3>
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
                  placeholder="What's on your mind? (type status...)"
                  maxLength={150}
                  rows={4}
                  required
                  className={`w-full p-6 rounded-2xl bg-gradient-to-tr ${selectedBgClass} border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 text-base font-bold text-center resize-none shadow-inner`}
                />
              );
            })()}

            {/* Background Color Selector dots */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Style</label>
              <div className="flex flex-wrap gap-2 justify-center py-1">
                {STATUS_BACKGROUND_OPTIONS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setSelectedBg(bg.id)}
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${bg.class} border transition-all flex items-center justify-center relative active:scale-90 cursor-pointer ${
                      selectedBg === bg.id ? 'border-white scale-110 ring-2 ring-red-500' : 'border-white/20 hover:scale-105'
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
              <span>Character limit</span>
              <span>{textStatus.length} / 150</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !textStatus.trim()}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Posting status...' : '🚀 Post Text Status'}
            </button>
          </form>
        </div>
      )}

      {/* 2. CREATE IMAGE STATUS MODAL */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-75">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Post Image Status</h3>
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
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 hover:border-red-500/40 transition-colors flex flex-col items-center justify-center gap-3 relative cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="text-3xl">🖼️</span>
                <p className="text-xs font-bold text-slate-300">Tap to upload / choose image</p>
                <p className="text-[10px] text-slate-500">Supports PNG, JPG, GIF</p>
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
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs shadow-lg transition-all"
                >
                  {isSubmitting ? 'Posting status...' : '🚀 Publish Photo'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CREATE VOICE STATUS MODAL */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-75">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Record Voice Status</h3>
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
                <div className="w-20 h-20 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center text-3xl shadow-lg relative">
                  {isRecording && (
                    <span className="absolute inset-0 rounded-full bg-red-500/20 border border-red-500 animate-ping" />
                  )}
                  🎙️
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-300">
                    {isRecording ? 'Now Recording...' : 'Tap below to record status'}
                  </p>
                  {isRecording && (
                    <p className="text-[11px] text-red-400 font-mono">
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
                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                      >
                        Start Recording
                      </button>
                      <button
                        onClick={handleSimulateVoiceRecord}
                        className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/15"
                      >
                        Demo Voice Status
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleStopVoiceRecord}
                      className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
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
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs"
                  >
                    {isSubmitting ? 'Posting...' : '🚀 Post Voice Status'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CREATE BROADCAST FEED MODAL */}
      {isCreateFeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-75">
          <form 
            onSubmit={handleCreateFeedSubmit}
            className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-red-400 uppercase tracking-wider">Create Broadcast Feed</h3>
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
                          ? 'bg-red-600/30 border-red-500 scale-110' 
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
                  placeholder="e.g., Daily Tech Insights"
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Description</label>
                <textarea
                  value={feedDescription}
                  onChange={(e) => setFeedDescription(e.target.value)}
                  placeholder="What is this channel about? Only you can post here."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 resize-none leading-relaxed font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !feedName.trim()}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
            >
              {isSubmitting ? 'Creating...' : '🚀 Create Feed'}
            </button>
          </form>
        </div>
      )}

      {/* 5. BROADCAST FEED DETAILED VIEWER MODAL */}
      {selectedFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-in fade-in duration-100">
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

              {/* Follow / Unfollow controls and Follower counts (visible to everyone) */}
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
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {selectedFeed.followers?.includes(currentUser.id) ? 'Unfollow' : 'Follow'}
                  </button>
                ) : (
                  <span className="text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
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
                      <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider text-red-400">Content Locked</h4>
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
                                    hasReacted ? 'bg-red-500/25 border border-red-500/30' : ''
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

                        {/* Header */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm shrink-0">{post.creatorAvatar}</span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-extrabold text-slate-300 truncate">{post.creatorName}</p>
                          </div>
                        </div>

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
                                        ? 'bg-red-500/20 border-red-500 text-red-200 shadow' 
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
                            className="text-red-400 hover:text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10"
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
                            className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-bold"
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
                          className="w-9 h-9 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs cursor-pointer shrink-0 transition-all active:scale-90 disabled:opacity-50"
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
