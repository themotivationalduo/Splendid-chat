import React, { useState, useEffect } from 'react';
import { User as UserType, WALLPAPER_OPTIONS, APP_COLOR_OPTIONS } from '../types';
import { checkUsernameAvailable } from '../services/firestoreService';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdateUser: (updated: Partial<UserType>) => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  allUsers?: UserType[];
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
  allUsers,
  onToggleTheme
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
  const [username, setUsername] = useState(currentUser.username);
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber);
  const [passcode, setPasscode] = useState(currentUser.passcode || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar || '👤');
  const [selectedWallpaper, setSelectedWallpaper] = useState(currentUser.wallpaper || 'midnight');
  const [selectedAppColor, setSelectedAppColor] = useState(currentUser.appColor || 'ruby');
  const [allowReshare, setAllowReshare] = useState(currentUser.allowReshare !== false);
  const [allowPhoneNumberVisibility, setAllowPhoneNumberVisibility] = useState(currentUser.allowPhoneNumberVisibility !== false);
  const [statusPrivacy, setStatusPrivacy] = useState(currentUser.statusPrivacy || 'everyone');
  const [statusAllowedUsers, setStatusAllowedUsers] = useState<string[]>(currentUser.statusAllowedUsers || []);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('profile');
  const [isWallpaperDropdownOpen, setIsWallpaperDropdownOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean | null; message: string | null }>({
    available: true,
    message: null
  });

  useEffect(() => {
    // Sync with currentUser prop updates
    setAllowReshare(currentUser.allowReshare !== false);
    setAllowPhoneNumberVisibility(currentUser.allowPhoneNumberVisibility !== false);
  }, [currentUser?.allowReshare, currentUser?.allowPhoneNumberVisibility]);

  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean || clean === currentUser.username.toLowerCase()) {
      setIsCheckingUsername(false);
      setUsernameStatus({ available: true, message: null });
      return;
    }

    if (clean.length < 3) {
      setIsCheckingUsername(false);
      setUsernameStatus({ available: false, message: 'Username must be at least 3 characters long.' });
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailable(clean, currentUser.id);
      setIsCheckingUsername(false);
      setUsernameStatus({ available: res.available, message: res.message });
    }, 400);

    return () => clearTimeout(timer);
  }, [username, currentUser.id, currentUser.username]);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const wallpaperDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wallpaperDropdownRef.current && !wallpaperDropdownRef.current.contains(event.target as Node)) {
        setIsWallpaperDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanU = username.trim().toLowerCase().replace(/^@/, '');
    if (cleanU !== currentUser.username.toLowerCase()) {
      const checkRes = await checkUsernameAvailable(cleanU, currentUser.id);
      if (!checkRes.available) {
        setErrorMessage(checkRes.message);
        return;
      }
    }

    try {
      onUpdateUser({
        fullName: fullName.trim() || currentUser.fullName,
        username: cleanU || currentUser.username,
        phoneNumber: phoneNumber.trim() || currentUser.phoneNumber,
        passcode: passcode.length === 6 ? passcode : currentUser.passcode,
        bio: bio.trim(),
        avatar: selectedAvatar,
        wallpaper: selectedWallpaper,
        appColor: selectedAppColor,
        allowReshare: allowReshare,
        allowPhoneNumberVisibility: allowPhoneNumberVisibility,
        statusPrivacy: statusPrivacy,
        statusAllowedUsers: statusAllowedUsers
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    }
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

        {/* Error / Success Toast */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
            <span className="text-base">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Edit Form using professional accordion dropdowns */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* ACCORDION 1: 👤 PROFILE INFO */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'profile' ? null : 'profile')}
              className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] transition-all select-none"
            >
              <span className="flex items-center gap-2">
                <span>👤</span> Profile Information
              </span>
              <span>{activeAccordion === 'profile' ? '▲' : '▼'}</span>
            </button>
            
            {activeAccordion === 'profile' && (
              <div className="p-4 space-y-3.5 border-t border-white/5 animate-in slide-in-from-top-1 duration-100">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Username</label>
                    {isCheckingUsername && <span className="text-[10px] text-amber-400 font-medium animate-pulse">Checking...</span>}
                    {!isCheckingUsername && usernameStatus.available === true && username.toLowerCase() !== currentUser.username.toLowerCase() && <span className="text-[10px] text-emerald-400 font-bold">Available</span>}
                    {!isCheckingUsername && usernameStatus.available === false && <span className="text-[10px] text-rose-400 font-bold">Taken</span>}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs text-slate-400">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full h-11 pl-7 pr-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">About Bio</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Hey there! I am using SPLENDID CHAT."
                    className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 2: 🎭 PROFILE AVATAR */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'avatar' ? null : 'avatar')}
              className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] transition-all select-none"
            >
              <span className="flex items-center gap-2">
                <span>🎭</span> Profile Face Avatar ({selectedAvatar})
              </span>
              <span>{activeAccordion === 'avatar' ? '▲' : '▼'}</span>
            </button>
            
            {activeAccordion === 'avatar' && (
              <div className="p-4 border-t border-white/5 animate-in slide-in-from-top-1 duration-100 space-y-2">
                <p className="text-[10px] text-slate-400 font-medium text-left">Select a face emoji to represent you in groups and profile screens:</p>
                <div className="grid grid-cols-5 gap-2 p-2 rounded-xl bg-black/20 border border-white/5 max-h-36 overflow-y-auto custom-scrollbar">
                  {FACE_EMOJIS_50.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                        selectedAvatar === emoji
                          ? 'bg-red-600/30 border border-red-500 scale-105 shadow-md'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION: 🎨 ENTIRE APP COLOR THEME SELECTOR (5 Classic & 5 Neon) */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Entire App Color Theme (5 Classic & 5 Neon)</label>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-300">Classic Colors</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {APP_COLOR_OPTIONS.filter(c => c.category === 'classic').map((color) => {
                    const isSelected = selectedAppColor === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedAppColor(color.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer border relative ${
                          isSelected
                            ? 'bg-white/25 border-white ring-2 ring-red-500 scale-105 shadow-md'
                            : 'bg-black/30 border-white/10 hover:bg-white/10'
                        }`}
                        title={color.name}
                      >
                        <span className="text-lg">{color.icon}</span>
                        <span className="text-[8px] font-bold text-white truncate w-full text-center mt-0.5">{color.name.split(' ')[0]}</span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-[8px] text-white flex items-center justify-center">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[10px] uppercase font-bold text-cyan-400">Neon Glow Colors</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {APP_COLOR_OPTIONS.filter(c => c.category === 'neon').map((color) => {
                    const isSelected = selectedAppColor === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedAppColor(color.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer border relative ${
                          isSelected
                            ? 'bg-white/20 border-cyan-400 ring-2 ring-cyan-400 scale-105 shadow-[0_0_12px_rgba(0,242,254,0.5)]'
                            : 'bg-black/40 border-white/10 hover:bg-white/10'
                        }`}
                        title={color.name}
                      >
                        <span className="text-lg">{color.icon}</span>
                        <span className="text-[8px] font-bold text-cyan-200 truncate w-full text-center mt-0.5">{color.name.split(' ')[1] || color.name}</span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 text-[8px] text-slate-950 font-bold flex items-center justify-center">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ACCORDION 4: ⚙️ STATUS PRIVACY & RESHARING */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'privacy' ? null : 'privacy')}
              className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] transition-all select-none"
            >
              <span className="flex items-center gap-2">
                <span>🛡️</span> Privacy & Status Settings
              </span>
              <span>{activeAccordion === 'privacy' ? '▲' : '▼'}</span>
            </button>
            
            {activeAccordion === 'privacy' && (
              <div className="p-4 border-t border-white/5 animate-in slide-in-from-top-1 duration-100 space-y-3">
                <div className="flex flex-col bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-3">
                  <div className="text-left">
                    <h5 className="text-xs font-bold text-slate-200">Status Privacy</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Control who can view your status updates.
                    </p>
                  </div>
                  <select
                    value={statusPrivacy}
                    onChange={(e) => setStatusPrivacy(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-red-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts Only</option>
                    <option value="specific">Specific Contacts</option>
                  </select>
                  
                  {statusPrivacy === 'specific' && allUsers && (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      <p className="text-[10px] text-slate-400">Select allowed users:</p>
                      {allUsers.filter(u => u.id !== currentUser.id).map(user => {
                        const isSelected = statusAllowedUsers.includes(user.id);
                        return (
                          <div 
                            key={user.id} 
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-red-500/20 border-red-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            onClick={() => {
                              if (isSelected) {
                                setStatusAllowedUsers(prev => prev.filter(id => id !== user.id));
                              } else {
                                setStatusAllowedUsers(prev => [...prev, user.id]);
                              }
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                              {user.avatar || '👤'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-white truncate">{user.fullName}</p>
                            </div>
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'bg-red-500 border-red-500' : 'border-slate-500'}`}>
                              {isSelected && <span className="text-[8px] text-white">✓</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <div className="pr-2 text-left">
                    <h5 className="text-xs font-bold text-slate-200">Allow Status Reshare</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Let other users reshare your active status updates onto their own profiles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowReshare(!allowReshare)}
                    className="w-12 h-6 rounded-full transition-all relative cursor-pointer focus:outline-none"
                    style={{ backgroundColor: allowReshare ? '#dc2626' : '#374151' }}
                  >
                    <span 
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: allowReshare ? '24px' : '4px' }}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <div className="pr-2 text-left">
                    <h5 className="text-xs font-bold text-slate-200">Show Phone Number</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Make your phone number visible to others when they start a chat using your username.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowPhoneNumberVisibility(!allowPhoneNumberVisibility)}
                    className="w-12 h-6 rounded-full transition-all relative cursor-pointer focus:outline-none"
                    style={{ backgroundColor: allowPhoneNumberVisibility ? '#dc2626' : '#374151' }}
                  >
                    <span 
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: allowPhoneNumberVisibility ? '24px' : '4px' }}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 5: 🔒 ACCOUNT SECURITY & PIN */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'security' ? null : 'security')}
              className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] transition-all select-none"
            >
              <span className="flex items-center gap-2">
                <span>🔒</span> Security & Passcode
              </span>
              <span>{activeAccordion === 'security' ? '▲' : '▼'}</span>
            </button>
            
            {activeAccordion === 'security' && (
              <div className="p-4 border-t border-white/5 animate-in slide-in-from-top-1 duration-100 space-y-3.5 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">6-Digit Passcode PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <p className="text-[9px] text-slate-400">Provide a 6-digit pin passcode to lock this account on your browser session.</p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Save Button */}
          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
          >
            <span>{savedSuccess ? '✅ Settings Updated!' : '💾 Save Settings'}</span>
          </button>
        </form>

        {/* Theme Toggle section */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-200">App Appearance</div>
              <div className="text-[10px] text-slate-400">
                {theme === 'dark' ? 'Dark Mode Active' : 'Light Glass-morphism Active'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-red-600 text-white shadow-md shadow-red-600/30'
            }`}
          >
            <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
          </button>
        </div>

        {/* Sign Out Section */}
        <div className="pt-1">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full h-11 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <span>🚪</span>
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
