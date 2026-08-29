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
  onSnapshot 
} from './firebase';
import { User, Chat, Message, CallLog, PushNotification } from '../types';

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

    // Check username taken
    const userQ = query(usersRef, where('username', '==', cleanUsername));
    const userSnap = await getDocs(userQ);
    if (!userSnap.empty) {
      return { success: false, error: 'Username is already taken. Please choose another.' };
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
      updatePayload.username = updates.username.toLowerCase().replace(/^@/, '');
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
      users.push(docSnap.data() as User);
    });
    callback(users);
  }, (err) => {
    console.warn('Firestore users subscription error:', err);
  });
}

// ----------------- REAL-TIME CHATS (FIRESTORE) ----------------- //

export function subscribeToUserChats(userId: string, userPhone: string, callback: (chats: Chat[]) => void): () => void {
  const chatsRef = collection(db, 'chats');
  const cleanPhone = normalizePhoneNumber(userPhone);

  return onSnapshot(chatsRef, (snapshot) => {
    const chats: Chat[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const pIds = data.participantIds || [];
      const pPhones = (data.participantPhones || []).map((p: string) => normalizePhoneNumber(p));

      // Include if current user is participant
      if (pIds.includes(userId) || (cleanPhone && pPhones.includes(cleanPhone))) {
        const userDraft = data.drafts?.[userId]?.text || getCachedChatDraft(docSnap.id, userId) || undefined;

        // Resolve other participant from participantsMap or fallback
        let peer: User;
        if (data.participantsMap) {
          const otherId = pIds.find((id: string) => id !== userId);
          peer = otherId && data.participantsMap[otherId] ? data.participantsMap[otherId] : data.participant;
        } else {
          peer = data.participant;
        }

        if (!peer) {
          peer = {
            id: pIds.find((id: string) => id !== userId) || 'other',
            fullName: data.name || 'User',
            username: data.name?.toLowerCase().replace(/[@\s]/g, '') || 'user',
            phoneNumber: pPhones.find((p: string) => p !== cleanPhone) || '',
            avatar: data.avatar || '👤',
            avatarType: 'emoji',
            status: 'online',
            lastSeen: 'Active now',
            createdAt: Date.now()
          };
        }

        const peerUsername = peer.username || peer.fullName?.toLowerCase().replace(/[@\s]/g, '') || 'user';
        const displayChatName = `@${peerUsername.replace(/^@/, '')}`;

        chats.push({
          id: docSnap.id,
          name: displayChatName,
          username: peerUsername,
          phoneNumber: peer.phoneNumber,
          avatar: peer.avatar || data.avatar || '👤',
          avatarType: peer.avatarType || data.avatarType || 'emoji',
          status: peer.status || data.status || 'online',
          lastSeen: peer.lastSeen || data.lastSeen || 'Active now',
          draft: userDraft,
          isGroup: data.isGroup || false,
          creatorId: data.creatorId || '',
          groupMembers: data.groupMembers || [],
          isPinned: data.pinned || data.isPinned || false,
          isMuted: data.muted || data.isMuted || false,
          unreadCount: data.unreadCount || 0,
          createdAt: data.createdAt || Date.now(),
          participant: peer,
          lastMessage: {
            text: data.lastMessageText || 'No messages yet',
            timestamp: data.lastMessageTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            senderId: data.lastMessageSenderId || '',
            isRead: data.lastMessageIsRead !== false,
            type: data.lastMessageType || 'text'
          }
        });
      }
    });

    // Sort by pinned then most recent
    chats.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    callback(chats);
  }, (err) => {
    console.warn('Firestore chats subscription error:', err);
  });
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

export function subscribeToChatMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): () => void {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const msgs: Message[] = [];
    const now = Date.now();

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const createdAt = d.createdAt || now;
      const isMedia = d.type === 'image' || d.type === 'voice';
      const expiresAt = d.expiresAt || (isMedia ? createdAt + MEDIA_EXPIRATION_MS : undefined);

      // Check if 24h media has expired -> automatically delete from Firestore & exclude from stream
      if (expiresAt && now >= expiresAt) {
        deleteDoc(doc(db, 'chats', chatId, 'messages', docSnap.id)).catch(() => {});
        return;
      }

      msgs.push({
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
        status: d.status || 'sent',
        type: d.type || 'text',
        mediaUrl: d.mediaUrl,
        mediaMeta: d.mediaMeta || {
          fileName: d.mediaName,
          fileSize: d.mediaSize,
          duration: d.audioDuration,
          waveData: d.audioWaveform
        },
        replyTo: d.replyTo,
        reactions: d.reactions || {}
      });
    });
    callback(msgs);
  }, (err) => {
    console.warn('Messages subscription error:', err);
  });
}

export async function sendFirestoreMessage(
  chatId: string,
  message: Omit<Message, 'id'>,
  currentUserId: string
): Promise<string> {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const msgDocRef = doc(messagesRef);

  const now = Date.now();
  const isMedia = message.type === 'image' || message.type === 'voice';
  const expiresAt = isMedia ? now + MEDIA_EXPIRATION_MS : undefined;

  const rawPayload: any = {
    ...message,
    id: msgDocRef.id,
    createdAt: now,
    readBy: [currentUserId],
    isForwarded: message.isForwarded || false,
    forwardedFrom: message.forwardedFrom || null
  };

  if (expiresAt) {
    rawPayload.expiresAt = expiresAt;
  }

  const payload = cleanFirestoreData(rawPayload);

  await setDoc(msgDocRef, payload);

  // Update chat summary securely with setDoc merge
  const chatRef = doc(db, 'chats', chatId);
  const lastMsgText = message.content || (message.type === 'image' ? '📷 Disappearing Photo (24h)' : message.type === 'voice' ? '🎤 Disappearing Voice (24h)' : '📎 Attachment');

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

  // Send real-time Firestore notification to recipient(s)
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
          title: message.senderName || 'New Message',
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

export async function saveChatDraft(chatId: string, userId: string, text: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`drafts.${userId}`]: text ? { text, updatedAt: Date.now() } : null
    });
    // Local backup
    localStorage.setItem(`splendid_draft_${chatId}_${userId}`, text);
  } catch (e) {
    localStorage.setItem(`splendid_draft_${chatId}_${userId}`, text);
  }
}

export async function clearChatDraft(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`drafts.${userId}`]: null
    });
    localStorage.removeItem(`splendid_draft_${chatId}_${userId}`);
  } catch (e) {
    localStorage.removeItem(`splendid_draft_${chatId}_${userId}`);
  }
}

export function getCachedChatDraft(chatId: string, userId: string): string {
  return localStorage.getItem(`splendid_draft_${chatId}_${userId}`) || '';
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

export async function deleteFirestoreMessage(chatId: string, messageId: string): Promise<void> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  await deleteDoc(msgRef);
}

// ----------------- CALL LOGS & NOTIFICATIONS ----------------- //

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: PushNotification[]) => void
): () => void {
  const notifsRef = collection(db, 'notifications');
  
  return onSnapshot(notifsRef, (snapshot) => {
    const list: PushNotification[] = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      if (d.recipientId === userId || d.userId === userId) {
        list.push({
          id: docSnap.id,
          title: d.title || 'Notification',
          body: d.body || '',
          timestamp: d.timestamp || 'Just now',
          chatId: d.chatId,
          isRead: d.isRead || false,
          type: d.type || 'message',
          avatar: d.avatar || '💬',
          createdAt: d.createdAt || Date.now()
        } as any);
      }
    });

    list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  }, (err) => {
    console.warn('Notifications subscription error:', err);
  });
}

export async function updateUserPresence(userId: string, status: 'online' | 'offline' | 'away', lastSeen: string): Promise<void> {
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

export async function createGroupChat(
  currentUser: User,
  groupName: string,
  selectedMembers: User[],
  groupAvatar: string = '👥'
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
