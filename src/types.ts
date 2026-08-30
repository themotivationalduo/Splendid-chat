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
  allowReshare?: boolean; // toggle in settings, defaults to true
  allowPhoneNumberVisibility?: boolean; // toggle in settings, defaults to true
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

export const STATUS_BACKGROUND_OPTIONS = [
  { id: 'indigo', name: 'Deep Indigo 🌌', class: 'from-[#312e81] via-[#1e1b4b] to-[#020617]' },
  { id: 'purple', name: 'Neon Purple 🔮', class: 'from-[#581c87] via-[#3b0764] to-[#090514]' },
  { id: 'rose', name: 'Dark Rose 🌹', class: 'from-[#881337] via-[#4c0519] to-[#0d0205]' },
  { id: 'emerald', name: 'Forest Teal 🌲', class: 'from-[#065f46] via-[#022c22] to-[#01140e]' },
  { id: 'blue', name: 'Ocean Blue 🌊', class: 'from-[#1e3a8a] via-[#172554] to-[#030712]' },
  { id: 'orange', name: 'Rust Sunset 🌅', class: 'from-[#7c2d12] via-[#431407] to-[#0c0301]' },
  { id: 'violet', name: 'Royal Violet 👾', class: 'from-[#6d28d9] via-[#4c1d95] to-[#1e1b4b]' },
  { id: 'crimson', name: 'Warm Pink 💝', class: 'from-[#be185d] via-[#881337] to-[#500724]' },
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
  disappearingMode?: boolean; // 24h automatic deletion for all messages
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

export type TabType = 'chats' | 'users' | 'updates' | 'calls' | 'settings';
export type FilterType = 'all' | 'unread' | 'read' | 'pinned' | 'groups';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  isVideo: boolean;
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
  createdAt: number;
  updatedAt: number;
}

export interface UserStatus {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  userAvatar: string;
  type: 'text' | 'image' | 'voice';
  content: string; // text, base64 image or media, or audio url/base64
  duration?: number; // voice notes duration in seconds
  backgroundColor?: string; // background gradient index or class for text status
  allowReshare?: boolean; // toggle if status can be reshared by others
  createdAt: number;
  expiresAt: number;
}

export interface BroadcastFeed {
  id: string;
  name: string;
  avatar: string; // emoji
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  createdAt: number;
  followers?: string[]; // userIds
}
export interface BroadcastFeedPost {
  id: string;
  feedId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  type: 'text' | 'image' | 'voice';
  content: string;
  duration?: number;
  createdAt: number;
  reactions?: { [userId: string]: string }; // userId -> emoji
}

export interface CallSignal {
  id: string;
  callId: string;
  senderId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  createdAt: number;
}


