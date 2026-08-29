export interface User {
  id: string;
  fullName: string;
  username: string;
  phoneNumber: string;
  passcode?: string; // 6-digit passcode
  avatar: string;
  avatarType?: 'emoji' | 'initials' | 'custom';
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
  bio?: string;
  role?: string;
  wallpaper?: string;
  createdAt: number;
}

export const WALLPAPER_OPTIONS = [
  { id: 'midnight', name: 'Midnight Neon 🌌', class: 'bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#311042]' },
  { id: 'emerald', name: 'Emerald Velvet 🌿', class: 'bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#042f2e]' },
  { id: 'crimson', name: 'Crimson Dusk 🌹', class: 'bg-gradient-to-br from-[#3b0764] via-[#4c0519] to-[#18181b]' },
  { id: 'cyber', name: 'Cyber Cyan 🌐', class: 'bg-gradient-to-br from-[#082f49] via-[#0f172a] to-[#0284c7]' },
  { id: 'sunset', name: 'Sunset Amber 🌅', class: 'bg-gradient-to-br from-[#451a03] via-[#78350f] to-[#1c1917]' },
  { id: 'amethyst', name: 'Amethyst Nebula 🔮', class: 'bg-gradient-to-br from-[#2e1065] via-[#581c87] to-[#0f172a]' },
  { id: 'minimalist', name: 'Minimalist Carbon 🖤', class: 'bg-gradient-to-br from-[#18181b] via-[#27272a] to-[#09090b]' },
  { id: 'starry', name: 'Starry Emoji ✨', class: 'bg-gradient-to-br from-[#172554] via-[#1e1b4b] to-[#020617]', pattern: '✨ 🌟 💫 🚀 ⭐' },
  { id: 'hearts', name: 'Romantic Hearts ❤️', class: 'bg-gradient-to-br from-[#4c0519] via-[#831843] to-[#1e1b4b]', pattern: '❤️ 💖 💘 💞 💓' },
  { id: 'nature', name: 'Zen Forest 🍃', class: 'bg-gradient-to-br from-[#14532d] via-[#064e3b] to-[#0f172a]', pattern: '🍃 🌿 🍀 🌱 🌲' },
];

export interface MediaMeta {
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  duration?: number;
  waveData?: number[];
  dimensions?: { width: number; height: number };
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string; // formatted time e.g., '11:16'
  createdAt: number; // unix timestamp in ms
  expiresAt?: number; // expiration timestamp (e.g. 24h for images/voices)
  isExpired?: boolean;
  isForwarded?: boolean;
  forwardedFrom?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'voice' | 'file';
  mediaUrl?: string;
  mediaMeta?: MediaMeta;
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
}

export interface Chat {
  id: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  avatar: string;
  avatarType: 'emoji' | 'initials' | 'custom';
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
  draft?: string;
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
    isRead: boolean;
    type?: 'text' | 'image' | 'voice' | 'file';
  };
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isGroup?: boolean;
  creatorId?: string;
  groupMembers?: string[];
  groupAdmins?: string[];
  pinnedMessages?: { id: string; content: string; senderName: string; timestamp: string }[];
  participant: User;
  tags?: string[];
  createdAt: number;
}

export interface CallLog {
  id: string;
  chatId: string;
  callerId?: string;
  receiverId?: string;
  name: string;
  avatar: string;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  timestamp: string;
  duration: string;
  createdAt?: number;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  chatId?: string;
  isRead: boolean;
  type: 'message' | 'system' | 'call';
  avatar?: string;
}

export type TabType = 'chats' | 'users' | 'calls' | 'settings';
export type FilterType = 'all' | 'unread' | 'read' | 'pinned' | 'groups';
