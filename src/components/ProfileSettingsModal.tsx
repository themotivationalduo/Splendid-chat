import React, { useState } from 'react';
import { User as UserType, WALLPAPER_OPTIONS } from '../types';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdateUser: (updated: Partial<UserType>) => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const FACE_EMOJIS_50 = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😙', '😚',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯'
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout,
  theme,
  onToggleTheme
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
  const [username, setUsername] = useState(currentUser.username);
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber);
  const [passcode, setPasscode] = useState(currentUser.passcode || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar || '👤');
  const [selectedWallpaper, setSelectedWallpaper] = useState(currentUser.wallpaper || 'midnight');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      fullName: fullName.trim() || currentUser.fullName,
      username: username.trim().toLowerCase().replace(/^@/, '') || currentUser.username,
      phoneNumber: phoneNumber.trim() || currentUser.phoneNumber,
      passcode: passcode.length === 6 ? passcode : currentUser.passcode,
      bio: bio.trim(),
      avatar: selectedAvatar,
      wallpaper: selectedWallpaper
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-xl animate-in fade-in duration-75">
      <div className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-white/10 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto custom-scrollbar relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white text-xl ring-2 ring-red-500/40 shadow-md">
              {selectedAvatar}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>{fullName || currentUser.username}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </h3>
              <p className="text-xs text-slate-400">@{username} • {phoneNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 text-base"
          >
            ❌
          </button>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Avatar selector (50 Face Emojis) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🎨</span>
                <span>Choose Profile Face Emoji ({FACE_EMOJIS_50.length} Available)</span>
              </span>
              <span className="text-[10px] text-red-400 font-bold">Selected: {selectedAvatar}</span>
            </label>
            <div className="grid grid-cols-10 gap-1.5 p-2 rounded-2xl mirror-glass-input border border-white/10 max-h-36 overflow-y-auto custom-scrollbar">
              {FACE_EMOJIS_50.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all ${
                    selectedAvatar === emoji
                      ? 'bg-red-600/40 border-2 border-red-500 scale-110 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 border border-white/5'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>👤</span>
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>🏷️</span>
              <span>Username (@username)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xs text-slate-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full h-11 pl-7 pr-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 pl-1">
              Updating your username will automatically update your profile across all chats with other users in real-time.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>📱</span>
              <span>Phone Number</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>🔢</span>
              <span>6-Digit Passcode</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>✍️</span>
              <span>About Bio</span>
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Hey there! I am using SPLENDID CHAT."
              className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Chat Room Wallpaper Picker */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🖼️</span>
                <span>Chat Room Wallpaper ({WALLPAPER_OPTIONS.length} Themes)</span>
              </span>
              <span className="text-[10px] text-red-400 font-bold capitalize">
                {WALLPAPER_OPTIONS.find(w => w.id === selectedWallpaper)?.name || 'Selected'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl mirror-glass-input border border-white/10 max-h-44 overflow-y-auto custom-scrollbar">
              {WALLPAPER_OPTIONS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => setSelectedWallpaper(wp.id)}
                  className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 ${wp.class} ${
                    selectedWallpaper === wp.id
                      ? 'ring-2 ring-red-500 scale-[1.02] shadow-lg'
                      : 'opacity-80 hover:opacity-100 border border-white/10'
                  }`}
                >
                  <span className="text-lg shrink-0">
                    {wp.id === 'starry' ? '✨' : wp.id === 'hearts' ? '❤️' : wp.id === 'nature' ? '🍃' : '🎨'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{wp.name}</div>
                    <div className="text-[9px] text-slate-300 truncate">{wp.pattern || 'Abstract Gradient'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-98"
          >
            <span>{savedSuccess ? '✅ Profile Saved & Synced!' : '💾 Save Profile Changes'}</span>
          </button>
        </form>

        {/* Theme Toggle */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
            <div>
              <div className="text-xs font-bold text-slate-200">App Appearance</div>
              <div className="text-[10px] text-slate-400">
                {theme === 'dark' ? 'Dark Mode Active' : 'Light Glass-morphism Active'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-red-600 text-white shadow-md shadow-red-600/30'
            }`}
          >
            <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
          </button>
        </div>

        {/* Account Security Status */}
        <div className="p-3.5 rounded-2xl mirror-glass-input border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <span className="text-xs font-bold text-slate-200">Account Security</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              Secure
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Authenticated via verified Phone Number & 6-digit PIN.
          </p>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full h-11 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span>🚪</span>
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
