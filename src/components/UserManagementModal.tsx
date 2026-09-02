import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { User } from '../types';
import { subscribeToUsers, deleteContactUser } from '../services/firestoreService';

interface SwipeableDirectoryUserItemProps {
  user: User;
  isSelf: boolean;
  displayUsername: string;
  onOpenProfile: (user: User) => void;
  onStartChat: (user: User) => void;
  onDeleteContact: (user: User) => void;
}

const SwipeableDirectoryUserItem: React.FC<SwipeableDirectoryUserItemProps> = ({
  user,
  isSelf,
  displayUsername,
  onOpenProfile,
  onStartChat,
  onDeleteContact
}) => {
  const x = useMotionValue(0);
  const isDraggingRef = useRef(false);
  const dragDistRef = useRef(0);

  const deleteOpacity = useTransform(x, [10, 40, 70], [0, 0.6, 1]);
  const deleteScale = useTransform(x, [10, 40, 70], [0.8, 0.95, 1.05]);

  const chatOpacity = useTransform(x, [-10, -40, -70], [0, 0.6, 1]);
  const chatScale = useTransform(x, [-10, -40, -70], [0.8, 0.95, 1.05]);

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    if (!isSelf && (offsetX > 60 || velocityX > 250)) {
      if (navigator.vibrate) navigator.vibrate(40);
      onDeleteContact(user);
    } else if (!isSelf && (offsetX < -60 || velocityX < -250)) {
      if (navigator.vibrate) navigator.vibrate(40);
      onStartChat(user);
    }
  };

  const handleClick = () => {
    if (isDraggingRef.current || Math.abs(dragDistRef.current) > 6) return;
    onOpenProfile(user);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl select-none touch-pan-y">
      {/* Left underlay: Delete */}
      {!isSelf && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.vibrate) navigator.vibrate(40);
            onDeleteContact(user);
          }}
          className="absolute inset-0 z-0 flex items-center justify-start pl-4 bg-gradient-to-r from-rose-600/30 via-rose-500/15 to-transparent border border-rose-500/30 text-rose-300 rounded-2xl cursor-pointer"
        >
          <motion.div
            style={{ opacity: deleteOpacity, scale: deleteScale }}
            className="flex items-center gap-1.5 font-bold text-xs text-rose-300"
          >
            <span>🗑️</span>
            <span>Delete</span>
          </motion.div>
        </div>
      )}

      {/* Right underlay: Chat */}
      {!isSelf && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.vibrate) navigator.vibrate(40);
            onStartChat(user);
          }}
          className="absolute inset-0 z-0 flex items-center justify-end pr-4 bg-gradient-to-l from-blue-600/30 via-blue-500/15 to-transparent border border-blue-500/30 text-blue-300 rounded-2xl cursor-pointer"
        >
          <motion.div
            style={{ opacity: chatOpacity, scale: chatScale }}
            className="flex items-center gap-1.5 font-bold text-xs text-blue-300"
          >
            <span>💬 Chat</span>
          </motion.div>
        </div>
      )}

      {/* Foreground card */}
      <motion.div
        drag={isSelf ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: -90, right: 90 }}
        dragElastic={0.2}
        style={{ x }}
        onDragStart={() => {
          isDraggingRef.current = true;
          dragDistRef.current = 0;
        }}
        onDrag={(_, info) => {
          dragDistRef.current = info.offset.x;
        }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className={`relative z-10 p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
          isSelf
            ? 'bg-blue-950/20 border-blue-500/30'
            : 'bg-[#131622]/95 border-white/5 hover:border-blue-500/30'
        }`}
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
              <span className="font-bold text-xs text-slate-100 truncate hover:text-blue-400 transition-colors">
                {displayUsername}
              </span>
              {isSelf && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold">
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
          {!isSelf && (
            <button
              onClick={() => onDeleteContact(user)}
              className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 flex items-center justify-center text-xs transition-colors"
              title="Delete Contact"
            >
              🗑️
            </button>
          )}

          <button
            onClick={() => onOpenProfile(user)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center text-xs"
            title="View Profile Info"
          >
            ℹ️
          </button>

          {!isSelf && (
            <button
              onClick={() => onStartChat(user)}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Send Message"
            >
              <span>💬</span>
              <span>Chat</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAddNewContact: (fullName: string, username: string, phoneNumber: string, avatar: string) => void;
  onStartChatWithUser: (user: User) => void;
  onOpenUserProfile?: (user: User) => void;
  onShowSuccessModal?: (type: 'status' | 'profile' | 'logout' | 'delete' | 'generic', title: string, subtitle?: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAddNewContact,
  onStartChatWithUser,
  onOpenUserProfile,
  onShowSuccessModal
}) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAvatar, setNewAvatar] = useState('🌟');
  const [contactToDelete, setContactToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

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
    if (onShowSuccessModal) {
      onShowSuccessModal('generic', 'Contact Added!', `${newFullName.trim()} has been saved to your contacts.`);
    }
    setIsAddingNew(false);
    setNewFullName('');
    setNewUsername('');
    setNewPhone('');
  };

  const handleTouchStart = (user: User) => {
    if (currentUser && user.id === currentUser.id) return;
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      setContactToDelete(user);
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete || !currentUser || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteContactUser(contactToDelete.id, currentUser.id);
      const name = contactToDelete.username || contactToDelete.fullName;
      setContactToDelete(null);
      if (onShowSuccessModal) {
        onShowSuccessModal('delete', 'Contact Removed!', `@${name} has been removed from contacts.`);
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    } finally {
      setIsDeleting(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-75">
      <div className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-white/10 shadow-2xl space-y-4 max-h-[85vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl shadow-inner">
              👥
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Contacts & Directory</h3>
              <p className="text-xs text-slate-400">Search • Tap-hold to delete contact</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 text-base"
          >
            ✕
          </button>
        </div>

        {/* Search Contacts in Directory */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by @username, phone, or name..."
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            className="w-full py-2.5 px-4 rounded-2xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span>➕</span>
            <span>Add New Contact</span>
          </button>
        ) : (
          <form onSubmit={handleAddSubmit} className="p-4 rounded-2xl mirror-glass-input border border-blue-500/30 space-y-2.5 animate-in slide-in-from-top duration-75">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                <span>✨</span>
                <span>New Contact Info</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Cancel
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
                        ? 'bg-blue-600/30 border-2 border-blue-500 scale-110'
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
                className="w-full h-10 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="Username (e.g. jsmith)"
                className="w-full h-10 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone Number (e.g. +1 555 234 5678)"
                className="w-full h-10 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>💾</span>
              <span>Save Contact</span>
            </button>
          </form>
        )}

        {/* Directory List */}
        <div className="flex items-center justify-between px-1 text-[10px] text-slate-500 font-medium">
          <span className="text-rose-400/80">👉 Slide right: Delete</span>
          <span className="text-blue-400/80">Slide left: Chat 👈</span>
        </div>

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
                <SwipeableDirectoryUserItem
                  key={user.id}
                  user={user}
                  isSelf={isSelf}
                  displayUsername={displayUsername}
                  onOpenProfile={(target) => {
                    if (onOpenUserProfile) onOpenUserProfile(target);
                  }}
                  onStartChat={(target) => {
                    onStartChatWithUser(target);
                    onClose();
                  }}
                  onDeleteContact={(target) => {
                    setContactToDelete(target);
                  }}
                />
              );
            })
          )}
        </div>

        {/* Delete Contact Confirmation Modal */}
        {contactToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-75">
            <div className="w-full max-w-sm p-5 rounded-3xl mirror-glass-card border border-blue-500/30 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center text-2xl mx-auto">
                🗑️
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Delete Contact @{contactToDelete.username}?</h4>
                <p className="text-xs text-slate-400 mt-1">
                  This will remove @{contactToDelete.username} ({contactToDelete.fullName}) from your contacts directory and clear mutual private chat logs.
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setContactToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <span>🗑️</span>
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
