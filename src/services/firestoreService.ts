import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, arrayUnion, arrayRemove,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  storage,
  ref,
  deleteObject,
  uploadBytes,
  getDownloadURL
} from './firebase';
import { User, Chat, Message, CallLog, PushNotification, CallSession, UserStatus, BroadcastFeed, BroadcastFeedPost, CallSignal } from '../types';
import { 
  saveMessageToIndexedDB, 
  updateMessageInIndexedDB,
  getMessagesFromIndexedDB, 
  deleteMessageFromIndexedDB, 
  clearChatMessagesFromIndexedDB,
  saveChatToIndexedDB,
  getChatsFromIndexedDB,
  saveMediaBlobToIndexedDB,
  saveStatusToIndexedDB,
  getStatusesFromIndexedDB,
  deleteStatusFromIndexedDB
} from './indexedDBService';
import { peerService } from './peerService';

export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    return obj;
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = cleanFirestoreData(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '');
}

// ----------------- USER AUTH & PROFILES (FIRESTORE) ----------------- //

export async function checkUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<{ available: boolean; cleanUsername: string; message: string }> {
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  if (!cleanUsername) {
    return { available: false, cleanUsername: '', message: 'Username cannot be empty.' };
  }
  if (cleanUsername.length < 3) {
    return { available: false, cleanUsername, message: 'Username must be at least 3 characters long.' };
  }
  if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
    return { available: false, cleanUsername, message: 'Username can only contain letters, numbers, and underscores.' };
  }

  try {
    const usersRef = collection(db, 'users');
    const userQ = query(usersRef, where('username', '==', cleanUsername));
    const snap = await getDocs(userQ);

    let isTaken = false;
    if (!snap.empty) {
      if (excludeUserId) {
        isTaken = snap.docs.some((docSnap) => docSnap.id !== excludeUserId);
      } else {
        isTaken = true;
      }
    }

    if (isTaken) {
      return {
        available: false,
        cleanUsername,
        message: `Username @${cleanUsername} is already registered to another user.`
      };
    }

    return {
      available: true,
      cleanUsername,
      message: `Username @${cleanUsername} is available!`
    };
  } catch (err) {
    console.error('Check username error:', err);
    return { available: false, cleanUsername, message: 'Unable to check username availability.' };
  }
}

export async function registerFirebaseUser(
  fullName: string,
  username: string,
  phoneNumber: string,
  passcode: string,
  customAvatar?: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const cleanPhone = normalizePhoneNumber(phoneNumber);
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    if (!cleanPhone || cleanPhone.length < 5) {
      return { success: false, error: 'Please enter a valid phone number.' };
    }
    if (!passcode || passcode.length !== 6 || !/^\d{6}$/.test(passcode)) {
      return { success: false, error: 'Passcode must be exactly 6 digits.' };
    }
    if (!fullName.trim()) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!cleanUsername) {
      return { success: false, error: 'Please enter a valid username.' };
    }

    // Check if phone already registered in Firestore
    const usersRef = collection(db, 'users');
    const phoneQ = query(usersRef, where('normalizedPhone', '==', cleanPhone));
    const phoneSnap = await getDocs(phoneQ);
    if (!phoneSnap.empty) {
      return { success: false, error: 'An account with this phone number already exists. Please log in.' };
    }

    // Check username taken against all registered users
    const usernameStatus = await checkUsernameAvailable(cleanUsername);
    if (!usernameStatus.available) {
      return { success: false, error: usernameStatus.message };
    }

    const defaultAvatars = ['👤', '🌟', '🚀', '💎', '🔥', '⚡', '👑', '🎯', '🌸', '🦊'];
    const chosenAvatar = customAvatar || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser: User = {
      id: userId,
      fullName: fullName.trim(),
      username: cleanUsername,
      phoneNumber: phoneNumber.trim(),
      passcode,
      avatar: chosenAvatar,
      avatarType: 'emoji',
      status: 'online',
      lastSeen: 'Active now',
      bio: 'Hey there! I am using SPLENDID CHAT.',
      createdAt: Date.now()
    };

    // Save to Firestore
    await setDoc(doc(db, 'users', userId), {
      ...newUser,
      normalizedPhone: cleanPhone,
      updatedAt: Date.now()
    });

    // Cache local session
    saveLocalUser(newUser);

    return { success: true, user: newUser };
  } catch (err: any) {
    console.error('Firebase register error:', err);
    return { success: false, error: err.message || 'Failed to register account with Firebase.' };
  }
}

export async function loginFirebaseUser(
  phoneNumber: string,
  passcode: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const cleanPhone = normalizePhoneNumber(phoneNumber);
    if (!cleanPhone) {
      return { success: false, error: 'Please enter your phone number.' };
    }
    if (!passcode || passcode.length !== 6) {
      return { success: false, error: 'Please enter your 6-digit passcode.' };
    }

    const usersRef = collection(db, 'users');
    const phoneQ = query(usersRef, where('normalizedPhone', '==', cleanPhone));
    const snap = await getDocs(phoneQ);

    if (snap.empty) {
      return { success: false, error: 'No registered account found with this phone number. Please register.' };
    }

    const userData = snap.docs[0].data() as User;
    if (userData.passcode !== passcode) {
      return { success: false, error: 'Incorrect 6-digit passcode. Please try again.' };
    }

    const updatedUser: User = {
      ...userData,
      status: 'online',
      lastSeen: 'Active now'
    };

    // Update status in Firestore
    await updateDoc(doc(db, 'users', updatedUser.id), {
      status: 'online',
      lastSeen: 'Active now',
      updatedAt: Date.now()
    });

    saveLocalUser(updatedUser);
    return { success: true, user: updatedUser };
  } catch (err: any) {
    console.error('Firebase login error:', err);
    return { success: false, error: err.message || 'Failed to sign in.' };
  }
}

export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const updatePayload: any = {
      ...updates,
      updatedAt: Date.now()
    };
    if (updates.username) {
      const cleanU = updates.username.toLowerCase().replace(/^@/, '');
      const checkRes = await checkUsernameAvailable(cleanU, userId);
      if (!checkRes.available) {
        throw new Error(checkRes.message);
      }
      updatePayload.username = cleanU;
    }
    await updateDoc(userRef, updatePayload);

    // Propagate username, name, and avatar updates automatically to all chats where this user is a participant
    const chatsRef = collection(db, 'chats');
    const chatsSnap = await getDocs(chatsRef);
    const batchPromises = chatsSnap.docs.map(async (chatDocSnap) => {
      const chatData = chatDocSnap.data();
      const pIds: string[] = chatData.participantIds || [];
      if (pIds.includes(userId)) {
        const chatDocRef = doc(db, 'chats', chatDocSnap.id);
        const updatesMap: any = {};

        if (chatData.participantsMap && chatData.participantsMap[userId]) {
          updatesMap[`participantsMap.${userId}`] = {
            ...chatData.participantsMap[userId],
            ...updates
          };
        }

        if (chatData.participant && chatData.participant.id === userId) {
          const updatedPeer = { ...chatData.participant, ...updates };
          updatesMap.participant = updatedPeer;
          if (updates.username) {
            const cleanU = updates.username.toLowerCase().replace(/^@/, '');
            updatesMap.username = cleanU;
            updatesMap.name = `@${cleanU}`;
          }
          if (updates.avatar) {
            updatesMap.avatar = updates.avatar;
          }
        }

        if (Object.keys(updatesMap).length > 0) {
          await updateDoc(chatDocRef, updatesMap).catch(() => {});
        }
      }
    });

    await Promise.all(batchPromises);

    const current = getLocalUser();
    if (current && current.id === userId) {
      const updated = { ...current, ...updates };
      if (updates.username) {
        updated.username = updates.username.toLowerCase().replace(/^@/, '');
      }
      saveLocalUser(updated);
      return updated;
    }
    return null;
  } catch (e) {
    console.error('Update profile error:', e);
    return null;
  }
}

export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  const usersRef = collection(db, 'users');
  return onSnapshot(usersRef, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as User;
      const presence = calculateUserPresence(data);
      users.push({
        ...data,
        status: presence.status,
        lastSeen: presence.lastSeen
      });
    });
    callback(users);
  }, (err) => {
    console.warn('Firestore users subscription error:', err);
  });
}

export function subscribeToUserPresence(userId: string, callback: (presence: { status: 'online' | 'away' | 'offline'; lastSeen: string; isOnline: boolean }) => void): () => void {
  if (!userId) {
    callback({ status: 'offline', lastSeen: 'Offline', isOnline: false });
    return () => {};
  }
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const presence = calculateUserPresence(data);
      callback({
        status: presence.status,
        lastSeen: presence.lastSeen,
        isOnline: presence.status === 'online'
      });
    } else {
      callback({ status: 'offline', lastSeen: 'Offline', isOnline: false });
    }
  }, (err) => {
    console.warn(`Firestore user presence subscription error for ${userId}:`, err);
  });
}

export function calculateUserPresence(userDoc: any): { status: 'online' | 'away' | 'offline'; lastSeen: string } {
  if (!userDoc) {
    return { status: 'offline', lastSeen: 'Offline' };
  }

  const rawStatus = userDoc.status;
  const updatedAt = userDoc.updatedAt || 0;
  const now = Date.now();

  // If user doc doesn't have an explicit status or if rawStatus is 'offline', return offline
  if (!rawStatus || rawStatus === 'offline') {
    return {
      status: 'offline',
      lastSeen: userDoc.lastSeen && userDoc.lastSeen !== 'Active now' ? userDoc.lastSeen : 'Last seen recently'
    };
  }

  // Active heartbeats are sent every 30-45 seconds.
  // If no heartbeat/update for > 75 seconds (1.25 min), force offline
  if (updatedAt > 0 && (now - updatedAt > 75000)) {
    const minutesAgo = Math.floor((now - updatedAt) / 60000);
    const lastSeenStr = minutesAgo > 60 
      ? 'Last seen recently' 
      : `Last seen ${minutesAgo}m ago`;
    return {
      status: 'offline',
      lastSeen: userDoc.lastSeen && userDoc.lastSeen !== 'Active now' ? userDoc.lastSeen : lastSeenStr
    };
  }

  return {
    status: rawStatus as 'online' | 'away' | 'offline',
    lastSeen: userDoc.lastSeen || (rawStatus === 'online' ? 'Active now' : 'Last seen recently')
  };
}

// ----------------- REAL-TIME CHATS (FIRESTORE) ----------------- //

export function subscribeToUserChats(userId: string, userPhone: string, callback: (chats: Chat[]) => void): () => void {
  const chatsRef = collection(db, 'chats');
  const usersRef = collection(db, 'users');
  const cleanPhone = normalizePhoneNumber(userPhone);

  // 1. Initial render from IndexedDB for instant UI loading
  getChatsFromIndexedDB().then((cachedChats) => {
    if (cachedChats && cachedChats.length > 0) {
      callback(cachedChats);
    }
  }).catch(() => {});

  let latestChatsSnap: any = null;
  let latestUsersMap: Record<string, any> = {};
  const activeMessageUnsubs: Record<string, () => void> = {};

  const processAndEmitChats = () => {
    if (!latestChatsSnap) return;

    const chats: Chat[] = [];
    const activeChatIds = new Set<string>();

    latestChatsSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      const pIds: string[] = data.participantIds || [];
      const pPhones = (data.participantPhones || []).map((p: string) => normalizePhoneNumber(p));

      // Include if current user is participant
      if (pIds.includes(userId) || (cleanPhone && pPhones.includes(cleanPhone)) || data.participantsMap?.[userId] || data.creatorId === userId) {
        activeChatIds.add(docSnap.id);
        const userDraft = data.drafts?.[userId]?.text || getCachedChatDraft(docSnap.id, userId) || undefined;

        const otherId = pIds.find((id: string) => id !== userId);
        const liveUserDoc = otherId ? latestUsersMap[otherId] : null;

        // Resolve other participant from usersMap or participantsMap or fallback
        let peer: User;
        if (liveUserDoc) {
          peer = liveUserDoc as User;
        } else if (data.participantsMap && otherId && data.participantsMap[otherId]) {
          peer = data.participantsMap[otherId];
        } else {
          peer = data.participant;
        }

        if (!peer) {
          peer = {
            id: otherId || 'other',
            fullName: data.name || 'User',
            username: data.name?.toLowerCase().replace(/[@\s]/g, '') || 'user',
            phoneNumber: pPhones.find((p: string) => p !== cleanPhone) || '',
            avatar: data.avatar || '👤',
            avatarType: 'emoji',
            status: 'offline',
            lastSeen: 'Offline',
            createdAt: Date.now()
          };
        }

        const isGroup = data.isGroup || false;
        const presence = isGroup
          ? { status: 'online' as const, lastSeen: 'Active now' }
          : calculateUserPresence(liveUserDoc || peer);

        const peerUsername = peer.username || peer.fullName?.toLowerCase().replace(/[@\s]/g, '') || 'user';
        const displayChatName = isGroup 
          ? (data.name || 'Group Chat') 
          : `@${peerUsername.replace(/^@/, '')}`;

        const updatedPeer: User = {
          ...peer,
          status: presence.status,
          lastSeen: presence.lastSeen
        };

        const chatObj: Chat = {
          id: docSnap.id,
          name: displayChatName,
          username: peerUsername,
          phoneNumber: peer.phoneNumber,
          avatar: data.avatar || peer.avatar || '👤',
          avatarType: data.avatarType || peer.avatarType || 'emoji',
          status: presence.status,
          lastSeen: presence.lastSeen,
          draft: userDraft,
          isGroup: isGroup,
          creatorId: data.creatorId || '',
          groupMembers: data.groupMembers || [],
          isPinned: data.pinned || data.isPinned || false,
          pinOrder: data.pinOrder || 0,
          isMuted: data.muted || data.isMuted || false,
          unreadCount: data.unreadCount || 0,
          createdAt: data.createdAt || Date.now(),
          participant: updatedPeer,
          disappearingMode: data.disappearingMode || false,
          description: data.description || (data.isGroup ? '' : peer.bio) || '',
          bubbleColor: data.bubbleColor,
          accentColor: data.accentColor,
          lastMessage: {
            text: data.lastMessageText || 'No messages yet',
            timestamp: data.lastMessageTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            senderId: data.lastMessageSenderId || '',
            isRead: data.lastMessageIsRead !== false,
            type: data.lastMessageType || 'text'
          }
        };

        chats.push(chatObj);
        saveChatToIndexedDB(chatObj).catch(() => {});

        // Maintain background delivery queue listener for this chat
        if (!activeMessageUnsubs[docSnap.id]) {
          const msgsRef = collection(db, 'chats', docSnap.id, 'messages');
          activeMessageUnsubs[docSnap.id] = onSnapshot(msgsRef, async (msgSnap) => {
            if (msgSnap.empty) return;
            for (const msgDoc of msgSnap.docs) {
              const d = msgDoc.data();
              // ONLY process if sent by recipient (d.senderId !== userId)
              if (d.senderId && d.senderId !== userId) {
                let finalMediaUrl = d.mediaUrl;
                const isMedia = d.type === 'image' || d.type === 'voice' || d.type === 'file' || !!d.mediaUrl || isExpiringMediaOrStickerOrEmoji(d);
                if (d.mediaUrl && (d.mediaUrl.includes('firebasestorage.googleapis.com') || d.mediaUrl.includes('temp_media'))) {
                  try {
                    const res = await fetch(d.mediaUrl);
                    const blob = await res.blob();
                    finalMediaUrl = await saveMediaBlobToIndexedDB(msgDoc.id, blob, d.mediaMeta?.mimeType);
                    const fileRef = ref(storage, d.mediaUrl);
                    deleteObject(fileRef).catch(() => {});
                  } catch (e) {}
                }

                const msgObj: Message = {
                  id: msgDoc.id,
                  chatId: docSnap.id,
                  senderId: d.senderId,
                  senderName: d.senderName || 'User',
                  senderAvatar: d.senderAvatar || '👤',
                  content: d.content || d.text || '',
                  timestamp: d.timestamp || '',
                  createdAt: d.createdAt || Date.now(),
                  expiresAt: d.expiresAt || ((d.createdAt || Date.now()) + MEDIA_EXPIRATION_MS),
                  isExpired: false,
                  status: 'delivered',
                  type: d.type || 'text',
                  mediaUrl: finalMediaUrl,
                  mediaMeta: d.mediaMeta,
                  replyTo: d.replyTo,
                  reactions: d.reactions || {}
                };

                await saveMessageToIndexedDB(msgObj);
                if (isMedia) {
                  deleteDoc(doc(db, 'chats', docSnap.id, 'messages', msgDoc.id)).catch(() => {});
                }

                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('splendid-incoming-message', {
                    detail: { chatId: docSnap.id, message: msgObj }
                  }));
                }
              }
            }
          }, () => {});
        }
      }
    });

    // Cleanup unsubscriptions for deleted chats
    Object.keys(activeMessageUnsubs).forEach(cId => {
      if (!activeChatIds.has(cId)) {
        activeMessageUnsubs[cId]();
        delete activeMessageUnsubs[cId];
      }
    });

    // Sort by pinned (and pinOrder) then most recent
    chats.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) {
        return (a.pinOrder || 0) - (b.pinOrder || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    callback(chats);
  };

  const unsubUsers = onSnapshot(usersRef, (usersSnap) => {
    const map: Record<string, any> = {};
    usersSnap.forEach((uDoc) => {
      map[uDoc.id] = uDoc.data();
    });
    latestUsersMap = map;
    processAndEmitChats();
  }, (err) => {
    console.warn('Firestore users snapshot error in chats sub:', err);
  });

  const unsubChats = onSnapshot(chatsRef, (snapshot) => {
    latestChatsSnap = snapshot;
    processAndEmitChats();
  }, (err) => {
    console.warn('Firestore chats subscription error:', err);
  });

  // Re-check presence every 20s to catch users going offline due to missed heartbeats (>75s)
  const timer = setInterval(() => {
    processAndEmitChats();
  }, 20000);

  return () => {
    unsubUsers();
    unsubChats();
    clearInterval(timer);
    Object.values(activeMessageUnsubs).forEach(unsub => unsub());
  };
}

export async function createOrGetFirestoreChat(
  currentUser: User,
  targetUser: User
): Promise<Chat> {
  const normCurrent = normalizePhoneNumber(currentUser.phoneNumber);
  const normTarget = normalizePhoneNumber(targetUser.phoneNumber);

  // Deterministic 1-on-1 chat ID
  const sortedIds = [currentUser.id, targetUser.id].sort();
  const deterministicChatId = `chat_${sortedIds[0]}_${sortedIds[1]}`;

  const chatDocRef = doc(db, 'chats', deterministicChatId);
  const chatSnap = await getDoc(chatDocRef);

  const targetUsername = targetUser.username || targetUser.fullName.toLowerCase().replace(/[@\s]/g, '');
  const targetDisplayName = `@${targetUsername.replace(/^@/, '')}`;

  if (chatSnap.exists()) {
    const data = chatSnap.data();
    // Update participantsMap to ensure freshest usernames and avatars
    await updateDoc(chatDocRef, {
      [`participantsMap.${currentUser.id}`]: currentUser,
      [`participantsMap.${targetUser.id}`]: targetUser,
      updatedAt: Date.now()
    }).catch(() => {});

    return {
      id: deterministicChatId,
      name: targetDisplayName,
      username: targetUsername,
      phoneNumber: targetUser.phoneNumber,
      avatar: targetUser.avatar || '👤',
      avatarType: targetUser.avatarType || 'emoji',
      status: targetUser.status || 'online',
      lastSeen: targetUser.lastSeen || 'Active now',
      isGroup: false,
      isPinned: data.pinned || data.isPinned || false,
      pinOrder: data.pinOrder || 0,
      isMuted: data.muted || data.isMuted || false,
      unreadCount: 0,
      participant: targetUser,
      createdAt: data.createdAt || Date.now(),
      lastMessage: {
        text: data.lastMessageText || 'Chat ready. Say hello!',
        timestamp: data.lastMessageTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        senderId: data.lastMessageSenderId || currentUser.id,
        isRead: true,
        type: data.lastMessageType || 'text'
      }
    };
  }

  // Create new Chat doc
  const newChatData = {
    id: deterministicChatId,
    name: targetDisplayName,
    username: targetUsername,
    avatar: targetUser.avatar || '👤',
    avatarType: targetUser.avatarType || 'emoji',
    isGroup: false,
    participantIds: [currentUser.id, targetUser.id],
    participantPhones: [normCurrent, normTarget],
    participantsMap: {
      [currentUser.id]: currentUser,
      [targetUser.id]: targetUser
    },
    participant: targetUser,
    lastMessageText: 'New chat started. Say hello!',
    lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    lastMessageSenderId: currentUser.id,
    lastMessageType: 'text',
    lastMessageIsRead: true,
    pinned: false,
    muted: false,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await setDoc(chatDocRef, newChatData);

  return {
    id: deterministicChatId,
    name: targetDisplayName,
    username: targetUsername,
    phoneNumber: targetUser.phoneNumber,
    avatar: targetUser.avatar || '👤',
    avatarType: targetUser.avatarType || 'emoji',
    status: targetUser.status || 'online',
    lastSeen: targetUser.lastSeen || 'Active now',
    isGroup: false,
    unreadCount: 0,
    participant: targetUser,
    createdAt: Date.now(),
    lastMessage: {
      text: 'New chat started. Say hello!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      senderId: currentUser.id,
      isRead: true,
      type: 'text'
    }
  };
}

// ----------------- REAL-TIME MESSAGES (FIRESTORE) ----------------- //

export const MEDIA_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 Hours in Milliseconds

export function isExpiringMediaOrStickerOrEmoji(data: any): boolean {
  if (data.type === 'image' || data.type === 'voice' || data.type === 'file' || !!data.mediaUrl) {
    return true;
  }
  if (data.content && typeof data.content === 'string') {
    const c = data.content;
    if (
      c.includes('giphy.com') ||
      c.includes('unsplash.com') ||
      c.includes('Sticker') ||
      c.includes('GIF') ||
      /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u.test(c.trim())
    ) {
      return true;
    }
  }
  return false;
}

export function subscribeToChatMessages(
  chatId: string,
  currentUserId: string,
  callback: (messages: Message[]) => void
): () => void {
  // 1. Initial render from IndexedDB for zero latency & offline persistence
  getMessagesFromIndexedDB(chatId).then(localMsgs => {
    callback(localMsgs);
  }).catch(() => {});

  // 2. Listen to real-time P2P WebRTC DataChannel message events
  const handleP2PMessage = async (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.message?.chatId === chatId) {
      const refreshedMsgs = await getMessagesFromIndexedDB(chatId);
      callback(refreshedMsgs);
    }
  };

  const handleIncomingInternalMessage = async (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.chatId === chatId) {
      const refreshedMsgs = await getMessagesFromIndexedDB(chatId);
      callback(refreshedMsgs);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('splendid-p2p-message-received', handleP2PMessage);
    window.addEventListener('splendid-incoming-message', handleIncomingInternalMessage);
  }

  // 3. Listen to Firebase temporary inbox delivery queue
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  const unsubscribeFirestore = onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      // Return local IndexedDB history if queue is empty
      const localMsgs = await getMessagesFromIndexedDB(chatId);
      callback(localMsgs);
      return;
    }

    const now = Date.now();
    let hasNewDeliveredDocs = false;

    for (const docSnap of snapshot.docs) {
      const d = docSnap.data();
      const createdAt = d.createdAt || now;
      const isExpiring = d.expiresAt || isExpiringMediaOrStickerOrEmoji(d);
      const expiresAt = d.expiresAt || (isExpiring ? createdAt + MEDIA_EXPIRATION_MS : undefined);

      const isOutbound = d.senderId === currentUserId;

      if (!isOutbound) {
        let finalMediaUrl = d.mediaUrl;

      const isMedia = d.type === 'image' || d.type === 'voice' || d.type === 'file' || !!d.mediaUrl || isExpiringMediaOrStickerOrEmoji(d);

        // If mediaUrl is stored in temporary Firebase Storage (because receiver was offline when sent)
        if (d.mediaUrl && (d.mediaUrl.includes('firebasestorage.googleapis.com') || d.mediaUrl.includes('temp_media'))) {
          try {
            // Fetch the temporary media blob from Firebase Storage
            const res = await fetch(d.mediaUrl);
            const blob = await res.blob();

            // Persist permanently into receiver's device IndexedDB
            finalMediaUrl = await saveMediaBlobToIndexedDB(docSnap.id, blob, d.mediaMeta?.mimeType);

            // IMMEDIATELY delete temporary media file from Firebase Storage
            const fileRef = ref(storage, d.mediaUrl);
            deleteObject(fileRef).catch((e) => console.debug('Firebase Storage cleanup notice:', e));
          } catch (err) {
            console.warn('Error downloading temporary offline media from Firebase Storage:', err);
          }
        }

        const msgObj: Message = {
          id: docSnap.id,
          chatId: d.chatId || chatId,
          senderId: d.senderId,
          senderName: d.senderName,
          senderAvatar: d.senderAvatar,
          content: d.content || d.text || '',
          timestamp: d.timestamp || '',
          createdAt,
          expiresAt,
          isExpired: false,
          isForwarded: d.isForwarded || false,
          forwardedFrom: d.forwardedFrom,
          status: 'delivered',
          type: d.type || 'text',
          mediaUrl: finalMediaUrl,
          mediaMeta: d.mediaMeta || {
            fileName: d.mediaName,
            fileSize: d.mediaSize,
            duration: d.audioDuration,
            waveData: d.audioWaveform
          },
          replyTo: d.replyTo,
          reactions: d.reactions || {}
        };

        // Permanently store received message in local IndexedDB
        await saveMessageToIndexedDB(msgObj);
        hasNewDeliveredDocs = true;

        // ONLY DELETE IMMEDIATELY FROM FIRESTORE QUEUE IF IT IS A MEDIA FILE.
        // TEXT-BASED MESSAGES ARE RETAINED FOR 24 HOURS.
        if (isMedia) {
          deleteDoc(doc(db, 'chats', chatId, 'messages', docSnap.id)).catch((err) => {
            console.debug('Ephemeral queue deletion notice:', err);
          });
        }
      }
    }

    const updatedMsgs = await getMessagesFromIndexedDB(chatId);
    callback(updatedMsgs);
  }, (err) => {
    console.warn('Temporary queue subscription notice:', err);
  });

  return () => {
    unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('splendid-p2p-message-received', handleP2PMessage);
      window.removeEventListener('splendid-incoming-message', handleIncomingInternalMessage);
    }
  };
}

export async function sendFirestoreMessage(
  chatId: string,
  message: Omit<Message, 'id'>,
  currentUserId: string
): Promise<string> {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const msgDocRef = doc(messagesRef);

  const now = Date.now();
  
  // Check if chat has disappearing mode enabled
  let isExpiring = isExpiringMediaOrStickerOrEmoji(message);
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists() && chatSnap.data().disappearingMode) {
      isExpiring = true;
    }
  } catch (e) {
    console.warn('Error checking chat disappearing mode:', e);
  }

  const expiresAt = now + MEDIA_EXPIRATION_MS;

  const fullMsg: Message = {
    ...message,
    id: msgDocRef.id,
    chatId,
    createdAt: now,
    expiresAt,
    status: 'sent',
    isForwarded: message.isForwarded || false,
    forwardedFrom: message.forwardedFrom || undefined
  };

  // 1. SAVE PERMANENTLY TO SENDER'S LOCAL INDEXEDDB
  await saveMessageToIndexedDB(fullMsg);

  let payloadMediaUrl = message.mediaUrl;

  // 2. FOR MEDIA/FILES: SAVE LOCALLY & ATTEMPT DIRECT P2P OR FALLBACK TO TEMPORARY FIREBASE STORAGE IF RECEIVER IS OFFLINE
  if (message.mediaUrl && (message.type === 'image' || message.type === 'voice' || message.type === 'file')) {
    await saveMediaBlobToIndexedDB(msgDocRef.id, message.mediaUrl);
    
    let p2pSent = false;
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const pIds: string[] = chatSnap.data().participantIds || [];
        const recipientId = pIds.find(id => id !== currentUserId);
        if (recipientId) {
          p2pSent = await peerService.sendMediaDirectOverPeer(recipientId, fullMsg, message.mediaUrl);
        }
      }
    } catch (e) {
      console.debug('P2P media send attempt notice:', e);
    }

    // IF RECEIVER IS OFFLINE (P2P failed or not established), upload media to Firebase Storage as temporary queue space
    if (!p2pSent) {
      try {
        let blob: Blob;
        if (message.mediaUrl.startsWith('data:')) {
          const resp = await fetch(message.mediaUrl);
          blob = await resp.blob();
        } else if (message.mediaUrl.startsWith('blob:')) {
          const resp = await fetch(message.mediaUrl);
          blob = await resp.blob();
        } else {
          blob = new Blob([message.mediaUrl], { type: 'application/octet-stream' });
        }

        const tempStorageRef = ref(storage, `temp_media/${msgDocRef.id}_${Date.now()}`);
        await uploadBytes(tempStorageRef, blob);
        payloadMediaUrl = await getDownloadURL(tempStorageRef);
      } catch (uploadErr) {
        console.warn('Temporary Firebase storage upload fallback warning:', uploadErr);
      }
    }
  }

  // 3. SEND TEMPORARY DELIVERY PACKET TO FIREBASE INBOX QUEUE
  const rawPayload: any = {
    ...fullMsg,
    mediaUrl: payloadMediaUrl,
    readBy: [currentUserId]
  };

  const payload = cleanFirestoreData(rawPayload);
  await setDoc(msgDocRef, payload);

  // Update chat summary securely with setDoc merge in Firebase & local IndexedDB
  const chatRef = doc(db, 'chats', chatId);
  const lastMsgText = message.content || (message.type === 'image' ? '📷 Photo' : message.type === 'voice' ? '🎤 Voice Note' : '📎 Attachment');

  await setDoc(chatRef, cleanFirestoreData({
    lastMessageText: lastMsgText,
    lastMessageTime: message.timestamp,
    lastMessageSenderId: currentUserId,
    lastMessageType: message.type || 'text',
    lastMessageIsRead: false,
    updatedAt: now
  }), { merge: true }).catch((err) => console.warn('Chat summary update warning:', err));

  // Clear draft for this chat
  await clearChatDraft(chatId, currentUserId);

  // Send real-time notification to recipient(s)
  try {
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      const pIds: string[] = chatData.participantIds || [];
      const recipientIds = pIds.filter(id => id !== currentUserId);

      for (const recipientId of recipientIds) {
        const notifDocRef = doc(collection(db, 'notifications'));
        const bodyPreview = message.content || (message.type === 'image' ? 'Sent a 24h photo' : message.type === 'voice' ? 'Sent a 24h voice note' : 'Sent an attachment');

        await setDoc(notifDocRef, cleanFirestoreData({
          id: notifDocRef.id,
          recipientId,
          userId: recipientId,
          senderId: currentUserId,
          title: 'SPLENDID CHAT',
          body: bodyPreview,
          timestamp: 'Just now',
          chatId,
          isRead: false,
          type: 'message',
          avatar: message.senderAvatar || '💬',
          createdAt: Date.now()
        }));
      }
    }
  } catch (notifErr) {
    console.debug('Failed to write notification doc:', notifErr);
  }

  return msgDocRef.id;
}

export async function sendAdminNotification(targetUserId: string, title: string, body: string, senderAvatar: string): Promise<void> {
  try {
    const notifDocRef = doc(collection(db, 'notifications'));
    await setDoc(notifDocRef, cleanFirestoreData({
      id: notifDocRef.id,
      recipientId: targetUserId,
      userId: targetUserId,
      senderId: 'admin',
      title: 'SPLENDID CHAT',
      body,
      timestamp: 'Just now',
      isRead: false,
      type: 'system',
      avatar: senderAvatar || '🔔',
      createdAt: Date.now(),
      isAdmin: true
    }));
  } catch (e) {
    console.error('Failed to send admin notification', e);
  }
}

// ----------------- OFFLINE PENDING MESSAGES SYNC ----------------- //

export interface OfflineQueuedMessage {
  id: string;
  chatId: string;
  message: Omit<Message, 'id'> & { id?: string };
  currentUserId: string;
  queuedAt: number;
}

const OFFLINE_QUEUE_KEY = 'splendid_offline_msg_queue';

export function getOfflineMessageQueue(): OfflineQueuedMessage[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addMessageToOfflineQueue(item: OfflineQueuedMessage): void {
  try {
    const queue = getOfflineMessageQueue();
    const existingIndex = queue.findIndex(q => q.id === item.id);
    if (existingIndex >= 0) {
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to save offline queued message:', e);
  }
}

export function removeMessageFromOfflineQueue(messageId: string): void {
  try {
    const queue = getOfflineMessageQueue().filter(q => q.id !== messageId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to remove from offline message queue:', e);
  }
}

export async function sendPendingOfflineMessages(currentUserId?: string): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }

  let sentCount = 0;
  const queue = getOfflineMessageQueue();

  // 1. Process queued messages from localStorage
  for (const item of queue) {
    if (currentUserId && item.currentUserId !== currentUserId) {
      continue;
    }
    try {
      const payload = {
        ...item.message,
        status: 'sent' as const,
        timestamp: item.message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      };
      await sendFirestoreMessage(item.chatId, payload, item.currentUserId);
      removeMessageFromOfflineQueue(item.id);
      sentCount++;
    } catch (e) {
      console.warn('Error sending queued offline message:', e);
    }
  }

  // 2. Also check if any messages in Firestore under current user's chats have status === 'pending' or 'sending'
  if (currentUserId) {
    try {
      const chatsRef = collection(db, 'chats');
      const chatsSnap = await getDocs(chatsRef);
      for (const chatDoc of chatsSnap.docs) {
        const data = chatDoc.data();
        const pIds = data.participantIds || [];
        if (!pIds.includes(currentUserId)) continue;

        const msgsRef = collection(db, 'chats', chatDoc.id, 'messages');
        const pendingSnap = await getDocs(query(msgsRef, where('senderId', '==', currentUserId)));
        for (const msgDoc of pendingSnap.docs) {
          const mData = msgDoc.data();
          if (mData.status === 'pending' || mData.status === 'sending') {
            await updateDoc(doc(db, 'chats', chatDoc.id, 'messages', msgDoc.id), {
              status: 'sent'
            }).catch(() => {});
            sentCount++;
          }
        }
      }
    } catch (e) {
      console.debug('Error updating pending Firestore message statuses:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('splendid-offline-queue-flushed', { detail: { sentCount } }));
  }

  return sentCount;
}

// ----------------- FORWARD MESSAGE HELPER ----------------- //

export async function forwardFirestoreMessage(
  originalMessage: Message,
  targetChatIds: string[],
  currentUser: User
): Promise<void> {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const senderOriginalName = originalMessage.senderName || 'Contact';

  for (const targetChatId of targetChatIds) {
    const forwardPayload: Omit<Message, 'id'> = {
      chatId: targetChatId,
      senderId: currentUser.id,
      senderName: currentUser.fullName || currentUser.username,
      senderAvatar: currentUser.avatar,
      content: originalMessage.content,
      timestamp: timeStr,
      createdAt: Date.now(),
      status: 'sent',
      type: originalMessage.type,
      mediaUrl: originalMessage.mediaUrl,
      mediaMeta: originalMessage.mediaMeta,
      isForwarded: true,
      forwardedFrom: senderOriginalName,
      reactions: {}
    };

    await sendFirestoreMessage(targetChatId, forwardPayload, currentUser.id);
  }
}

// ----------------- DRAFT MESSAGE SYNCHRONIZATION ----------------- //

export function saveLocalDraftSync(chatId: string, userId: string, text: string): void {
  try {
    if (text && text.trim()) {
      localStorage.setItem(`splendid_draft_${chatId}_${userId}`, text);
      localStorage.setItem(`splendid_draft_${chatId}`, text);
    } else {
      localStorage.removeItem(`splendid_draft_${chatId}_${userId}`);
      localStorage.removeItem(`splendid_draft_${chatId}`);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('splendid-draft-updated', {
        detail: { chatId, userId, text: text ? text.trim() : '' }
      }));
    }
  } catch (e) {
    console.debug('Failed to save draft to local storage:', e);
  }
}

export async function saveChatDraft(chatId: string, userId: string, text: string): Promise<void> {
  // 1. Immediately store to local storage synchronously (zero lag)
  saveLocalDraftSync(chatId, userId, text);

  // 2. Sync to Firestore in the background
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`drafts.${userId}`]: text && text.trim() ? { text: text.trim(), updatedAt: Date.now() } : null
    });
  } catch (e) {
    console.debug('Firestore draft sync warning:', e);
  }
}

export async function clearChatDraft(chatId: string, userId: string): Promise<void> {
  saveLocalDraftSync(chatId, userId, '');
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`drafts.${userId}`]: null
    });
  } catch (e) {
    console.debug('Firestore clear draft warning:', e);
  }
}

export function getCachedChatDraft(chatId: string, userId?: string): string {
  try {
    if (userId) {
      const userDraft = localStorage.getItem(`splendid_draft_${chatId}_${userId}`);
      if (userDraft) return userDraft;
    }
    return localStorage.getItem(`splendid_draft_${chatId}`) || '';
  } catch (e) {
    return '';
  }
}

export async function markChatMessagesAsRead(chatId: string, currentUserId: string): Promise<void> {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, where('status', '!=', 'read'));
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.senderId !== currentUserId) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', docSnap.id), {
          status: 'read'
        });
      }
    }

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessageIsRead: true
    }).catch(() => {});
  } catch (e) {
    console.debug('Error marking messages as read:', e);
  }
}

// Real-Time Typing Status
export async function updateChatTypingStatus(
  chatId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`typing.${userId}`]: isTyping ? { isTyping: true, userName, timestamp: Date.now() } : null
    });
  } catch (e) {
    console.debug('Typing update error:', e);
  }
}

export function subscribeToChatTyping(
  chatId: string,
  currentUserId: string,
  callback: (isTyping: boolean, typingUserName?: string) => void
): () => void {
  const chatRef = doc(db, 'chats', chatId);
  return onSnapshot(chatRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(false);
      return;
    }
    const data = snapshot.data();
    const typingObj = data.typing || {};

    let peerIsTyping = false;
    let peerName = '';

    for (const uid of Object.keys(typingObj)) {
      if (uid !== currentUserId && typingObj[uid]?.isTyping) {
        const diff = Date.now() - (typingObj[uid].timestamp || 0);
        if (diff < 5000) { // Active in last 5 seconds
          peerIsTyping = true;
          peerName = typingObj[uid].userName || 'Someone';
          break;
        }
      }
    }

    callback(peerIsTyping, peerName);
  }, () => {
    callback(false);
  });
}

export async function toggleMessageReaction(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const currentReactions: Record<string, string[]> = data.reactions || {};
  const usersForEmoji = currentReactions[emoji] || [];

  let updatedUsers: string[];
  if (usersForEmoji.includes(userId)) {
    updatedUsers = usersForEmoji.filter(id => id !== userId);
  } else {
    updatedUsers = [...usersForEmoji, userId];
  }

  const updatedReactions = { ...currentReactions, [emoji]: updatedUsers };
  if (updatedUsers.length === 0) {
    delete updatedReactions[emoji];
  }

  await updateDoc(msgRef, { reactions: updatedReactions });
}

export async function updateFirestoreMessage(chatId: string, messageId: string, newContent: string): Promise<void> {
  const now = Date.now();
  // 1. Update in local IndexedDB
  const updatedMsg = await updateMessageInIndexedDB(messageId, {
    content: newContent,
    isEdited: true,
    editedAt: now
  });

  // 2. Update in Firestore if present in queue
  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      content: newContent,
      isEdited: true,
      editedAt: now
    }).catch(() => {});
  } catch (e) {
    console.debug('Firestore message update notice:', e);
  }

  // 3. Update chat lastMessageText in Firestore & local state
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      await updateDoc(chatRef, {
        lastMessageText: newContent,
        updatedAt: now
      }).catch(() => {});
    }
  } catch (e) {}

  // 4. Notify UI via event
  if (typeof window !== 'undefined' && updatedMsg) {
    window.dispatchEvent(new CustomEvent('splendid-incoming-message', {
      detail: { chatId, message: updatedMsg }
    }));
  }
}

export async function deleteFirestoreMessage(chatId: string, messageId: string): Promise<void> {
  try {
    // 1. Delete from local IndexedDB
    await deleteMessageFromIndexedDB(messageId);

    // 2. Delete from Firestore if still in delivery queue
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await deleteDoc(msgRef).catch(() => {});
  } catch (e) {
    console.error('Delete message error:', e);
  }
}

export async function clearChatMessages(chatId: string): Promise<void> {
  try {
    // 1. Clear local IndexedDB messages
    await clearChatMessagesFromIndexedDB(chatId);

    // 2. Clear any pending delivery messages in Firestore
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snap = await getDocs(messagesRef).catch(() => null);
    
    if (snap) {
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref).catch(() => {});
      }
    }

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessageText: 'Chat cleared',
      updatedAt: Date.now()
    }).catch(() => {});
  } catch (e) {
    console.error('Error clearing chat:', e);
  }
}

export async function toggleChatDisappearingMode(chatId: string, enabled: boolean): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      disappearingMode: enabled,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.error('Error toggling disappearing mode:', e);
  }
}

export async function updateChatTheme(chatId: string, bubbleColor?: string, accentColor?: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const updates: any = { updatedAt: Date.now() };
    if (bubbleColor !== undefined) updates.bubbleColor = bubbleColor;
    if (accentColor !== undefined) updates.accentColor = accentColor;
    await updateDoc(chatRef, updates);
  } catch (e) {
    console.error('Error updating chat theme:', e);
  }
}

// ----------------- BULK DELETE MEDIA, STICKERS, EMOJIS & GIFS ----------------- //

export async function deleteAllChatMediaAndStickers(chatId: string): Promise<number> {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snap = await getDocs(messagesRef);
    let deletedCount = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const isMediaOrStickerOrEmoji = 
        data.type === 'image' || 
        data.type === 'voice' || 
        data.type === 'file' || 
        data.mediaUrl ||
        (data.content && (
          data.content.includes('giphy.com') ||
          data.content.includes('unsplash.com') ||
          data.content.includes('Sticker') ||
          data.content.includes('GIF') ||
          /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u.test(data.content.trim())
        ));

      if (isMediaOrStickerOrEmoji) {
        await deleteFirestoreMessage(chatId, docSnap.id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessageText: 'Media, stickers & emojis cleared',
        updatedAt: Date.now()
      }).catch(() => {});
    }

    return deletedCount;
  } catch (e) {
    console.error('Error deleting chat media & stickers:', e);
    return 0;
  }
}

export async function deleteAllUserSentAndReceivedMediaAndStickers(userId: string): Promise<number> {
  try {
    const chatsRef = collection(db, 'chats');
    const chatsSnap = await getDocs(chatsRef);
    let totalDeleted = 0;

    for (const chatDocSnap of chatsSnap.docs) {
      const chatData = chatDocSnap.data();
      const pIds: string[] = chatData.participantIds || [];

      if (pIds.includes(userId)) {
        const count = await deleteAllChatMediaAndStickers(chatDocSnap.id);
        totalDeleted += count;
      }
    }

    return totalDeleted;
  } catch (e) {
    console.error('Error deleting all user media, stickers & emojis:', e);
    return 0;
  }
}

export async function autoCleanupExpiredMediaForUser(userId: string): Promise<number> {
  try {
    const chatsRef = collection(db, 'chats');
    const chatsSnap = await getDocs(chatsRef);
    const now = Date.now();
    let purgedCount = 0;

    for (const chatDocSnap of chatsSnap.docs) {
      const chatData = chatDocSnap.data();
      const pIds: string[] = chatData.participantIds || [];

      if (pIds.includes(userId)) {
        const messagesRef = collection(db, 'chats', chatDocSnap.id, 'messages');
        const msgsSnap = await getDocs(messagesRef);

        for (const docSnap of msgsSnap.docs) {
          const data = docSnap.data();
          const createdAt = data.createdAt || now;
          const isExpiring = isExpiringMediaOrStickerOrEmoji(data);
          const expiresAt = data.expiresAt || (isExpiring ? createdAt + MEDIA_EXPIRATION_MS : undefined);

          if (expiresAt && now >= expiresAt) {
            await deleteFirestoreMessage(chatDocSnap.id, docSnap.id).catch(() => {});
            purgedCount++;
          }
        }
      }
    }

    // Also cleanup expired statuses (> 24h)
    try {
      const statusesRef = collection(db, 'statuses');
      const statusSnap = await getDocs(statusesRef);
      for (const sDoc of statusSnap.docs) {
        const sData = sDoc.data();
        if (sData.expiresAt && now >= sData.expiresAt) {
          await deleteDoc(doc(db, 'statuses', sDoc.id)).catch(() => {});
          purgedCount++;
        }
      }
    } catch (e) {
      console.debug('Status auto cleanup error:', e);
    }

    return purgedCount;
  } catch (e) {
    console.debug('Background auto cleanup error:', e);
    return 0;
  }
}

export async function deleteContactUser(targetUserId: string, currentUserId: string): Promise<void> {
  try {
    // 1. Delete mutual private chats between these two users
    const deterministicId1 = [currentUserId, targetUserId].sort().join('_');
    const deterministicId2 = `direct_${deterministicId1}`;
    
    await deleteDoc(doc(db, 'chats', deterministicId1)).catch(() => {});
    await deleteDoc(doc(db, 'chats', deterministicId2)).catch(() => {});

    // Also check any chats containing both participants
    const chatsRef = collection(db, 'chats');
    const chatsSnap = await getDocs(chatsRef);
    for (const cDoc of chatsSnap.docs) {
      const pIds: string[] = cDoc.data().participantIds || [];
      if (!cDoc.data().isGroup && pIds.includes(targetUserId) && pIds.includes(currentUserId)) {
        await deleteDoc(doc(db, 'chats', cDoc.id)).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error deleting contact user:', err);
  }
}

// ----------------- CALL LOGS & NOTIFICATIONS ----------------- //

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: PushNotification[]) => void
): () => void {
  const notifsRef = collection(db, 'notifications');
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  return onSnapshot(notifsRef, (snapshot) => {
    const list: PushNotification[] = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const createdAt = d.createdAt || Date.now();

      // Automatically expire and delete notifications older than 2 days
      if (now - createdAt > TWO_DAYS_MS) {
        deleteDoc(doc(db, 'notifications', docSnap.id)).catch(() => {});
        return;
      }

      if (d.recipientId === userId || d.userId === userId) {
        list.push({
          id: docSnap.id,
          title: 'SPLENDID CHAT',
          body: d.body || '',
          timestamp: d.timestamp || 'Just now',
          chatId: d.chatId,
          senderId: d.senderId,
          isRead: d.isRead || false,
          type: d.type || 'message',
          avatar: d.avatar || '💬',
          createdAt,
          isAdmin: d.isAdmin || false
        });
      }
    });

    list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  }, (err) => {
    console.warn('Notifications subscription error:', err);
  });
}

export async function updateUserPresence(userId: string, status: 'online' | 'offline' | 'away', lastSeen: string = 'Last seen recently'): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status,
      lastSeen,
      updatedAt: Date.now()
    });

    // Also propagate to chats participantsMap and participant object
    const chatsRef = collection(db, 'chats');
    const chatsSnap = await getDocs(chatsRef);
    const batch = chatsSnap.docs.map(async (chatDocSnap) => {
      const data = chatDocSnap.data();
      const pIds: string[] = data.participantIds || [];
      if (pIds.includes(userId)) {
        const chatDocRef = doc(db, 'chats', chatDocSnap.id);
        const updatesMap: any = {};
        if (data.participantsMap && data.participantsMap[userId]) {
          updatesMap[`participantsMap.${userId}`] = {
            ...data.participantsMap[userId],
            status,
            lastSeen
          };
        }
        if (data.participant && data.participant.id === userId) {
          updatesMap.participant = {
            ...data.participant,
            status,
            lastSeen
          };
        }
        if (Object.keys(updatesMap).length > 0) {
          await updateDoc(chatDocRef, updatesMap).catch(() => {});
        }
      }
    });
    await Promise.all(batch);
  } catch (e) {
    console.debug('Error updating presence:', e);
  }
}

export async function markNotificationAsReadInFirestore(notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { isRead: true });
  } catch (e) {
    console.debug('Error marking notification as read:', e);
  }
}

export async function markAllUserNotificationsAsReadInFirestore(userId: string): Promise<void> {
  try {
    const notifsRef = collection(db, 'notifications');
    const snap = await getDocs(notifsRef);
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      if ((d.recipientId === userId || d.userId === userId) && !d.isRead) {
        await updateDoc(doc(db, 'notifications', docSnap.id), { isRead: true });
      }
    }
  } catch (e) {
    console.debug('Error marking all notifications as read:', e);
  }
}

export async function clearUserNotificationsInFirestore(userId: string): Promise<void> {
  try {
    const notifsRef = collection(db, 'notifications');
    const snap = await getDocs(notifsRef);
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      if (d.recipientId === userId || d.userId === userId) {
        await deleteDoc(doc(db, 'notifications', docSnap.id));
      }
    }
  } catch (e) {
    console.debug('Error clearing notifications in Firestore:', e);
  }
}

export async function logCallRecord(call: CallLog): Promise<void> {
  try {
    const callRef = doc(db, 'callLogs', call.id);
    await setDoc(callRef, {
      ...call,
      createdAt: Date.now()
    });
  } catch (e) {
    console.error('Log call error:', e);
  }
}

export async function recordCallLogToChat(
  chatId: string,
  caller: User,
  receiverId: string,
  isVideo: boolean,
  status: 'completed' | 'missed' | 'declined' | 'cancelled',
  durationSeconds: number = 0
): Promise<void> {
  try {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const formatDuration = (sec: number) => {
      if (sec <= 0) return '';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    let content = '';
    if (status === 'completed') {
      const dur = formatDuration(durationSeconds);
      content = isVideo ? `📹 Video call (${dur || '0:01'})` : `📞 Voice call (${dur || '0:01'})`;
    } else if (status === 'missed') {
      content = isVideo ? '📹 Missed video call' : '📞 Missed voice call';
    } else if (status === 'declined') {
      content = isVideo ? '📹 Declined video call' : '📞 Declined voice call';
    } else {
      content = isVideo ? '📹 Cancelled video call' : '📞 Cancelled voice call';
    }

    const callMsgPayload: Omit<Message, 'id'> = {
      chatId,
      senderId: caller.id,
      senderName: caller.fullName || caller.username || 'User',
      senderAvatar: caller.avatar || '👤',
      content,
      timestamp: timeStr,
      createdAt: Date.now(),
      status: 'sent',
      type: 'call',
      mediaMeta: {
        duration: durationSeconds,
        mimeType: status,
        dimensions: { width: isVideo ? 1 : 0, height: 0 }
      }
    };

    await sendFirestoreMessage(chatId, callMsgPayload, caller.id);
  } catch (err) {
    console.error('Error recording call log to chat:', err);
  }
}

export function subscribeToCallLogs(userId: string, callback: (calls: CallLog[]) => void): () => void {
  const callsRef = collection(db, 'callLogs');
  return onSnapshot(callsRef, (snapshot) => {
    const calls: CallLog[] = [];
    snapshot.forEach(docSnap => {
      calls.push(docSnap.data() as CallLog);
    });
    calls.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(calls);
  }, (err) => {
    console.warn('Call logs subscription error:', err);
  });
}

// ----------------- REAL-TIME CALL SIGNALING CHANNEL ----------------- //

export async function createCallSession(
  caller: User,
  receiverId: string,
  isVideo: boolean
): Promise<string> {
  const callId = `call_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const callRef = doc(db, 'calls', callId);

  const callSession: CallSession = {
    id: callId,
    callerId: caller.id,
    callerName: caller.fullName || caller.username || 'Splendid User',
    callerAvatar: caller.avatar || '👤',
    receiverId,
    isVideo,
    status: 'ringing',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await setDoc(callRef, callSession);
  return callId;
}

export async function updateCallStatus(
  callId: string,
  status: 'ringing' | 'accepted' | 'declined' | 'ended'
): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.error('Error updating call status:', e);
  }
}

export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: CallSession | null) => void
): () => void {
  const callsRef = collection(db, 'calls');
  const q = query(callsRef, where('receiverId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    let latestRingingCall: CallSession | null = null;
    const now = Date.now();

    snapshot.forEach((docSnap) => {
      const call = docSnap.data() as CallSession;
      // Find a ringing call created within the last 60 seconds
      if (
        call.status === 'ringing' &&
        now - (call.createdAt || 0) < 60000
      ) {
        if (!latestRingingCall || (call.createdAt || 0) > (latestRingingCall.createdAt || 0)) {
          latestRingingCall = call;
        }
      }
    });

    callback(latestRingingCall);
  }, (err) => {
    console.warn('Incoming calls subscription error:', err);
  });
}

export function subscribeToCallSession(
  callId: string,
  callback: (call: CallSession | null) => void
): () => void {
  const callRef = doc(db, 'calls', callId);
  return onSnapshot(callRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as CallSession);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn('Call session subscription error:', err);
  });
}

export async function sendCallSignal(
  callId: string,
  senderId: string,
  type: 'offer' | 'answer' | 'ice-candidate',
  payload: any
): Promise<void> {
  const signalRef = doc(collection(db, 'calls', callId, 'signaling'));
  await setDoc(signalRef, {
    id: signalRef.id,
    callId,
    senderId,
    type,
    payload,
    createdAt: Date.now()
  });
}

export function subscribeToCallSignals(
  callId: string,
  senderId: string, // Subscribe to signals sent BY THE PEER (not self)
  callback: (signal: CallSignal) => void
): () => void {
  const signalsRef = collection(db, 'calls', callId, 'signaling');
  const q = query(signalsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const signal = change.doc.data() as CallSignal;
        if (signal.senderId !== senderId) {
          callback(signal);
        }
      }
    });
  }, (err) => {
    console.warn('Call signals subscription error:', err);
  });
}

// ----------------- USER STATUS UPDATES SERVICE ----------------- //

export async function postUserStatus(
  user: User,
  type: 'text' | 'image' | 'voice',
  content: string,
  duration?: number,
  backgroundColor?: string,
  allowReshare: boolean = true
): Promise<void> {
  const statusId = `status_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const statusRef = doc(db, 'statuses', statusId);

  const statusDoc: UserStatus = {
    id: statusId,
    userId: user.id,
    username: user.username,
    userFullName: user.fullName || user.username,
    userAvatar: user.avatar || '👤',
    type,
    content,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours duration
    allowReshare: allowReshare
  };

  if (duration !== undefined) {
    statusDoc.duration = duration;
  }
  if (backgroundColor !== undefined) {
    statusDoc.backgroundColor = backgroundColor;
  }

  // 1. Immediately persist created status into user's device IndexedDB
  await saveStatusToIndexedDB(statusDoc);

  // 2. Store temporarily in Firebase (auto-deleted after 24h)
  await setDoc(statusRef, statusDoc);
}

export function subscribeToActiveStatuses(
  callback: (statuses: UserStatus[]) => void
): () => void {
  // 1. Initial render from IndexedDB for instant offline loading
  getStatusesFromIndexedDB().then(cachedStatuses => {
    if (cachedStatuses && cachedStatuses.length > 0) {
      callback(cachedStatuses);
    }
  }).catch(() => {});

  const statusesRef = collection(db, 'statuses');
  // Query statuses created in the last 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const q = query(statusesRef, where('createdAt', '>', oneDayAgo));

  return onSnapshot(q, async (snapshot) => {
    const firebaseList: UserStatus[] = [];
    const now = Date.now();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserStatus;
      if (data.expiresAt > now) {
        firebaseList.push(data);
      } else {
        deleteDoc(doc(db, 'statuses', docSnap.id)).catch(() => {});
      }
    });

    // Merge with IndexedDB statuses so posted or viewed statuses remain saved locally
    const localStatuses = await getStatusesFromIndexedDB().catch(() => [] as UserStatus[]);
    const map = new Map<string, UserStatus>();

    localStatuses.forEach(s => map.set(s.id, s));
    firebaseList.forEach(s => map.set(s.id, s));

    const combined = Array.from(map.values());
    combined.sort((a, b) => b.createdAt - a.createdAt);

    callback(combined);
  }, (err) => {
    console.warn('Statuses subscription error:', err);
  });
}


export async function createGroupChat(
  currentUser: User,
  groupName: string,
  selectedMembers: User[],
  groupAvatar: string = '👥',
  groupDescription: string = ''
): Promise<Chat> {
  const allParticipants = [currentUser, ...selectedMembers];
  const participantIds = allParticipants.map(p => p.id);
  const participantPhones = allParticipants.map(p => normalizePhoneNumber(p.phoneNumber));
  
  const participantsMap: Record<string, User> = {};
  allParticipants.forEach(p => {
    participantsMap[p.id] = p;
  });

  const chatId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const chatRef = doc(db, 'chats', chatId);

  const groupData = {
    id: chatId,
    name: groupName,
    avatar: groupAvatar,
    avatarType: 'emoji',
    description: groupDescription,
    isGroup: true,
    creatorId: currentUser.id,
    participantIds,
    participantPhones,
    participantsMap,
    groupMembers: participantIds,
    groupAdmins: [currentUser.id],
    lastMessageText: `${currentUser.fullName} created group "${groupName}"`,
    lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    lastMessageSenderId: currentUser.id,
    lastMessageType: 'text',
    lastMessageIsRead: true,
    pinned: false,
    muted: false,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await setDoc(chatRef, groupData);

  return {
    id: chatId,
    name: groupName,
    avatar: groupAvatar,
    avatarType: 'emoji',
    isGroup: true,
    creatorId: currentUser.id,
    groupMembers: participantIds,
    groupAdmins: [currentUser.id],
    status: 'online',
    unreadCount: 0,
    participant: currentUser,
    createdAt: Date.now(),
    lastMessage: {
      text: `${currentUser.fullName} created group "${groupName}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      senderId: currentUser.id,
      isRead: true,
      type: 'text'
    }
  };
}

export async function updateGroupName(chatId: string, newName: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { name: newName, updatedAt: Date.now() });
  } catch (e) {
    console.error('Error updating group name:', e);
  }
}

export async function updateGroupDescription(chatId: string, newDescription: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { description: newDescription, updatedAt: Date.now() });
  } catch (e) {
    console.error('Error updating group description:', e);
  }
}

export async function deleteGroupChat(chatId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await deleteDoc(chatRef);
  } catch (e) {
    console.error('Error deleting group chat:', e);
  }
}

export async function exitGroupChat(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const snap = await getDoc(chatRef);
    if (!snap.exists()) return;
    const data = snap.data();
    let pIds: string[] = data.participantIds || [];
    pIds = pIds.filter(id => id !== userId);
    
    let members: string[] = data.groupMembers || [];
    members = members.filter(id => id !== userId);

    const pMap = { ...(data.participantsMap || {}) };
    delete pMap[userId];

    await updateDoc(chatRef, {
      participantIds: pIds,
      groupMembers: members,
      participantsMap: pMap,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.error('Error exiting group chat:', e);
  }
}

export async function togglePinMessage(chatId: string, message: Message): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const snap = await getDoc(chatRef);
    if (!snap.exists()) return;
    const data = snap.data();
    let pinned: any[] = data.pinnedMessages || [];
    const existsIndex = pinned.findIndex((p: any) => p.id === message.id);
    if (existsIndex >= 0) {
      pinned.splice(existsIndex, 1);
    } else {
      pinned.push({
        id: message.id,
        content: message.content || (message.type === 'image' ? '📷 Photo' : message.type === 'voice' ? '🎤 Voice message' : '📎 Attachment'),
        senderName: message.senderName,
        timestamp: message.timestamp
      });
    }
    await updateDoc(chatRef, { pinnedMessages: pinned, updatedAt: Date.now() });
  } catch (e) {
    console.error('Error toggling pin message:', e);
  }
}

// ----------------- LOCAL STORAGE CACHE HELPERS ----------------- //

const LOCAL_USER_KEY = 'splendid_auth_user_v2';

export function getLocalUser(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveLocalUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  } catch (e) {}
}

export function clearLocalSession(): void {
  localStorage.removeItem(LOCAL_USER_KEY);
}
export async function updateGroupAvatar(chatId: string, newAvatar: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { avatar: newAvatar });
  } catch (e) {
    console.error('Error updating group avatar:', e);
  }
}

export async function addGroupAdmin(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { groupAdmins: arrayUnion(userId) });
  } catch (e) {
    console.error('Error adding group admin:', e);
  }
}

export async function removeGroupAdmin(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { groupAdmins: arrayRemove(userId) });
  } catch (e) {
    console.error('Error removing group admin:', e);
  }
}

export async function removeMemberFromGroup(chatId: string, memberId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { 
      groupMembers: arrayRemove(memberId),
      groupAdmins: arrayRemove(memberId) 
    });
  } catch (e) {
    console.error('Error removing member:', e);
  }
}

// ----------------- BROADCAST FEEDS SERVICE ----------------- //

export async function createBroadcastFeed(
  user: User,
  name: string,
  avatar: string,
  description: string
): Promise<void> {
  const feedId = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const feedRef = doc(db, 'broadcast_feeds', feedId);

  const feedDoc: BroadcastFeed = {
    id: feedId,
    name: name.trim(),
    avatar: avatar,
    description: description.trim(),
    creatorId: user.id,
    creatorName: user.fullName || user.username,
    creatorAvatar: user.avatar || '👤',
    createdAt: Date.now(),
    followers: [user.id]
  };

  await setDoc(feedRef, feedDoc);
}

export async function postToBroadcastFeed(
  user: User,
  feedId: string,
  type: 'text' | 'image' | 'voice',
  content: string,
  duration?: number
): Promise<void> {
  const postId = `feed_post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const postRef = doc(db, 'broadcast_feed_posts', postId);

  const postDoc: BroadcastFeedPost = {
    id: postId,
    feedId,
    creatorId: user.id,
    creatorName: user.fullName || user.username,
    creatorAvatar: user.avatar || '👤',
    type,
    content,
    createdAt: Date.now()
  };

  if (duration !== undefined) {
    postDoc.duration = duration;
  }

  await setDoc(postRef, postDoc);
}

export function subscribeToBroadcastFeeds(
  callback: (feeds: BroadcastFeed[]) => void
): () => void {
  const feedsRef = collection(db, 'broadcast_feeds');
  const q = query(feedsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: BroadcastFeed[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BroadcastFeed);
    });
    callback(list);
  }, (err) => {
    console.error('Error in subscribeToBroadcastFeeds:', err);
  });
}

export function subscribeToFeedPosts(
  feedId: string,
  callback: (posts: BroadcastFeedPost[]) => void
): () => void {
  const postsRef = collection(db, 'broadcast_feed_posts');
  const q = query(postsRef, where('feedId', '==', feedId), orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const list: BroadcastFeedPost[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BroadcastFeedPost);
    });
    callback(list);
  }, (err) => {
    console.error('Error in subscribeToFeedPosts:', err);
  });
}

export async function followBroadcastFeed(feedId: string, userId: string): Promise<void> {
  const feedRef = doc(db, 'broadcast_feeds', feedId);
  await updateDoc(feedRef, {
    followers: arrayUnion(userId)
  });
}

export async function unfollowBroadcastFeed(feedId: string, userId: string): Promise<void> {
  const feedRef = doc(db, 'broadcast_feeds', feedId);
  await updateDoc(feedRef, {
    followers: arrayRemove(userId)
  });
}

export async function reactToBroadcastFeedPost(
  postId: string,
  userId: string,
  emoji: string | null
): Promise<void> {
  const postRef = doc(db, 'broadcast_feed_posts', postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return;
  const post = postSnap.data() as BroadcastFeedPost;
  const reactions = post.reactions || {};
  if (emoji) {
    reactions[userId] = emoji;
  } else {
    delete reactions[userId];
  }
  await updateDoc(postRef, { reactions });
}

export async function deleteBroadcastFeedPost(postId: string): Promise<void> {
  const postRef = doc(db, 'broadcast_feed_posts', postId);
  await deleteDoc(postRef);
}



export async function deleteUserStatus(statusId: string): Promise<void> {
  await deleteStatusFromIndexedDB(statusId);
  const statusRef = doc(db, 'statuses', statusId);
  await deleteDoc(statusRef).catch(() => {});
}

export async function toggleLikeStatus(statusId: string, userId: string): Promise<void> {
  const statusRef = doc(db, 'statuses', statusId);
  const statusSnap = await getDoc(statusRef);
  
  if (statusSnap.exists()) {
    const data = statusSnap.data();
    const likes = data.likes || [];
    
    if (likes.includes(userId)) {
      await updateDoc(statusRef, {
        likes: arrayRemove(userId)
      });
    } else {
      await updateDoc(statusRef, {
        likes: arrayUnion(userId)
      });
    }
  }
}

export async function markStatusAsViewed(statusId: string, userId: string, statusObj?: UserStatus): Promise<void> {
  if (statusObj) {
    await saveStatusToIndexedDB(statusObj);
  }

  const statusRef = doc(db, 'statuses', statusId);
  const statusSnap = await getDoc(statusRef);
  
  if (statusSnap.exists()) {
    const data = statusSnap.data() as UserStatus;
    if (!statusObj) {
      await saveStatusToIndexedDB(data);
    }
    // Only update if not already viewed to save writes
    if (!data.views?.includes(userId)) {
      await updateDoc(statusRef, {
        views: arrayUnion(userId)
      });
    }
  }
}

export async function updateChatPinOrder(chatId: string, isPinned: boolean, pinOrder: number): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      pinned: isPinned,
      isPinned: isPinned,
      pinOrder: pinOrder,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.warn('Error updating chat pin order:', e);
  }
}
