import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { normalizePhoneNumber, subscribeToUsers } from '../services/firestoreService';
import { playGlassChimeSound } from '../services/audioService';

interface StartNewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onStartChatWithUser: (user: User) => void;
  onOpenCreateGroup: () => void;
}

export const StartNewChatModal: React.FC<StartNewChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartChatWithUser,
  onOpenCreateGroup
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not_found' | 'self'>('idle');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [allFirestoreUsers, setAllFirestoreUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Real-time listener for all registered users across Firestore
    const unsubscribe = subscribeToUsers((users) => {
      setAllFirestoreUsers(users);
    });

    setSearchInput('');
    setSearchStatus('idle');
    setMatchedUser(null);

    return () => unsubscribe();
  }, [isOpen]);

  const registeredUsers = allFirestoreUsers.filter(u => 
    currentUser ? u.id !== currentUser.id && normalizePhoneNumber(u.phoneNumber) !== normalizePhoneNumber(currentUser.phoneNumber) : true
  );

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    const query = val.trim().toLowerCase();

    if (!query || query.length < 2) {
      setSearchStatus('idle');
      setMatchedUser(null);
      return;
    }

    const cleanUsername = query.startsWith('@') ? query.slice(1) : query;
    const cleanDigits = normalizePhoneNumber(query);

    // Check if searching for self
    if (currentUser) {
      const isSelfPhone = cleanDigits && normalizePhoneNumber(currentUser.phoneNumber) === cleanDigits;
      const isSelfUsername = currentUser.username.toLowerCase() === cleanUsername;
      if (isSelfPhone || isSelfUsername) {
        setSearchStatus('self');
        setMatchedUser(null);
        return;
      }
    }

    // Search across all Firestore users by username, phone number, or full name
    const found = allFirestoreUsers.find(u => {
      if (currentUser && u.id === currentUser.id) return false;
      const uUsername = (u.username || '').toLowerCase();
      const uFullName = (u.fullName || '').toLowerCase();
      const uNorm = normalizePhoneNumber(u.phoneNumber);

      // Exact or partial username match
      if (uUsername === cleanUsername || (cleanUsername.length >= 3 && uUsername.includes(cleanUsername))) {
        return true;
      }
      // Exact or partial phone number match
      if (cleanDigits && cleanDigits.length >= 3 && (uNorm === cleanDigits || uNorm.endsWith(cleanDigits) || cleanDigits.endsWith(uNorm))) {
        return true;
      }
      // Full name match
      if (uFullName === cleanUsername || (cleanUsername.length >= 4 && uFullName.includes(cleanUsername))) {
        return true;
      }
      return false;
    });

    if (found) {
      setSearchStatus('found');
      setMatchedUser(found);
    } else {
      setSearchStatus(query.length >= 3 ? 'not_found' : 'idle');
      setMatchedUser(null);
    }
  };

  const handleStartChat = (user: User) => {
    playGlassChimeSound('incoming');
    onStartChatWithUser(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-md animate-in fade-in duration-75">
      <div
        className="w-full max-w-md p-6 rounded-3xl mirror-glass-card shadow-2xl border border-white/10 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-75"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-xl shadow-inner">
              💬
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Find Contact & Start Chat</h3>
              <p className="text-[11px] text-slate-400">Search by @username or phone number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Input Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            🔍 Enter Username (@username) or Phone Number
          </label>
          <div className="relative">
            <input
              id="new-chat-contact-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="e.g. @alex, +1 (555) 019-2834, or Sarah"
              className="w-full pl-4 pr-10 py-3 rounded-2xl mirror-glass-input border border-white/10 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
              autoFocus
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Status / User Matched Card */}
        {searchStatus === 'found' && matchedUser && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-75">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Contact Account Found
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {matchedUser.allowPhoneNumberVisibility !== false || searchInput === matchedUser.phoneNumber ? matchedUser.phoneNumber : 'Hidden'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl mirror-glass-input border border-white/10 flex items-center justify-center text-2xl shadow-inner shrink-0">
                {matchedUser.avatar || '👤'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-extrabold text-white truncate">@{matchedUser.username}</h4>
                <p className="text-xs text-slate-300 truncate">{matchedUser.fullName}</p>
                {matchedUser.bio && (
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{matchedUser.bio}</p>
                )}
              </div>
            </div>

            <button
              id="open-chat-matched-user-btn"
              onClick={() => handleStartChat(matchedUser)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>Open Chat with @{matchedUser.username}</span>
            </button>
          </div>
        )}

        {searchStatus === 'self' && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2.5 animate-in fade-in duration-75">
            <span className="text-lg">ℹ️</span>
            <span>This is your own profile. You can start chats with other registered contacts.</span>
          </div>
        )}

        {searchStatus === 'not_found' && searchInput.length >= 3 && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in duration-75">
            <span className="text-lg">🔍</span>
            <div>
              <p className="font-semibold">No registered contact found for "{searchInput}"</p>
              <p className="text-[11px] text-rose-400/80 mt-0.5">
                Check the username or pick from the registered contacts directory below.
              </p>
            </div>
          </div>
        )}

        {/* Create Group Chat Option Button */}
        <div
          onClick={() => {
            onClose();
            onOpenCreateGroup();
          }}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600/20 to-rose-600/20 hover:from-red-600/30 hover:to-rose-600/30 border border-red-500/30 flex items-center justify-between cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 flex items-center justify-center text-xl text-white group-hover:scale-105 transition-transform">
              👥
            </div>
            <div>
              <div className="text-xs font-bold text-white">Create New Group Chat</div>
              <div className="text-[10px] text-slate-300">Message multiple contacts together</div>
            </div>
          </div>
          <span className="text-red-400 font-bold text-sm">➔</span>
        </div>

        {/* Directory of Registered Contacts on SPLENDID CHAT */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>👥 Registered Contacts Directory</span>
            <span className="text-[11px] text-slate-500">{registeredUsers.length} contact{registeredUsers.length === 1 ? '' : 's'}</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5 custom-scrollbar">
            {registeredUsers.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-slate-500 text-xs">
                No other contacts registered yet. Create another contact or share the app to connect!
              </div>
            ) : (
              registeredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleStartChat(u)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                      {u.avatar || '👤'}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-200 group-hover:text-red-400 truncate">
                        @{u.username}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {u.fullName} • 📱 {u.allowPhoneNumberVisibility !== false ? u.phoneNumber : 'Hidden'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(u);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>Chat</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
