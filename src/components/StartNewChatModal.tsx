import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { User } from '../types';
import { normalizePhoneNumber, subscribeToUsers, deleteContactUser } from '../services/firestoreService';
import { playGlassChimeSound } from '../services/audioService';

interface StartNewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onStartChatWithUser: (user: User) => void;
  onOpenCreateGroup: () => void;
  onShowSuccessModal?: (type: 'status' | 'profile' | 'logout' | 'delete' | 'generic', title: string, subtitle?: string) => void;
}

interface SwipeableModalContactItemProps {
  user: User;
  onStartChat: (user: User) => void;
  onDeleteContact: (user: User) => void;
}

const SwipeableModalContactItem: React.FC<SwipeableModalContactItemProps> = ({
  user,
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

    if (offsetX > 60 || velocityX > 250) {
      if (navigator.vibrate) navigator.vibrate(40);
      onDeleteContact(user);
    } else if (offsetX < -60 || velocityX < -250) {
      if (navigator.vibrate) navigator.vibrate(40);
      onStartChat(user);
    }
  };

  const handleClick = () => {
    if (isDraggingRef.current || Math.abs(dragDistRef.current) > 6) return;
    onStartChat(user);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl select-none touch-pan-y">
      {/* Left underlay: Delete */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (navigator.vibrate) navigator.vibrate(40);
          onDeleteContact(user);
        }}
        className="absolute inset-0 z-0 flex items-center justify-start pl-3.5 bg-gradient-to-r from-rose-600/30 via-rose-500/15 to-transparent border border-rose-500/30 text-rose-300 rounded-xl cursor-pointer"
      >
        <motion.div
          style={{ opacity: deleteOpacity, scale: deleteScale }}
          className="flex items-center gap-1.5 font-bold text-xs text-rose-300"
        >
          <span>🗑️</span>
          <span>Delete</span>
        </motion.div>
      </div>

      {/* Right underlay: Chat / Pin */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (navigator.vibrate) navigator.vibrate(40);
          onStartChat(user);
        }}
        className="absolute inset-0 z-0 flex items-center justify-end pr-3.5 bg-gradient-to-l from-blue-600/30 via-blue-500/15 to-transparent border border-blue-500/30 text-blue-300 rounded-xl cursor-pointer"
      >
        <motion.div
          style={{ opacity: chatOpacity, scale: chatScale }}
          className="flex items-center gap-1.5 font-bold text-xs text-blue-300"
        >
          <span>💬 Start Chat</span>
        </motion.div>
      </div>

      {/* Foreground Contact Card */}
      <motion.div
        drag="x"
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
        className="relative z-10 flex items-center justify-between p-2 rounded-xl bg-[#131622]/95 border border-white/5 hover:border-white/15 transition-colors cursor-pointer group select-none shadow-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
            {user.avatar || '👤'}
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 truncate">
              @{user.username}
            </h5>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {user.fullName} • 📱 {user.allowPhoneNumberVisibility !== false ? user.phoneNumber : 'Hidden'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onDeleteContact(user)}
            className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center transition-colors"
            title="Delete Contact"
          >
            🗑️
          </button>
          <button
            type="button"
            onClick={() => onStartChat(user)}
            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>💬</span>
            <span>Chat</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const StartNewChatModal: React.FC<StartNewChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartChatWithUser,
  onOpenCreateGroup,
  onShowSuccessModal
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not_found' | 'self'>('idle');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [allFirestoreUsers, setAllFirestoreUsers] = useState<User[]>([]);
  const [contactToDelete, setContactToDelete] = useState<User | null>(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Real-time listener for all registered users across Firestore
    const unsubscribe = subscribeToUsers((users) => {
      setAllFirestoreUsers(users);
    });

    setSearchInput('');
    setSearchStatus('idle');
    setMatchedUser(null);
    setContactToDelete(null);

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
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    playGlassChimeSound('incoming');
    onStartChatWithUser(user);
    onClose();
  };

  const handleTouchStart = (user: User) => {
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

  const handleConfirmDeleteContact = async () => {
    if (!contactToDelete || !currentUser || isDeletingContact) return;

    setIsDeletingContact(true);
    try {
      await deleteContactUser(contactToDelete.id, currentUser.id);
      const deletedName = contactToDelete.username || contactToDelete.fullName;
      setContactToDelete(null);
      if (onShowSuccessModal) {
        onShowSuccessModal('delete', 'Contact Removed!', `@${deletedName} and related chat data have been deleted.`);
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    } finally {
      setIsDeletingContact(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-75">
      <div
        className="w-full max-w-md p-6 rounded-3xl mirror-glass-card shadow-2xl border border-white/10 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-75 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl shadow-inner">
              💬
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Find Contact & Start Chat</h3>
              <p className="text-[11px] text-slate-400">Search by @username or phone • Tap-hold to delete</p>
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
              className="w-full pl-4 pr-10 py-3 rounded-2xl mirror-glass-input border border-white/10 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
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
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-75">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
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
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
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
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2.5 animate-in fade-in duration-75">
            <span className="text-lg">🔍</span>
            <div>
              <p className="font-semibold">No registered contact found for "{searchInput}"</p>
              <p className="text-[11px] text-blue-400/80 mt-0.5">
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
          className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 flex items-center justify-between cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center text-xl text-white group-hover:scale-105 transition-transform">
              👥
            </div>
            <div>
              <div className="text-xs font-bold text-white">Create New Group Chat</div>
              <div className="text-[10px] text-slate-300">Message multiple contacts together</div>
            </div>
          </div>
          <span className="text-blue-400 font-bold text-sm">➔</span>
        </div>

        {/* Directory of Registered Contacts on SPLENDID CHAT */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>👥 Registered Contacts Directory</span>
            <span className="text-[11px] text-slate-500">{registeredUsers.length} contact{registeredUsers.length === 1 ? '' : 's'}</span>
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] text-slate-500 font-medium">
            <span className="text-rose-400/80">👉 Slide right: Delete</span>
            <span className="text-blue-400/80">Slide left: Chat 👈</span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {registeredUsers.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-slate-500 text-xs">
                No other contacts registered yet. Create another contact or share the app to connect!
              </div>
            ) : (
              registeredUsers.map((u) => {
                return (
                  <SwipeableModalContactItem
                    key={u.id}
                    user={u}
                    onStartChat={handleStartChat}
                    onDeleteContact={(target) => setContactToDelete(target)}
                  />
                );
              })
            )}
          </div>
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
                  This will remove @{contactToDelete.username} ({contactToDelete.fullName}) and erase mutual private chat histories.
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setContactToDelete(null)}
                  disabled={isDeletingContact}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteContact}
                  disabled={isDeletingContact}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDeletingContact ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <span>🗑️</span>
                      <span>Delete Contact</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
