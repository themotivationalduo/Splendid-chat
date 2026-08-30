import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { UserManagementBar } from './components/UserManagementBar';
import { ChatList } from './components/ChatList';
import { ChatSkeleton } from './components/ChatSkeleton';
import { ChatRoom } from './components/ChatRoom';
import { FloatingGlassNavBar } from './components/FloatingGlassNavBar';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthModal } from './components/AuthModal';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { MediaLightbox } from './components/MediaLightbox';
import { CallsTabView } from './components/CallsTabView';
import { ActiveCallModal } from './components/ActiveCallModal';
import { StartNewChatModal } from './components/StartNewChatModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { ForwardMessageModal } from './components/ForwardMessageModal';
import { UpdatesTabView } from './components/UpdatesTabView';
import { StatusViewer } from './components/StatusViewer';

import { Chat, Message, User, PushNotification, TabType, FilterType, CallLog, WALLPAPER_OPTIONS, CallSession, UserStatus } from './types';
import {
  getLocalUser,
  saveLocalUser,
  clearLocalSession,
  subscribeToUserChats,
  subscribeToChatMessages,
  sendFirestoreMessage,
  createOrGetFirestoreChat,
  subscribeToCallLogs,
  logCallRecord,
  updateUserProfile,
  normalizePhoneNumber,
  subscribeToUserNotifications,
  markAllUserNotificationsAsReadInFirestore,
  clearUserNotificationsInFirestore,
  subscribeToChatTyping,
  updateChatTypingStatus,
  toggleMessageReaction,
  deleteFirestoreMessage,
  markChatMessagesAsRead,
  registerFirebaseUser,
  forwardFirestoreMessage,
  subscribeToUsers,
  updateUserPresence,
  togglePinMessage,
  autoCleanupExpiredMediaForUser,
  saveChatDraft,
  createCallSession,
  updateCallStatus,
  subscribeToIncomingCalls,
  subscribeToCallSession,
  subscribeToActiveStatuses,
  postUserStatus
} from './services/firestoreService';
import { playGlassChimeSound, RecordingResult } from './services/audioService';

export default function App() {
  // Application State
  const [currentUser, setCurrentUser] = useState<User | null>(getLocalUser());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('splendid_chat_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('splendid_chat_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light', 'light-theme');
      document.documentElement.classList.remove('dark', 'dark-theme');
    } else {
      document.documentElement.classList.add('dark', 'dark-theme');
      document.documentElement.classList.remove('light', 'light-theme');
    }
  }, [theme]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeChatMessages, setActiveChatMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/users' || path === '/contacts' || path === '/people') return 'users';
    if (path === '/calls' || path === '/call') return 'calls';
    if (path === '/settings' || path === '/config' || path === '/profile') return 'settings';
    
    const params = new URLSearchParams(window.location.search);
    const viewQuery = params.get('view')?.toLowerCase() || params.get('tab')?.toLowerCase() || window.location.hash.toLowerCase().replace('#', '');
    if (viewQuery === 'users' || viewQuery === 'contacts') return 'users';
    if (viewQuery === 'calls' || viewQuery === 'call') return 'calls';
    if (viewQuery === 'settings' || viewQuery === 'profile') return 'settings';
    
    return 'chats';
  });
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerTypingName, setPeerTypingName] = useState('');

  // Modals & Overlays
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isStartNewChatOpen, setIsStartNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/profile') return true;
    const params = new URLSearchParams(window.location.search);
    const viewQuery = params.get('view')?.toLowerCase() || params.get('tab')?.toLowerCase() || window.location.hash.toLowerCase().replace('#', '');
    return viewQuery === 'profile';
  });
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(!currentUser);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<{ url: string; caption?: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ chat: Chat; isVideo: boolean } | null>(null);
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [incomingCallSession, setIncomingCallSession] = useState<CallSession | null>(null);
  const [inAppToast, setInAppToast] = useState<PushNotification | null>(null);

  // Statuses State
  const [activeStatuses, setActiveStatuses] = useState<UserStatus[]>([]);
  const [activeStatusViewer, setActiveStatusViewer] = useState<{ userId: string; statuses: UserStatus[] } | null>(null);

  // 600ms Splash Screen state
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 600);
    return () => clearTimeout(splashTimer);
  }, []);

  // Web Share Target & Native App Integration States
  const [sharedContent, setSharedContent] = useState<string | null>(null);
  const [showSharedToast, setShowSharedToast] = useState(false);

  // Parse share target parameters on launch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('share_title') || params.get('title');
    const text = params.get('share_text') || params.get('text');
    const url = params.get('share_url') || params.get('url');

    if (title || text || url) {
      let combined = '';
      if (title) combined += `${title}\n`;
      if (text) combined += `${text}\n`;
      if (url) combined += url;

      const trimmed = combined.trim();
      if (trimmed) {
        setSharedContent(trimmed);
        setShowSharedToast(true);
        playGlassChimeSound();
        console.log('[Share Target] Shared content captured:', trimmed);
      }
      
      // Clear share params from the browser address bar cleanly
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Sync current user session
  useEffect(() => {
    saveLocalUser(currentUser);
    if (!currentUser) {
      setIsAuthOpen(true);
    }
  }, [currentUser]);

  // Synchronize state changes back to the browser's URL path (virtual routing)
  useEffect(() => {
    let targetPath = '/chat';
    let targetSearch = '';

    if (isProfileOpen) {
      targetPath = '/profile';
    } else if (selectedChat) {
      targetPath = `/chat/${selectedChat.id}`;
    } else {
      if (activeTab === 'chats') targetPath = '/chat';
      else if (activeTab === 'users') targetPath = '/users';
      else if (activeTab === 'calls') targetPath = '/calls';
      else if (activeTab === 'settings') targetPath = '/settings';
    }

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;

    if (currentPath !== targetPath || currentSearch !== targetSearch) {
      window.history.pushState(
        { tab: activeTab, profileOpen: isProfileOpen, chatId: selectedChat?.id || null },
        '',
        targetPath + targetSearch
      );
    }
  }, [activeTab, isProfileOpen, selectedChat?.id]);

  // Synchronize URL path back to state on browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const params = new URLSearchParams(window.location.search);
      const viewQuery = params.get('view')?.toLowerCase() || params.get('tab')?.toLowerCase();
      const hash = window.location.hash.toLowerCase().replace('#', '');
      const idQuery = params.get('id') || params.get('chatid');

      let targetTab: TabType = 'chats';
      let targetProfileOpen = false;
      let targetChatId: string | null = null;

      if (path === '/chat' || path === '/chats') {
        targetTab = 'chats';
      } else if (path.startsWith('/chat/')) {
        targetTab = 'chats';
        const parts = window.location.pathname.split('/');
        if (parts[2]) targetChatId = parts[2];
      } else if (path === '/users' || path === '/contacts' || path === '/people') {
        targetTab = 'users';
      } else if (path === '/calls' || path === '/call') {
        targetTab = 'calls';
      } else if (path === '/settings' || path === '/config') {
        targetTab = 'settings';
      } else if (path === '/profile') {
        targetTab = 'settings';
        targetProfileOpen = true;
      } else {
        const view = viewQuery || hash;
        if (view === 'chats' || view === 'chat') targetTab = 'chats';
        else if (view === 'users' || view === 'contacts') targetTab = 'users';
        else if (view === 'calls' || view === 'call') targetTab = 'calls';
        else if (view === 'settings' || view === 'profile') {
          targetTab = 'settings';
          if (view === 'profile') targetProfileOpen = true;
        }
      }

      if (idQuery) targetChatId = idQuery;

      setActiveTab(targetTab);
      setIsProfileOpen(targetProfileOpen);

      if (targetChatId) {
        const matchedChat = chats.find(c => c.id === targetChatId);
        if (matchedChat) setSelectedChat(matchedChat);
      } else {
        setSelectedChat(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [chats]);

  // Auto-select chat from URL path/query when chats are loaded
  useEffect(() => {
    if (chats.length === 0) return;
    
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const idQuery = params.get('id') || params.get('chatid');
    
    let targetChatId: string | null = null;
    if (path.startsWith('/chat/')) {
      const parts = path.split('/');
      if (parts[2]) targetChatId = parts[2];
    } else if (idQuery) {
      targetChatId = idQuery;
    }

    if (targetChatId) {
      const matchedChat = chats.find(c => c.id === targetChatId);
      if (matchedChat && (!selectedChat || selectedChat.id !== targetChatId)) {
        setSelectedChat(matchedChat);
      }
    }
  }, [chats, selectedChat?.id]);

  // Real-time Presence Management (Online / Offline / Heartbeat)
  useEffect(() => {
    if (!currentUser) return;

    updateUserPresence(currentUser.id, 'online', 'Active now');

    const handleBeforeUnload = () => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      updateUserPresence(currentUser.id, 'offline', `Last seen today at ${timeStr}`);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        updateUserPresence(currentUser.id, 'away', `Last seen today at ${timeStr}`);
      } else {
        updateUserPresence(currentUser.id, 'online', 'Active now');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const heartbeat = setInterval(() => {
      updateUserPresence(currentUser.id, 'online', 'Active now');
    }, 45000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeat);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      updateUserPresence(currentUser.id, 'offline', `Last seen today at ${timeStr}`);
    };
  }, [currentUser?.id]);

  // Automatic background cleanup for expired media, stickers, emojis & GIFs
  useEffect(() => {
    if (!currentUser?.id) return;
    autoCleanupExpiredMediaForUser(currentUser.id);
    const cleanupInterval = setInterval(() => {
      autoCleanupExpiredMediaForUser(currentUser.id);
    }, 60000); // Check and purge expired media automatically every 60s
    return () => clearInterval(cleanupInterval);
  }, [currentUser?.id]);

  // Real-time Firestore Users list for contacts and directory
  useEffect(() => {
    const unsubscribe = subscribeToUsers((users) => {
      setAllUsers(users);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Active Statuses list
  useEffect(() => {
    const unsubscribe = subscribeToActiveStatuses((statuses) => {
      setActiveStatuses(statuses);
    });
    return () => unsubscribe();
  }, []);

  // Handle active status reshare action
  const handleReshareStatus = async (status: UserStatus) => {
    if (!currentUser) return;
    try {
      const isReshareAllowed = currentUser.allowReshare !== false;
      await postUserStatus(
        currentUser,
        status.type,
        status.content,
        status.duration,
        status.backgroundColor,
        isReshareAllowed
      );
      playGlassChimeSound();
      setInAppToast({
        id: `toast_${Date.now()}`,
        title: 'Status Reshared! 🔄',
        body: `You reshared ${status.userFullName}'s status update.`,
        timestamp: 'Just now',
        isRead: false,
        type: 'system'
      });
      setActiveStatusViewer(null);
    } catch (err) {
      console.error('Error resharing status:', err);
    }
  };

  // Real-time Firestore subscription for User Chats
  useEffect(() => {
    if (!currentUser) return;
    setIsLoadingSkeleton(true);

    const unsubscribe = subscribeToUserChats(currentUser.id, currentUser.phoneNumber, (firestoreChats) => {
      setChats(firestoreChats);
      setIsLoadingSkeleton(false);

      // Keep selected chat in sync if updated
      setSelectedChat((prevSelected) => {
        if (!prevSelected) return null;
        return firestoreChats.find(c => c.id === prevSelected.id) || prevSelected;
      });
    });

    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.phoneNumber]);

  // Real-time Firestore subscription for active Chat Messages & Read Status
  useEffect(() => {
    if (!selectedChat || !currentUser) {
      setActiveChatMessages([]);
      return;
    }

    // Mark unread messages from other user as read in real time
    markChatMessagesAsRead(selectedChat.id, currentUser.id);

    const unsubscribe = subscribeToChatMessages(selectedChat.id, (messages) => {
      setActiveChatMessages(messages);
      markChatMessagesAsRead(selectedChat.id, currentUser.id);
    });

    return () => unsubscribe();
  }, [selectedChat?.id, currentUser?.id]);

  // Real-time Firestore typing indicator listener
  useEffect(() => {
    if (!selectedChat || !currentUser) {
      setIsPeerTyping(false);
      setPeerTypingName('');
      return;
    }

    const unsubscribe = subscribeToChatTyping(selectedChat.id, currentUser.id, (typing, name) => {
      setIsPeerTyping(typing);
      setPeerTypingName(name || '');
    });

    return () => unsubscribe();
  }, [selectedChat?.id, currentUser?.id]);

  // Real-time Firestore Call Logs
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToCallLogs(currentUser.id, (calls) => {
      setCallLogs(calls);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Real-time Incoming Call Signaling subscription
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToIncomingCalls(currentUser.id, (call) => {
      setIncomingCallSession(call);
      if (call) {
        // Play ringtone on incoming call
        playGlassChimeSound('incoming');
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Real-time Active Call status listener (handles peer status changes)
  useEffect(() => {
    if (!activeCallSession?.id) return;

    const unsubscribe = subscribeToCallSession(activeCallSession.id, (call) => {
      if (!call) {
        setActiveCall(null);
        setActiveCallSession(null);
        return;
      }

      if (call.status === 'declined' || call.status === 'ended') {
        setActiveCall(null);
        setActiveCallSession(null);
        playGlassChimeSound('incoming');
      } else if (call.status === 'accepted' && activeCallSession.status !== 'accepted') {
        setActiveCallSession(call);
      }
    });

    return () => unsubscribe();
  }, [activeCallSession?.id]);

  // Real-time Firestore Notifications listener
  useEffect(() => {
    if (!currentUser) return;

    let initialLoaded = false;
    const unsubscribe = subscribeToUserNotifications(currentUser.id, (notifList) => {
      // If a new notification arrives while user is active, alert with chime & glass banner
      if (initialLoaded && notifList.length > 0) {
        const newest = notifList[0];
        if (!newest.isRead) {
          playGlassChimeSound('incoming');
          setInAppToast(newest);
          setTimeout(() => setInAppToast(null), 5000);
        }
      }
      initialLoaded = true;
      setNotifications(notifList);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Handle Search and Filter logic for Chats
  const filteredChats = useMemo(() => {
    let result = chats;

    // Filter by tab / category
    if (activeFilter === 'unread') {
      result = result.filter(c => (c.unreadCount && c.unreadCount > 0) || !c.lastMessage?.isRead);
    } else if (activeFilter === 'read') {
      result = result.filter(c => (!c.unreadCount || c.unreadCount === 0) && c.lastMessage?.isRead);
    } else if (activeFilter === 'pinned') {
      result = result.filter(c => c.isPinned);
    }

    // Search query matching across chats
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/^@/, '');
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.phoneNumber && c.phoneNumber.includes(q)) ||
        (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q)) ||
        (c.participant?.phoneNumber && c.participant.phoneNumber.includes(q)) ||
        (c.participant?.username && c.participant.username.toLowerCase().includes(q))
      );
    }

    return result;
  }, [chats, activeFilter, searchQuery]);

  // Contacts Search matching across all registered platform users
  const matchedContacts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().replace(/^@/, '');
    const cleanDigits = normalizePhoneNumber(searchQuery);

    return allUsers.filter(u => {
      if (currentUser && u.id === currentUser.id) return false;
      const uUsername = (u.username || '').toLowerCase();
      const uFullName = (u.fullName || '').toLowerCase();
      const uPhone = normalizePhoneNumber(u.phoneNumber);

      return (
        uUsername.includes(q) ||
        uFullName.includes(q) ||
        (cleanDigits && (uPhone.includes(cleanDigits) || uPhone.endsWith(cleanDigits))) ||
        (u.phoneNumber && u.phoneNumber.includes(q))
      );
    });
  }, [allUsers, searchQuery, currentUser]);

  // Counts for pills
  const counts = useMemo(() => {
    const unread = chats.filter(c => (c.unreadCount && c.unreadCount > 0) || !c.lastMessage?.isRead).length;
    const pinned = chats.filter(c => c.isPinned).length;
    return {
      all: chats.length,
      unread: unread,
      read: Math.max(0, chats.length - unread),
      pinned: pinned
    };
  }, [chats]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Send real Firestore message (Text, Image, Voice, File)
  const handleSendMessage = async (
    content: string,
    type: 'text' | 'image' | 'voice' | 'file' = 'text',
    mediaUrl?: string,
    mediaMeta?: any,
    replyTo?: any
  ) => {
    if (!selectedChat || !currentUser) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const senderDisplay = currentUser.username ? `@${currentUser.username}` : (currentUser.fullName || 'User');
    
    try {
      await sendFirestoreMessage(
        selectedChat.id,
        {
          chatId: selectedChat.id,
          senderId: currentUser.id,
          senderName: senderDisplay,
          senderAvatar: currentUser.avatar,
          content,
          text: content,
          timestamp,
          createdAt: Date.now(),
          status: 'sent',
          type,
          mediaUrl,
          mediaMeta,
          replyTo
        } as any,
        currentUser.id
      );
    } catch (err) {
      console.error('Error sending message to Firestore:', err);
    }
  };

  // Voice note recorded
  const handleSendVoiceNote = (result: RecordingResult) => {
    handleSendMessage('🎤 Voice Note', 'voice', result.audioUrl, {
      duration: result.duration,
      waveData: result.waveData
    });
  };

  // Chat Actions
  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
    }
  };

  const handleTogglePin = (chatId: string) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
  };

  // Open User Profile Modal (Phone & Username Display)
  const handleOpenUserProfile = (user: User) => {
    setSelectedUserProfile(user);
    setIsUserProfileModalOpen(true);
  };

  // Contact Creation & Start Chat with real Firestore
  const handleStartChatWithUser = async (targetUser: User) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const realChat = await createOrGetFirestoreChat(currentUser, targetUser);
      setSelectedChat(realChat);
      setActiveTab('chats');
    } catch (err) {
      console.error('Error starting chat in Firestore:', err);
    }
  };

  const handleAddNewContact = async (fullName: string, username: string, phoneNumber: string, avatar: string) => {
    if (!currentUser) return;
    try {
      const regRes = await registerFirebaseUser(
        fullName,
        username || fullName.toLowerCase().replace(/[@\s]/g, '_'),
        phoneNumber,
        '000000',
        avatar || '👤'
      );
      if (regRes.user) {
        await handleStartChatWithUser(regRes.user);
      }
    } catch (e) {
      console.error('Error registering new contact in Firestore:', e);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedChat || !currentUser) return;
    updateChatTypingStatus(
      selectedChat.id,
      currentUser.id,
      currentUser.username ? `@${currentUser.username}` : (currentUser.fullName || 'User'),
      isTyping
    );
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedChat || !currentUser) return;
    await toggleMessageReaction(selectedChat.id, messageId, emoji, currentUser.id);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChat) return;
    await deleteFirestoreMessage(selectedChat.id, messageId);
  };

  const handleOpenForward = (msg: Message) => {
    setMessageToForward(msg);
    setIsForwardOpen(true);
  };

  const handleConfirmForward = async (targetChatIds: string[]) => {
    if (!messageToForward || !currentUser) return;
    try {
      playGlassChimeSound('sent');
      await forwardFirestoreMessage(messageToForward, targetChatIds, currentUser);
      setIsForwardOpen(false);
      setMessageToForward(null);
    } catch (err) {
      console.error('Error forwarding message:', err);
    }
  };

  const handleStartCall = async (chat: Chat, isVideo: boolean) => {
    if (!currentUser) return;
    
    try {
      // Create Call Session document in Firestore for signaling
      const callId = await createCallSession(currentUser, chat.participant?.id || '', isVideo);
      
      const sess: CallSession = {
        id: callId,
        callerId: currentUser.id,
        callerName: currentUser.fullName || currentUser.username || 'User',
        callerAvatar: currentUser.avatar,
        receiverId: chat.participant?.id || '',
        isVideo,
        status: 'ringing',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setActiveCall({ chat, isVideo });
      setActiveCallSession(sess);

      // Add real call log to Firestore
      const newLog: CallLog = {
        id: `call_${Date.now()}`,
        chatId: chat.id,
        callerId: currentUser.id,
        receiverId: chat.participant?.id || '',
        name: chat.name,
        avatar: chat.avatar,
        type: 'outgoing',
        timestamp: 'Just now',
        duration: 'Ongoing',
        isVideo,
        createdAt: Date.now()
      } as any;

      await logCallRecord(newLog);
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const handleLogout = () => {
    clearLocalSession();
    setCurrentUser(null);
    setSelectedChat(null);
    setIsAuthOpen(true);
  };

  return (
    <div className={`min-h-screen animated-gradient-bg ${theme === 'light' ? 'light-theme text-black' : 'dark-theme text-slate-100'} font-['Plus_Jakarta_Sans',sans-serif] flex flex-col relative overflow-x-hidden selection:bg-red-500/30 selection:text-red-200`}>
      {/* 300ms Rotating Splash Screen Overlay */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0c10] select-none pointer-events-auto transition-opacity duration-300">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Elegant rotating mirror glass app icon container */}
            <div className="w-24 h-24 rounded-3xl mirror-glass border border-red-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-spin">
              <img 
                src="/icon-192.png" 
                alt="Splendid Chat Logo" 
                className="w-16 h-16 rounded-2xl pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col items-center space-y-1 text-center">
              <h1 className="text-lg font-black tracking-widest bg-gradient-to-r from-red-500 via-rose-500 to-red-600 bg-clip-text text-transparent">
                SPLENDID CHAT
              </h1>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-red-500/60 font-mono">
                Splendid Experience
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Push Notification Glass Toast */}
      {inAppToast && (
        <div
          onClick={() => {
            if (inAppToast.chatId) {
              const target = chats.find(c => c.id === inAppToast.chatId);
              if (target) setSelectedChat(target);
            }
            setInAppToast(null);
          }}
          className="fixed top-4 inset-x-4 max-w-sm mx-auto z-50 p-3 rounded-2xl mirror-glass border border-red-500/30 shadow-2xl flex items-center gap-3 cursor-pointer animate-in slide-in-from-top duration-75 hover:scale-[1.02] transition-transform select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center font-bold text-lg shrink-0">
            {inAppToast.avatar || '💬'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 truncate">{inAppToast.title}</span>
              <span className="text-[10px] text-red-400 font-semibold uppercase">Alert</span>
            </div>
            <p className="text-xs text-slate-300 truncate">{inAppToast.body}</p>
          </div>
        </div>
      )}

      {/* Web Share Target Shared Content Glass Banner */}
      {showSharedToast && sharedContent && (
        <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50 p-4 rounded-2xl mirror-glass border border-emerald-500/30 shadow-2xl animate-in slide-in-from-top duration-300 select-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-lg shadow-inner shrink-0">
                📥
              </div>
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">Shared Content Received</h4>
                <p className="text-xs text-slate-200 mt-1 line-clamp-2 italic font-medium">"{sharedContent}"</p>
              </div>
            </div>
            <button
              onClick={() => setShowSharedToast(false)}
              className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-all active:scale-95"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3.5 justify-end">
            <button
              onClick={() => {
                setShowSharedToast(false);
              }}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sharedContent);
                if (selectedChat && currentUser) {
                  // Pre-fill active chat room using cached draft
                  saveChatDraft(selectedChat.id, currentUser.id, sharedContent);
                  alert("Use Shared Content: Active chat draft updated successfully! Please re-open the chat or paste directly.");
                } else {
                  alert("Use Shared Content: Copied directly to your device clipboard! Select a chat and paste it.");
                }
                setShowSharedToast(false);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1 shadow-md"
            >
              <span>📋</span> Use Shared Content
            </button>
          </div>
        </div>
      )}

      {/* Primary Header - hidden when in ChatRoom */}
      {!selectedChat && (
        <Header
          currentUser={currentUser}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          theme={theme}
          onOpenStartNewChat={() => setIsStartNewChatOpen(true)}
        />
      )}

      {/* Main Content Area based on Active Tab - hidden when in ChatRoom */}
      {!selectedChat && (
        <main className="flex-1 flex flex-col w-full max-w-xl mx-auto pt-16 pb-28 px-1 sm:px-3 min-w-0">
          {/* Chats Tab */}
          <div className={activeTab === 'chats' ? 'block w-full animate-in fade-in duration-75' : 'hidden'}>
            {/* Contacts & Conversations Search Bar */}
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search contacts (@username, phone) or chats..."
            />

            {/* If searching contacts, show live Contact Search Results */}
            {searchQuery.trim() && (
              <div className="w-full px-4 pt-1 pb-2 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                    <span>👥</span>
                    <span>Contacts Directory Results ({matchedContacts.length})</span>
                  </span>
                </div>

                {matchedContacts.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1.5 rounded-2xl bg-black/40 border border-white/10">
                    {matchedContacts.map(user => (
                      <div
                        key={user.id}
                        onClick={() => handleStartChatWithUser(user)}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-xl mirror-glass-input border border-white/10 flex items-center justify-center text-sm shrink-0 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenUserProfile(user);
                            }}
                            title="View Profile Info"
                          >
                            {user.avatar || '👤'}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                              @{user.username}
                            </h5>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {user.fullName} • 📱 {user.phoneNumber}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenUserProfile(user)}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center justify-center"
                            title="View Contact Info"
                          >
                            ℹ️
                          </button>
                          <button
                            onClick={() => handleStartChatWithUser(user)}
                            className="px-2.5 py-1 rounded-lg bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                          >
                            <span>💬</span>
                            <span>Chat</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400">
                    No contacts matching "@{searchQuery.replace(/^@/, '')}". Try phone number or name.
                  </div>
                )}
              </div>
            )}

            {/* Filter Pills */}
            <UserManagementBar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={counts}
              isUserManagementOpen={isUserManagementOpen}
              onToggleUserManagement={() => setIsUserManagementOpen(true)}
              onOpenStartNewChat={() => setIsStartNewChatOpen(true)}
            />

            {/* Skeleton Loading State or Chat List */}
            {isLoadingSkeleton ? (
              <ChatSkeleton />
            ) : (
              <ChatList
                chats={filteredChats}
                selectedChatId={selectedChat?.id || null}
                onSelectChat={handleSelectChat}
                onDeleteChat={handleDeleteChat}
                onTogglePin={handleTogglePin}
                onOpenNewChat={() => setIsStartNewChatOpen(true)}
                onOpenUserProfile={handleOpenUserProfile}
                activeStatuses={activeStatuses}
                onOpenStatusViewer={(userId, statuses) => {
                  setActiveStatusViewer({ userId, statuses });
                }}
              />
            )}

            {/* Floating Action Button for Start New Chat */}
            <button
              id="fab-start-new-chat"
              onClick={() => setIsStartNewChatOpen(true)}
              className="fixed bottom-24 right-5 sm:right-[calc(50%-200px)] z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-2xl shadow-red-600/40 border border-white/20 backdrop-blur-xl transition-all active:scale-95 select-none animate-in fade-in zoom-in-95 animate-fab-idle group"
              title="Find Contact & Chat"
            >
              <span className="text-base group-hover:scale-110 transition-transform">💬➕</span>
              <span className="tracking-wide">New Chat</span>
            </button>
          </div>

          {/* Contacts Tab */}
          <div className={activeTab === 'users' ? 'block w-full animate-in fade-in duration-75' : 'hidden'}>
            <div className="w-full px-4 py-4 space-y-4 pb-28">
              {/* Search contacts inside contacts tab */}
              <SearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="Search contacts by @username, phone, or name..."
              />

              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registered Contacts ({allUsers.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStartNewChatOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-1.5"
                  >
                    <span>🔍</span>
                    <span>Find Contact</span>
                  </button>
                  <button
                    onClick={() => setIsUserManagementOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs transition-all flex items-center gap-1"
                  >
                    <span>➕</span>
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {allUsers.length === 0 ? (
                <div className="p-8 rounded-3xl mirror-glass-card border border-white/10 text-center space-y-3">
                  <div className="text-3xl">👥</div>
                  <h4 className="text-sm font-bold text-slate-100">No contacts yet</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Add contacts with their @username and phone number to start instant chat conversations and voice calls in real-time.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setIsStartNewChatOpen(true)}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold shadow-md shadow-red-600/30"
                    >
                      💬 Find Contact
                    </button>
                    <button
                      onClick={() => setIsUserManagementOpen(true)}
                      className="px-4 py-2 rounded-full bg-white/10 text-slate-200 text-xs font-bold border border-white/10"
                    >
                      ➕ Add Contact
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {allUsers
                    .filter(u => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase().replace(/^@/, '');
                      return (
                        (u.username && u.username.toLowerCase().includes(q)) ||
                        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
                        (u.phoneNumber && u.phoneNumber.includes(q))
                      );
                    })
                    .map((user) => {
                      const isSelf = currentUser ? user.id === currentUser.id : false;
                      const displayUsername = `@${(user.username || user.fullName).replace(/^@/, '')}`;

                      return (
                        <div
                          key={user.id}
                          onClick={() => handleOpenUserProfile(user)}
                          className={`p-3 rounded-2xl mirror-glass-card border flex items-center justify-between gap-3 cursor-pointer transition-all select-none ${
                            isSelf ? 'border-red-500/30 bg-red-950/20' : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {(() => {
                              const userStatuses = activeStatuses.filter(s => s.userId === user.id);
                              const hasStatus = userStatuses.length > 0;

                              return (
                                <div 
                                  onClick={(e) => {
                                    if (hasStatus) {
                                      e.stopPropagation();
                                      setActiveStatusViewer({ userId: user.id, statuses: userStatuses });
                                    }
                                  }}
                                  className={`relative w-11 h-11 rounded-2xl mirror-glass-input border flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-sm ${
                                    hasStatus 
                                      ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#121418] border-red-500/30' 
                                      : 'border-white/10'
                                  }`}
                                  title={hasStatus ? "Click to view Status update" : "Contact avatar"}
                                >
                                  {user.avatar || '👤'}
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121418] ${
                                      user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                                    }`}
                                  />
                                </div>
                              );
                            })()}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-bold text-slate-100 truncate">
                                  {displayUsername}
                                </h4>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-mono truncate">
                                {user.fullName} • 📱 {user.phoneNumber}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenUserProfile(user)}
                              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center text-sm"
                              title="View Contact Info"
                            >
                              ℹ️
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => handleStartChatWithUser(user)}
                                className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <span>💬</span>
                                <span>Chat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Updates Tab */}
          <div className={activeTab === 'updates' ? 'block w-full animate-in fade-in duration-75' : 'hidden'}>
            {currentUser && (
              <UpdatesTabView
                currentUser={currentUser}
                users={allUsers}
                activeStatuses={activeStatuses}
                onOpenStatusViewer={(userId, statuses) => {
                  setActiveStatusViewer({ userId, statuses });
                }}
              />
            )}
          </div>

          {/* Calls Tab */}
          <div className={activeTab === 'calls' ? 'block w-full animate-in fade-in duration-75' : 'hidden'}>
            <CallsTabView
              chats={chats}
              callLogs={callLogs}
              onStartCall={handleStartCall}
              onOpenContacts={() => setIsUserManagementOpen(true)}
            />
          </div>

          {/* Settings Tab */}
          <div className={activeTab === 'settings' ? 'block w-full animate-in fade-in duration-75 text-slate-100' : 'hidden'}>
            <div className="w-full px-4 py-4 space-y-4 pb-28">
            {currentUser ? (
              <div className="p-5 rounded-3xl mirror-glass-card border border-white/10 space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white text-2xl ring-2 ring-red-500/40 shadow-lg">
                    {currentUser.avatar || '👤'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">@{currentUser.username}</h3>
                    <p className="text-xs text-slate-400">{currentUser.fullName} • 📱 {currentUser.phoneNumber}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Online</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setIsProfileOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>✏️</span>
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setIsNotificationsOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🔔</span>
                    <span>Alerts</span>
                  </button>
                </div>

                {/* Theme Toggle in Settings Tab */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-200">App Theme</div>
                      <div className="text-[10px] text-slate-400">
                        {theme === 'dark' ? 'Dark Mode' : 'Light Glass Mode'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    }`}
                  >
                    <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
                  </button>
                </div>

                {/* Chat Room Wallpaper Selector in Settings Tab */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🖼️</span>
                      <div>
                        <div className="text-xs font-bold text-slate-200">Chat Room Wallpaper</div>
                        <div className="text-[10px] text-slate-400">
                          Choose from 10 abstract gradient & emoji themes
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {WALLPAPER_OPTIONS.map((wp) => {
                      const isSelected = (currentUser.wallpaper || 'midnight') === wp.id;
                      return (
                        <button
                          key={wp.id}
                          type="button"
                          onClick={async () => {
                            if (currentUser) {
                              const updated = await updateUserProfile(currentUser.id, { wallpaper: wp.id });
                              if (updated) setCurrentUser(updated);
                            }
                          }}
                          className={`p-2 rounded-xl text-left transition-all flex items-center gap-2 ${wp.class} ${
                            isSelected ? 'ring-2 ring-red-500 shadow-md scale-[1.01]' : 'opacity-75 hover:opacity-100 border border-white/10'
                          }`}
                        >
                          <span className="text-base shrink-0">
                            {wp.id === 'starry' ? '✨' : wp.id === 'hearts' ? '❤️' : wp.id === 'nature' ? '🍃' : '🎨'}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-white truncate">{wp.name}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>Switch / Register Account</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-2xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="p-8 rounded-3xl mirror-glass-card border border-white/10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto text-2xl">
                  👤
                </div>
                <h4 className="text-sm font-bold text-slate-100">Sign in to your account</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Access your real-time chats, messages, and calls across any device.
                </p>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-600/30 active:scale-95"
                >
                  🚀 Sign In / Register
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    )}

      {/* Floating Bottom Navigation Bar */}
      {!selectedChat && (
        <FloatingGlassNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadMessagesCount={counts.unread}
        />
      )}

      {/* Active Chat Room View */}
      {selectedChat && currentUser && (
        <ChatRoom
          chat={selectedChat}
          currentUser={currentUser}
          messages={activeChatMessages}
          onBack={() => setSelectedChat(null)}
          onSendMessage={handleSendMessage}
          onOpenLightbox={(url, caption) => setActiveLightboxImage({ url, caption })}
          onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)}
          onStartCall={handleStartCall}
          onTyping={handleTyping}
          onToggleReaction={handleToggleReaction}
          onDeleteMessage={handleDeleteMessage}
          onOpenForward={handleOpenForward}
          onOpenProfile={handleOpenUserProfile}
          onTogglePin={async (msg) => {
            if (selectedChat) {
              await togglePinMessage(selectedChat.id, msg);
            }
          }}
          isPeerTyping={isPeerTyping}
          peerTypingName={peerTypingName}
        />
      )}

      {/* User Information Modal (Phone Number, Username, Status, Quick Actions) */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => {
          setIsUserProfileModalOpen(false);
          setSelectedUserProfile(null);
        }}
        user={selectedUserProfile}
        onStartChat={(user) => {
          handleStartChatWithUser(user);
          setIsUserProfileModalOpen(false);
        }}
        onStartVoiceCall={async (user) => {
          if (!currentUser) return;
          const chat = await createOrGetFirestoreChat(currentUser, user);
          handleStartCall(chat, false);
          setIsUserProfileModalOpen(false);
        }}
        onStartVideoCall={async (user) => {
          if (!currentUser) return;
          const chat = await createOrGetFirestoreChat(currentUser, user);
          handleStartCall(chat, true);
          setIsUserProfileModalOpen(false);
        }}
      />

      {/* Modals and Overlays */}
      <ForwardMessageModal
        isOpen={isForwardOpen}
        onClose={() => {
          setIsForwardOpen(false);
          setMessageToForward(null);
        }}
        message={messageToForward}
        chats={chats}
        users={allUsers}
        currentUser={currentUser || ({} as User)}
        onForward={handleConfirmForward}
      />

      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={async () => {
          if (currentUser) {
            await markAllUserNotificationsAsReadInFirestore(currentUser.id);
          }
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }}
        onClearAll={async () => {
          if (currentUser) {
            await clearUserNotificationsInFirestore(currentUser.id);
          }
          setNotifications([]);
        }}
        onSelectChat={(chatId) => {
          const target = chats.find(c => c.id === chatId);
          if (target) handleSelectChat(target);
        }}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onAddNewContact={handleAddNewContact}
        onStartChatWithUser={handleStartChatWithUser}
        onOpenUserProfile={handleOpenUserProfile}
      />

      <StartNewChatModal
        isOpen={isStartNewChatOpen}
        onClose={() => setIsStartNewChatOpen(false)}
        currentUser={currentUser}
        onStartChatWithUser={handleStartChatWithUser}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        currentUser={currentUser || { id: '', fullName: '', username: '', phoneNumber: '', avatar: '👤', status: 'online', createdAt: Date.now() }}
        allUsers={allUsers}
        onGroupCreated={(newChatId) => {
          const target = chats.find(c => c.id === newChatId);
          if (target) {
            setSelectedChat(target);
          }
        }}
      />

      {currentUser && (
        <ProfileSettingsModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onUpdateUser={async (updated) => {
            const neu = { ...currentUser, ...updated };
            setCurrentUser(neu);
            saveLocalUser(neu);
            await updateUserProfile(currentUser.id, updated);
          }}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          if (currentUser) setIsAuthOpen(false);
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          saveLocalUser(user);
          setIsAuthOpen(false);
        }}
      />

      <VoiceRecorderModal
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onSendVoice={handleSendVoiceNote}
      />

      <MediaLightbox
        imageUrl={activeLightboxImage?.url || null}
        caption={activeLightboxImage?.caption}
        onClose={() => setActiveLightboxImage(null)}
      />

      {/* Real-time Incoming Call Overlay (Mirror Glass Style) */}
      {incomingCallSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-75">
          <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/10 shadow-2xl flex flex-col items-center justify-between min-h-[360px] text-center select-none">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 inline-flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>INCOMING {incomingCallSession.isVideo ? 'VIDEO' : 'AUDIO'} CALL</span>
              </span>
              <p className="text-xs text-slate-400 font-medium pt-1">Ringing...</p>
            </div>

            <div className="my-6 flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border-2 border-red-500/40 flex items-center justify-center text-4xl shadow-2xl animate-bounce">
                  {incomingCallSession.callerAvatar || '👤'}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-white">{incomingCallSession.callerName}</h3>
                <p className="text-xs text-slate-400">Calling you in splendid HD...</p>
              </div>
            </div>

            {/* Answer & Decline Controls */}
            <div className="w-full flex items-center justify-center gap-4">
              {/* Decline Button */}
              <button
                type="button"
                onClick={async () => {
                  await updateCallStatus(incomingCallSession.id, 'declined');
                  setIncomingCallSession(null);
                }}
                className="flex-1 h-12 rounded-2xl bg-rose-600/25 border border-rose-500/40 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>📵</span>
                <span>Decline</span>
              </button>

              {/* Accept Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateCallStatus(incomingCallSession.id, 'accepted');
                    
                    // Create virtual chat or find existing chat
                    const existingChat = chats.find(c => c.participant?.id === incomingCallSession.callerId);
                    const virtualChat: Chat = existingChat || {
                      id: `virtual_${incomingCallSession.callerId}`,
                      name: incomingCallSession.callerName,
                      avatar: incomingCallSession.callerAvatar,
                      avatarType: 'emoji',
                      status: 'online',
                      unreadCount: 0,
                      participant: {
                        id: incomingCallSession.callerId,
                        fullName: incomingCallSession.callerName,
                        username: incomingCallSession.callerName.toLowerCase(),
                        avatar: incomingCallSession.callerAvatar,
                        phoneNumber: '',
                        status: 'online',
                        createdAt: Date.now()
                      },
                      lastMessage: { text: '', timestamp: '', senderId: '', isRead: true },
                      createdAt: Date.now()
                    };

                    setActiveCall({
                      chat: virtualChat,
                      isVideo: incomingCallSession.isVideo
                    });
                    
                    setActiveCallSession(incomingCallSession);
                    setIncomingCallSession(null);

                    // Add dynamic call log to incoming user's log as well
                    const newLog: CallLog = {
                      id: `call_${Date.now()}`,
                      chatId: virtualChat.id,
                      callerId: incomingCallSession.callerId,
                      receiverId: currentUser.id,
                      name: incomingCallSession.callerName,
                      avatar: incomingCallSession.callerAvatar,
                      type: 'incoming',
                      timestamp: 'Just now',
                      duration: 'Ongoing',
                      isVideo: incomingCallSession.isVideo,
                      createdAt: Date.now()
                    } as any;
                    await logCallRecord(newLog);

                  } catch (err) {
                    console.error('Error accepting call:', err);
                  }
                }}
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>📞</span>
                <span>Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ActiveCallModal
        chat={activeCall?.chat || null}
        isVideo={activeCall?.isVideo || false}
        status={activeCallSession?.status || 'ringing'}
        onEndCall={async () => {
          if (activeCallSession) {
            await updateCallStatus(activeCallSession.id, 'ended');
          }
          setActiveCall(null);
          setActiveCallSession(null);
        }}
      />

      {/* Active Status Viewer Overlay Modal */}
      {activeStatusViewer && currentUser && (
        <StatusViewer
          userId={activeStatusViewer.userId}
          userStatuses={activeStatusViewer.statuses}
          currentUser={currentUser}
          onClose={() => setActiveStatusViewer(null)}
          onReshareStatus={handleReshareStatus}
        />
      )}
    </div>
  );
}
