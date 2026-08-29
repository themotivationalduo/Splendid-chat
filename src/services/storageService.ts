import { Chat, Message, User, PushNotification, CallLog } from '../types';

const STORAGE_KEYS = {
  CURRENT_USER: 'splendid_auth_user',
  REGISTERED_USERS: 'splendid_registered_users',
  CHATS: 'splendid_chats',
  MESSAGES: 'splendid_messages',
  NOTIFICATIONS: 'splendid_notifications',
  CALLS: 'splendid_call_logs'
};

// Start with clean, empty databases as requested
export function getRegisteredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage read error for users:', e);
  }
  return [];
}

export function saveRegisteredUsers(users: User[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Storage write error for users:', e);
  }
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '');
}

export function findUserByPhoneNumber(phone: string): User | undefined {
  const users = getRegisteredUsers();
  const normalizedTarget = normalizePhoneNumber(phone);
  if (!normalizedTarget) return undefined;

  return users.find(u => {
    const userNorm = normalizePhoneNumber(u.phoneNumber);
    return userNorm === normalizedTarget || 
           userNorm.endsWith(normalizedTarget) || 
           normalizedTarget.endsWith(userNorm);
  });
}

export function searchRegisteredUsers(query: string): User[] {
  const users = getRegisteredUsers();
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return users;

  const cleanDigits = normalizePhoneNumber(cleanQ);

  return users.filter(u => {
    const matchName = u.fullName.toLowerCase().includes(cleanQ);
    const matchUsername = u.username.toLowerCase().includes(cleanQ);
    const matchPhone = cleanDigits.length > 0 && normalizePhoneNumber(u.phoneNumber).includes(cleanDigits);
    return matchName || matchUsername || matchPhone;
  });
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage read error for user:', e);
  }
  return null;
}

export function saveStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } catch (e) {
    console.error('Storage write error for user:', e);
  }
}

export function registerUser(
  fullName: string,
  username: string,
  phoneNumber: string,
  passcode: string
): { success: boolean; user?: User; error?: string } {
  const users = getRegisteredUsers();
  
  // Clean phone and username
  const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
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

  // Check existing phone
  const existingPhone = users.find(u => u.phoneNumber.replace(/\s+/g, '') === cleanPhone);
  if (existingPhone) {
    return { success: false, error: 'An account with this phone number already exists. Please log in.' };
  }

  const existingUsername = users.find(u => u.username.toLowerCase() === cleanUsername);
  if (existingUsername) {
    return { success: false, error: 'Username is already taken. Please choose another.' };
  }

  const defaultAvatars = ['👤', '🌟', '🚀', '💎', '🔥', '⚡', '👑', '🎯', '🌸', '🦊'];
  const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fullName: fullName.trim(),
    username: cleanUsername,
    phoneNumber: phoneNumber.trim(),
    passcode,
    avatar: randomAvatar,
    avatarType: 'emoji',
    status: 'online',
    lastSeen: 'Active now',
    bio: 'Hey there! I am using SPLENDID CHAT.',
    createdAt: Date.now()
  };

  const updatedUsers = [...users, newUser];
  saveRegisteredUsers(updatedUsers);
  saveStoredUser(newUser);

  return { success: true, user: newUser };
}

export function loginUser(
  phoneNumber: string,
  passcode: string
): { success: boolean; user?: User; error?: string } {
  const users = getRegisteredUsers();
  const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');

  if (!cleanPhone) {
    return { success: false, error: 'Please enter your phone number.' };
  }
  if (!passcode || passcode.length !== 6) {
    return { success: false, error: 'Please enter your 6-digit passcode.' };
  }

  const user = users.find(u => u.phoneNumber.replace(/\s+/g, '') === cleanPhone);
  if (!user) {
    return { success: false, error: 'No account found with this phone number. Please register.' };
  }

  if (user.passcode !== passcode) {
    return { success: false, error: 'Incorrect 6-digit passcode. Please try again.' };
  }

  const updatedUser: User = { ...user, status: 'online', lastSeen: 'Active now' };
  saveStoredUser(updatedUser);
  return { success: true, user: updatedUser };
}

export function logoutUser(): void {
  saveStoredUser(null);
}

export function getStoredChats(): Chat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHATS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage read error for chats:', e);
  }
  return [];
}

export function saveStoredChats(chats: Chat[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  } catch (e) {
    console.error('Storage write error for chats:', e);
  }
}

export function getStoredMessages(): Record<string, Message[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage read error for messages:', e);
  }
  return {};
}

export function saveStoredMessages(messages: Record<string, Message[]>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  } catch (e) {
    console.error('Storage write error for messages:', e);
  }
}

export function getStoredNotifications(): PushNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage read error for notifications:', e);
  }
  return [];
}

export function saveStoredNotifications(notifications: PushNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (e) {
    console.error('Storage write error for notifications:', e);
  }
}

export function getStoredCallLogs(): CallLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CALLS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage read error for calls:', e);
  }
  return [];
}

export function saveStoredCallLogs(calls: CallLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(calls));
  } catch (e) {
    console.error('Storage write error for calls:', e);
  }
}

export function getStoredCalls(): CallLog[] {
  return getStoredCallLogs();
}

export function saveStoredCalls(calls: CallLog[]): void {
  saveStoredCallLogs(calls);
}

export function clearAllSessionData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  } catch (e) {
    console.error('Error clearing session:', e);
  }
}
