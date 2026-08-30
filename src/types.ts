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
  appColor?: string; // 5 classic or 5 neon app colors
  allowReshare?: boolean; // toggle in settings, defaults to true
  allowPhoneNumberVisibility?: boolean; // toggle in settings, defaults to true
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
  createdAt: number;
}

export interface AppColorTheme {
  id: string;
  name: string;
  category: 'classic' | 'neon';
  primaryHex: string;
  secondaryHex: string;
  gradient: string;
  previewClass: string;
  glow: string;
  badge: string;
  description: string;
  icon: string;
}

export const APP_COLOR_OPTIONS: AppColorTheme[] = [
  // 5 Classic Colors
  {
    id: 'ruby',
    name: 'Ruby Crimson',
    category: 'classic',
    primaryHex: '#e11d48',
    secondaryHex: '#991b1b',
    gradient: 'from-red-600 via-rose-600 to-red-700',
    previewClass: 'from-red-600 to-rose-600',
    glow: 'rgba(225, 29, 72, 0.45)',
    badge: '🌹 Classic Ruby',
    description: 'Deep crimson & ruby red tones',
    icon: '🌹'
  },
  {
    id: 'sapphire',
    name: 'Sapphire Blue',
    category: 'classic',
    primaryHex: '#2563eb',
    secondaryHex: '#1e40af',
    gradient: 'from-blue-600 via-indigo-600 to-blue-700',
    previewClass: 'from-blue-600 to-indigo-600',
    glow: 'rgba(37, 99, 235, 0.45)',
    badge: '💎 Royal Sapphire',
    description: 'Calm oceanic royal blues',
    icon: '💎'
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    category: 'classic',
    primaryHex: '#059669',
    secondaryHex: '#065f46',
    gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
    previewClass: 'from-emerald-600 to-teal-600',
    glow: 'rgba(5, 150, 105, 0.45)',
    badge: '🌿 Lush Emerald',
    description: 'Refreshing botanical emerald & teal',
    icon: '🌿'
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    category: 'classic',
    primaryHex: '#7c3aed',
    secondaryHex: '#5b21b6',
    gradient: 'from-violet-600 via-purple-600 to-violet-700',
    previewClass: 'from-violet-600 to-purple-600',
    glow: 'rgba(124, 58, 237, 0.45)',
    badge: '🔮 Imperial Violet',
    description: 'Mystic amethyst & deep royal purple',
    icon: '🔮'
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    category: 'classic',
    primaryHex: '#d97706',
    secondaryHex: '#92400e',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    previewClass: 'from-amber-500 to-orange-600',
    glow: 'rgba(217, 119, 6, 0.45)',
    badge: '🌅 Golden Amber',
    description: 'Warm sunset amber & golden honey',
    icon: '🌅'
  },

  // 5 Neon Colors
  {
    id: 'neon-cyan',
    name: 'Neon Cyber Cyan',
    category: 'neon',
    primaryHex: '#00f2fe',
    secondaryHex: '#0284c7',
    gradient: 'from-cyan-400 via-teal-300 to-sky-400',
    previewClass: 'from-[#00f2fe] to-[#0284c7]',
    glow: 'rgba(0, 242, 254, 0.75)',
    badge: '⚡ Cyber Cyan',
    description: 'Futuristic electric neon cyan with laser glow',
    icon: '⚡'
  },
  {
    id: 'neon-lime',
    name: 'Neon Matrix Lime',
    category: 'neon',
    primaryHex: '#39ff14',
    secondaryHex: '#16a34a',
    gradient: 'from-lime-400 via-green-400 to-emerald-400',
    previewClass: 'from-[#39ff14] to-[#16a34a]',
    glow: 'rgba(57, 255, 20, 0.75)',
    badge: '🧪 Radioactive Lime',
    description: 'High-voltage matrix electric lime glow',
    icon: '🧪'
  },
  {
    id: 'neon-pink',
    name: 'Neon Synth Pink',
    category: 'neon',
    primaryHex: '#ff007f',
    secondaryHex: '#c026d3',
    gradient: 'from-pink-500 via-fuchsia-500 to-rose-500',
    previewClass: 'from-[#ff007f] to-[#c026d3]',
    glow: 'rgba(255, 0, 127, 0.75)',
    badge: '💖 Synth Magenta',
    description: 'Vibrant cyberpunk neon magenta glow',
    icon: '💖'
  },
  {
    id: 'neon-orange',
    name: 'Neon Solar Orange',
    category: 'neon',
    primaryHex: '#ff5f1f',
    secondaryHex: '#ea580c',
    gradient: 'from-orange-500 via-amber-400 to-red-500',
    previewClass: 'from-[#ff5f1f] to-[#ea580c]',
    glow: 'rgba(255, 95, 31, 0.75)',
    badge: '🔥 Solar Laser',
    description: 'Blazing high-energy neon tangerine orange',
    icon: '🔥'
  },
  {
    id: 'neon-purple',
    name: 'Neon Ultraviolet',
    category: 'neon',
    primaryHex: '#bf00ff',
    secondaryHex: '#7e22ce',
    gradient: 'from-fuchsia-500 via-purple-500 to-indigo-500',
    previewClass: 'from-[#bf00ff] to-[#7e22ce]',
    glow: 'rgba(191, 0, 255, 0.75)',
    badge: '⚡ Ultraviolet',
    description: 'Hypnotic ultraviolet laser beam glow',
    icon: '✨'
  }
];

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
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
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
    type?: 'text' | 'image' | 'voice' | 'file';
    mediaUrl?: string;
    mediaMeta?: MediaMeta;
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
  pinOrder?: number;
  isMuted?: boolean;
  isGroup?: boolean;
  creatorId?: string;
  groupMembers?: string[];
  groupAdmins?: string[];
  pinnedMessages?: { id: string; content: string; senderName: string; timestamp: string }[];
  participant: User;
  tags?: string[];
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
  createdAt: number;
  disappearingMode?: boolean; // 24h automatic deletion for all messages
  bubbleColor?: string; // HEX color for user messages
  accentColor?: string; // HEX color for play buttons, progress bars, etc.
  description?: string; // Group description or user bio
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
  senderId?: string;
  isRead: boolean;
  type: 'message' | 'system' | 'call';
  avatar?: string;
  createdAt?: number;
}

export type TabType = 'chats' | 'users' | 'groups' | 'updates' | 'calls' | 'settings';
export type FilterType = 'all' | 'unread' | 'read' | 'pinned' | 'groups';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  isVideo: boolean;
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
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
  likes?: string[];
  views?: string[];
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
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
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
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
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
  createdAt: number;
  reactions?: { [userId: string]: string }; // userId -> emoji
}

export interface CallSignal {
  id: string;
  callId: string;
  senderId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
  createdAt: number;
}

export function getThemeStyles(appColor?: string) {
  const theme = APP_COLOR_OPTIONS.find(c => c.id === appColor) || APP_COLOR_OPTIONS[0];
  return {
    id: theme.id,
    name: theme.name,
    primaryHex: theme.primaryHex,
    secondaryHex: theme.secondaryHex,
    gradient: theme.gradient,
    glow: theme.glow,
    badge: theme.badge,
    primaryStyle: {
      backgroundColor: theme.primaryHex,
      boxShadow: `0 4px 20px ${theme.glow}`
    },
    gradientStyle: {
      backgroundImage: `linear-gradient(to right, ${theme.primaryHex}, ${theme.secondaryHex})`,
      boxShadow: `0 4px 20px ${theme.glow}`
    },
    borderStyle: {
      borderColor: theme.primaryHex
    }
  };
}



