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
  appColor?: string; // Standard Electric Sapphire Blue
  glassOpacity?: number; // 0 to 100
  glassBlur?: number; // 0 to 20
  allowReshare?: boolean; // toggle in settings, defaults to true
  allowPhoneNumberVisibility?: boolean; // toggle in settings, defaults to true
  readReceipts?: boolean; // toggle in settings, defaults to true
  statusPrivacy?: 'everyone' | 'contacts' | 'specific';
  statusAllowedUsers?: string[];
  blockedUsers?: string[];
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
  // 5 Classic Blue Variations
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
    id: 'azure',
    name: 'Azure Sky',
    category: 'classic',
    primaryHex: '#0284c7',
    secondaryHex: '#0369a1',
    gradient: 'from-sky-500 via-blue-600 to-sky-600',
    previewClass: 'from-sky-500 to-blue-600',
    glow: 'rgba(2, 132, 199, 0.45)',
    badge: '🌊 Azure Horizon',
    description: 'Bright azure sky and oceanic blue tones',
    icon: '🌊'
  },
  {
    id: 'indigo',
    name: 'Deep Indigo',
    category: 'classic',
    primaryHex: '#4f46e5',
    secondaryHex: '#3730a3',
    gradient: 'from-indigo-600 via-blue-600 to-violet-700',
    previewClass: 'from-indigo-600 to-blue-600',
    glow: 'rgba(79, 70, 229, 0.45)',
    badge: '🔮 Deep Indigo',
    description: 'Rich deep indigo and royal twilight blue',
    icon: '🔮'
  },
  {
    id: 'cobalt',
    name: 'Midnight Cobalt',
    category: 'classic',
    primaryHex: '#1d4ed8',
    secondaryHex: '#1e3a8a',
    gradient: 'from-blue-700 via-indigo-800 to-blue-900',
    previewClass: 'from-blue-700 to-indigo-800',
    glow: 'rgba(29, 78, 216, 0.45)',
    badge: '🌌 Midnight Cobalt',
    description: 'Dark sophisticated cobalt blue depth',
    icon: '🌌'
  },
  {
    id: 'ice',
    name: 'Glacial Ice Blue',
    category: 'classic',
    primaryHex: '#38bdf8',
    secondaryHex: '#0284c7',
    gradient: 'from-sky-400 via-blue-500 to-cyan-500',
    previewClass: 'from-sky-400 to-blue-500',
    glow: 'rgba(56, 189, 248, 0.45)',
    badge: '❄️ Glacial Ice',
    description: 'Crisp ice blue and arctic waters',
    icon: '❄️'
  },

  // 5 Neon Blue Variations
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
    id: 'neon-electric',
    name: 'Neon Electric Blue',
    category: 'neon',
    primaryHex: '#3b82f6',
    secondaryHex: '#1d4ed8',
    gradient: 'from-blue-400 via-indigo-500 to-sky-400',
    previewClass: 'from-blue-400 to-indigo-500',
    glow: 'rgba(59, 130, 246, 0.75)',
    badge: '⚡ Electric Blue',
    description: 'Vibrant electric blue laser beam glow',
    icon: '⚡'
  },
  {
    id: 'neon-deep',
    name: 'Neon Deep Blue',
    category: 'neon',
    primaryHex: '#2563eb',
    secondaryHex: '#1e3a8a',
    gradient: 'from-blue-600 via-cyan-500 to-indigo-600',
    previewClass: 'from-blue-600 to-cyan-500',
    glow: 'rgba(37, 99, 235, 0.75)',
    badge: '💎 Neon Sapphire',
    description: 'Intense luminous neon sapphire glow',
    icon: '💎'
  },
  {
    id: 'neon-aqua',
    name: 'Neon Aqua Marine',
    category: 'neon',
    primaryHex: '#06b6d4',
    secondaryHex: '#0891b2',
    gradient: 'from-cyan-400 via-blue-500 to-teal-400',
    previewClass: 'from-cyan-400 to-blue-500',
    glow: 'rgba(6, 182, 212, 0.75)',
    badge: '🌊 Neon Aqua',
    description: 'Blazing high-energy neon aqua marine',
    icon: '🌊'
  },
  {
    id: 'neon-galaxy',
    name: 'Neon Galaxy Blue',
    category: 'neon',
    primaryHex: '#6366f1',
    secondaryHex: '#4338ca',
    gradient: 'from-indigo-500 via-sky-400 to-blue-600',
    previewClass: 'from-indigo-500 to-sky-400',
    glow: 'rgba(99, 102, 241, 0.75)',
    badge: '🌌 Galaxy Blue',
    description: 'Hypnotic galactic blue laser glow',
    icon: '🌌'
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
  isEdited?: boolean;
  editedAt?: number;
  status: 'sending' | 'pending' | 'sent' | 'delivered' | 'read';
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
  isAdmin?: boolean;
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



