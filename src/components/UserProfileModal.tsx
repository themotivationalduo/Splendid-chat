import React, { useState } from 'react';
import { User, Chat } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUser?: User | null;
  onToggleBlockUser?: (userId: string) => void;
  onStartChat?: (user: User) => void;
  onStartVoiceCall?: (user: User) => void;
  onStartVideoCall?: (user: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  onToggleBlockUser,
  onStartChat,
  onStartVoiceCall,
  onStartVideoCall
}) => {
  const [copiedField, setCopiedField] = useState<'username' | 'phone' | null>(null);

  if (!isOpen || !user) return null;

  const handleCopy = (text: string, field: 'username' | 'phone') => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const displayName = user.username ? `@${user.username}` : user.fullName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 mirror-glass backdrop-blur-xl animate-in fade-in duration-75">
      <div 
        className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar relative animate-in zoom-in-95 duration-75"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-user-profile-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors z-10"
        >
          ✕
        </button>

        {/* User Avatar & Header */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20 flex items-center justify-center text-4xl shadow-xl shadow-blue-900/30">
              {user.avatar || '👤'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-[#121418] shadow-md ${
                user.status === 'online'
                  ? 'bg-emerald-500'
                  : user.status === 'away'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
          </div>

          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 justify-center">
            <span>@{user.username || 'user'}</span>
          </h3>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{user.fullName}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-[11px] font-medium text-slate-400">{user.lastSeen || (user.status === 'online' ? 'Active now' : 'Offline')}</span>
          </div>
        </div>

        {/* User Information Card */}
        <div className="p-3.5 rounded-2xl bg-white/20 border border-white/10 space-y-3">
          {/* Username Field */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base text-blue-400 shrink-0">🏷️</span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Username</p>
                <p className="text-xs font-bold text-slate-100 truncate">@{user.username}</p>
              </div>
            </div>
            <button
              id="copy-username-btn"
              onClick={() => handleCopy(`@${user.username}`, 'username')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1 shrink-0"
              title="Copy username"
            >
              <span>{copiedField === 'username' ? '✓' : '📋'}</span>
              <span>{copiedField === 'username' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="h-px bg-white/5" />

          {/* Phone Number Field */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base text-cyan-400 shrink-0">📱</span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone Number</p>
                <p className="text-xs font-mono font-bold text-slate-100 truncate">
                  {user.allowPhoneNumberVisibility !== false ? (user.phoneNumber || 'Not provided') : 'Hidden'}
                </p>
              </div>
            </div>
            {user.phoneNumber && user.allowPhoneNumberVisibility !== false && (
              <button
                id="copy-phone-btn"
                onClick={() => handleCopy(user.phoneNumber, 'phone')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1 shrink-0"
                title="Copy phone number"
              >
                <span>{copiedField === 'phone' ? '✓' : '📋'}</span>
                <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {user.bio && (
            <>
              <div className="h-px bg-white/5" />
              <div className="py-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">About / Bio</p>
                <p className="text-xs text-slate-300 leading-relaxed italic">{user.bio}</p>
              </div>
            </>
          )}
        </div>

        {/* Quick Action Buttons */}
        {!currentUser?.blockedUsers?.includes(user.id) && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Chat / Message */}
            <button
              id="user-profile-chat-btn"
              onClick={() => {
                if (onStartChat) onStartChat(user);
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95 space-y-1"
            >
              <span className="text-base">💬</span>
              <span className="text-[11px]">Message</span>
            </button>

            {/* Voice Call */}
            <button
              id="user-profile-voice-call-btn"
              onClick={() => {
                if (onStartVoiceCall) onStartVoiceCall(user);
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-400 hover:text-emerald-300 font-bold text-xs transition-all active:scale-95 space-y-1"
            >
              <span className="text-base">📞</span>
              <span className="text-[11px]">Voice Call</span>
            </button>

            {/* Video Call */}
            <button
              id="user-profile-video-call-btn"
              onClick={() => {
                if (onStartVideoCall) onStartVideoCall(user);
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 hover:text-cyan-300 font-bold text-xs transition-all active:scale-95 space-y-1"
            >
              <span className="text-base">📹</span>
              <span className="text-[11px]">Video Call</span>
            </button>
          </div>
        )}

        {currentUser && currentUser.id !== user.id && (
          <div className="pt-2">
            <button
              onClick={() => {
                if (onToggleBlockUser) onToggleBlockUser(user.id);
                // We don't automatically close so they can see it changed, but maybe we should?
              }}
              className={`w-full py-2.5 rounded-2xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                currentUser.blockedUsers?.includes(user.id)
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-red-400 hover:text-red-300'
              }`}
            >
              <span>{currentUser.blockedUsers?.includes(user.id) ? '🚫 Unblock Contact' : '🚫 Block Contact'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
