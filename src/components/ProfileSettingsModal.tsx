import React, { useState, useEffect, useRef } from 'react';
import { User as UserType, WALLPAPER_OPTIONS } from '../types';
import { checkUsernameAvailable, updateUserProfile, sendAdminNotification } from '../services/firestoreService';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdateUser: (updated: Partial<UserType>) => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  allUsers?: UserType[];
  onToggleTheme: () => void;
  onShowSuccessModal?: (type: 'profile' | 'logout' | 'generic', title: string, subtitle?: string) => void;
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
  onToggleTheme,
  onShowSuccessModal
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
  const [username, setUsername] = useState(currentUser.username);
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber);
  const [passcode, setPasscode] = useState(currentUser.passcode || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar || '👤');
  const [selectedWallpaper, setSelectedWallpaper] = useState(currentUser.wallpaper || 'midnight');
  const [glassOpacity, setGlassOpacity] = useState(currentUser.glassOpacity ?? (theme === 'dark' ? 82 : 85));
  const [allowReshare, setAllowReshare] = useState(currentUser.allowReshare !== false);
  const [allowPhoneNumberVisibility, setAllowPhoneNumberVisibility] = useState(currentUser.allowPhoneNumberVisibility !== false);
  const [readReceipts, setReadReceipts] = useState(currentUser.readReceipts !== false);
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

  const isAdmin = currentUser.phoneNumber === '+2348082076038' || currentUser.username === 'Splenzzy' || currentUser.username === '@Splenzzy';
  const [adminNotificationMessage, setAdminNotificationMessage] = useState('');

  useEffect(() => {
    // Sync with currentUser prop updates
    setAllowReshare(currentUser.allowReshare !== false);
    setAllowPhoneNumberVisibility(currentUser.allowPhoneNumberVisibility !== false);
    setReadReceipts(currentUser.readReceipts !== false);
  }, [currentUser?.allowReshare, currentUser?.allowPhoneNumberVisibility, currentUser?.readReceipts]);

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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const wallpaperDropdownRef = useRef<HTMLDivElement>(null);

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
        appColor: 'sapphire',
        glassOpacity: glassOpacity,
        allowReshare: allowReshare,
        allowPhoneNumberVisibility: allowPhoneNumberVisibility,
        readReceipts: readReceipts,
        statusPrivacy: statusPrivacy,
        statusAllowedUsers: statusAllowedUsers
      });
      setSavedSuccess(true);
      if (onShowSuccessModal) {
        onShowSuccessModal('profile', 'Profile Updated Successfully!', 'Your profile details and preferences are now saved.');
      }
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
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl ring-2 ring-blue-500/40 shadow-md">
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
          <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
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
                    className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Username</label>
                    {isCheckingUsername && <span className="text-[10px] text-amber-400 font-medium animate-pulse">Checking...</span>}
                    {!isCheckingUsername && usernameStatus.available === true && username.toLowerCase() !== currentUser.username.toLowerCase() && <span className="text-[10px] text-emerald-400 font-bold">Available</span>}
                    {!isCheckingUsername && usernameStatus.available === false && <span className="text-[10px] text-indigo-400 font-bold">Taken</span>}
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
                          ? 'bg-blue-600/30 border border-blue-500 scale-105 shadow-md'
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

          {/* ACCORDION 3: 🖼️ WALLPAPER BACKGROUND */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'wallpaper' ? null : 'wallpaper')}
              className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] transition-all select-none"
            >
              <span className="flex items-center gap-2">
                <span>🖼️</span> Chat Wallpaper Background
              </span>
              <span>{activeAccordion === 'wallpaper' ? '▲' : '▼'}</span>
            </button>
            
            {activeAccordion === 'wallpaper' && (
              <div className="p-4 border-t border-white/5 animate-in slide-in-from-top-1 duration-100 space-y-2">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {WALLPAPER_OPTIONS.map((wp) => (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => setSelectedWallpaper(wp.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        selectedWallpaper === wp.id
                          ? 'border-blue-500 bg-blue-500/20 text-white ring-1 ring-blue-500'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg ${wp.class} border border-white/20 shrink-0`} />
                      <span className="truncate">{wp.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION: 🪞 MIRROR GLASS OPACITY */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Mirror Glass Transparency</label>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>Transparent</span>
                <span>{glassOpacity}%</span>
                <span>Opaque</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={glassOpacity} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setGlassOpacity(val);
                  onUpdateUser({ glassOpacity: val });
                }}
                className="w-full accent-blue-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
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
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
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
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
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
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
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
                    style={{ backgroundColor: allowReshare ? '#2563eb' : '#374151' }}
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
                    style={{ backgroundColor: allowPhoneNumberVisibility ? '#2563eb' : '#374151' }}
                  >
                    <span 
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: allowPhoneNumberVisibility ? '24px' : '4px' }}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <div className="pr-2 text-left">
                    <h5 className="text-xs font-bold text-slate-200">Read Receipts</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Show blue ticks to let people know when you've read their messages.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReadReceipts(!readReceipts)}
                    className="w-12 h-6 rounded-full transition-all relative cursor-pointer focus:outline-none"
                    style={{ backgroundColor: readReceipts ? '#2563eb' : '#374151' }}
                  >
                    <span 
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: readReceipts ? '24px' : '4px' }}
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
                    className="w-full h-11 px-3.5 rounded-xl mirror-glass-input border border-white/10 text-xs text-white font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[9px] text-slate-400">Provide a 6-digit pin passcode to lock this account on your browser session.</p>
                </div>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="rounded-2xl border border-indigo-500/30 overflow-hidden bg-indigo-500/5 mt-4">
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === 'admin' ? null : 'admin')}
                className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all select-none"
              >
                <span className="flex items-center gap-2">
                  <span>🛡️</span> Admin Dashboard
                </span>
                <span>{activeAccordion === 'admin' ? '▲' : '▼'}</span>
              </button>
              
              {activeAccordion === 'admin' && (
                <div className="p-4 border-t border-indigo-500/20 animate-in slide-in-from-top-1 duration-100 space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-300">Global Notification</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={adminNotificationMessage}
                        onChange={(e) => setAdminNotificationMessage(e.target.value)}
                        placeholder="Type notification message..."
                        className="flex-1 h-10 px-3 rounded-xl mirror-glass-input text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!adminNotificationMessage.trim() || !allUsers) return;
                          for (const u of allUsers) {
                            if (u.id !== currentUser.id) {
                              await sendAdminNotification(u.id, "Admin Alert", adminNotificationMessage, currentUser.avatar || '🛡️');
                            }
                          }
                          setAdminNotificationMessage('');
                          alert('Sent to all users!');
                        }}
                        className="h-10 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-left mt-4">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-300">User Management</label>
                    <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                      {allUsers?.filter(u => u.id !== currentUser.id).map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">{u.avatar || '👤'}</span>
                            <div className="text-left max-w-[100px]">
                              <p className="text-[10px] font-bold text-white truncate">{u.fullName}</p>
                              <p className="text-[9px] text-slate-400 truncate">@{u.username}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Reset passcode to 123456 for ${u.username}?`)) {
                                await updateUserProfile(u.id, { passcode: '123456' });
                                alert(`Reset passcode for ${u.username}`);
                              }
                            }}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-lg text-[9px] font-bold border border-white/5 transition-colors"
                          >
                            Reset PIN
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Save Button */}
          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
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
                : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            }`}
          >
            <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
          </button>
        </div>

        {/* Sign Out Section - Red Button */}
        <div className="pt-1">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border border-blue-500/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <span>🚪</span>
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
