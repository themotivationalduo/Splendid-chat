import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { subscribeToUsers } from '../services/firestoreService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAddNewContact: (fullName: string, username: string, phoneNumber: string, avatar: string) => void;
  onStartChatWithUser: (user: User) => void;
  onOpenUserProfile?: (user: User) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAddNewContact,
  onStartChatWithUser,
  onOpenUserProfile
}) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAvatar, setNewAvatar] = useState('🌟');

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToUsers((users) => {
      setAllUsers(users);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim()) return;

    onAddNewContact(newFullName.trim(), newUsername.trim(), newPhone.trim(), newAvatar);
    setIsAddingNew(false);
    setNewFullName('');
    setNewUsername('');
    setNewPhone('');
  };

  const AVATAR_OPTIONS = ['🌟', '💎', '🚀', '🔥', '⚡', '👑', '🎯', '🌸', '🦊', '👤', '🛡️', '🏆'];

  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.phoneNumber && u.phoneNumber.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-xl animate-in fade-in duration-75">
      <div className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-white/10 shadow-2xl space-y-4 max-h-[85vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xl shadow-inner">
              👥
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Contacts & Directory</h3>
              <p className="text-xs text-slate-400">Search by username or phone number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 text-base"
          >
            ❌
          </button>
        </div>

        {/* Search Contacts in Directory */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by @username, phone, or name..."
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Add Contact Button Toggle */}
        {!isAddingNew ? (
          <button
            onClick={() => setIsAddingNew(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span>➕</span>
            <span>Add New Contact</span>
          </button>
        ) : (
          <form onSubmit={handleAddSubmit} className="p-4 rounded-2xl mirror-glass-input border border-red-500/30 space-y-2.5 animate-in slide-in-from-top duration-75">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                <span>✨</span>
                <span>New Contact Info</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ❌ Cancel
              </button>
            </div>

            {/* Avatar picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Select Emoji Avatar</label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewAvatar(emoji)}
                    className={`w-8 h-8 rounded-xl text-base flex items-center justify-center shrink-0 transition-all ${
                      newAvatar === emoji
                        ? 'bg-red-600/30 border-2 border-red-500 scale-110'
                        : 'mirror-glass-input border border-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Full Name (e.g. John Smith)"
                className="w-full h-10 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <div className="space-y-1">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="Username (e.g. jsmith)"
                className="w-full h-10 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <div className="space-y-1">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone Number (e.g. +1 555 234 5678)"
                className="w-full h-10 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <span>💾</span>
              <span>Save Contact</span>
            </button>
          </form>
        )}

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="text-3xl">👥</div>
              <p className="text-xs font-semibold text-slate-200">No matching contacts</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Add friends using their phone number and @username to connect.
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelf = currentUser ? user.id === currentUser.id : false;
              const displayUsername = `@${(user.username || user.fullName).replace(/^@/, '')}`;

              return (
                <div
                  key={user.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelf
                      ? 'bg-red-950/20 border-red-500/30'
                      : 'mirror-glass-input border-white/5 hover:border-white/20'
                  }`}
                  onClick={() => {
                    if (onOpenUserProfile) onOpenUserProfile(user);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xl text-white shrink-0 shadow-sm">
                      <span>{user.avatar || '👤'}</span>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121418] ${
                          user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-100 truncate hover:text-red-400 transition-colors">
                          {displayUsername}
                        </span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user.fullName} • {user.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (onOpenUserProfile) onOpenUserProfile(user);
                      }}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center text-xs"
                      title="View Profile Info"
                    >
                      ℹ️
                    </button>

                    {!isSelf && (
                      <button
                        onClick={() => {
                          onStartChatWithUser(user);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1"
                        title="Send Message"
                      >
                        <span>💬</span>
                        <span>Chat</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
