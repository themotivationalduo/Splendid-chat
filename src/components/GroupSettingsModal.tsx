import React, { useState } from 'react';
import { Chat, User } from '../types';
import { 
  updateGroupName, 
  updateGroupDescription,
  deleteGroupChat, 
  exitGroupChat,
  updateGroupAvatar,
  addGroupAdmin,
  removeGroupAdmin,
  removeMemberFromGroup
} from '../services/firestoreService';

const AVATAR_EMOJI_CATEGORIES = [
  {
    name: 'Popular & Tech',
    emojis: ['👥', '🚀', '💬', '🎉', '🌟', '💼', '🔥', '🏆', '🍕', '💻', '⚡', '💎', '🎮', '🎧', '📱', '🤖']
  },
  {
    name: 'Smileys & Expressions',
    emojis: ['😀', '😎', '🤩', '🥳', '🤓', '😇', '🤠', '😍', '🤔', '🙌', '🤝', '💪', '✨', '🎯', '💯', '❤️']
  },
  {
    name: 'Work & Creative',
    emojis: ['💡', '📊', '📈', '🎨', '🎬', '📚', '🔬', '✈️', '🌍', '🏠', '☕', '🍻', '⚽', '🏀', '🎵', '🛡️']
  }
];

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
  allUsers: User[];
  onChatUpdated: () => void;
  onGroupExitedOrDeleted: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUser,
  allUsers,
  onChatUpdated,
  onGroupExitedOrDeleted
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(chat.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [groupDescription, setGroupDescription] = useState(chat.description || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (!isOpen || !chat.isGroup) return null;

  const isCreator = chat.creatorId === currentUser.id;
  const isAdmin = isCreator || chat.groupAdmins?.includes(currentUser.id);
  const groupMembers = chat.groupMembers || [];
  
  // Resolve member user objects
  const memberUsers = allUsers.filter(u => groupMembers.includes(u.id));

  const handleSaveName = async () => {
    if (!groupName.trim() || groupName === chat.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateGroupName(chat.id, groupName.trim());
      onChatUpdated();
      setIsEditingName(false);
    } catch (e) {
      console.error('Error updating group name:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveDescription = async () => {
    if (groupDescription.trim() === (chat.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateGroupDescription(chat.id, groupDescription.trim());
      onChatUpdated();
      setIsEditingDescription(false);
    } catch (e) {
      console.error('Error updating group description:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAvatar = async (emojiChar: string) => {
    setShowEmojiPicker(false);
    setIsUpdating(true);
    try {
      await updateGroupAvatar(chat.id, emojiChar);
      onChatUpdated();
    } catch (e) {
      console.error('Error updating group avatar:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    setIsUpdating(true);
    try {
      if (currentlyAdmin) {
        await removeGroupAdmin(chat.id, userId);
      } else {
        await addGroupAdmin(chat.id, userId);
      }
      onChatUpdated();
    } catch (e) {
      console.error('Error toggling admin:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!window.confirm('Are you sure you want to kick this member?')) return;
    setIsUpdating(true);
    try {
      await removeMemberFromGroup(chat.id, userId);
      onChatUpdated();
    } catch (e) {
      console.error('Error kicking member:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete group "${chat.name}"?`)) return;
    setIsUpdating(true);
    try {
      await deleteGroupChat(chat.id);
      onGroupExitedOrDeleted();
      onClose();
    } catch (e) {
      console.error('Error deleting group:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExit = async () => {
    if (!window.confirm(`Are you sure you want to exit group "${chat.name}"?`)) return;
    setIsUpdating(true);
    try {
      await exitGroupChat(chat.id, currentUser.id);
      onGroupExitedOrDeleted();
      onClose();
    } catch (e) {
      console.error('Error exiting group:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md mirror-glass-input border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl">
                {chat.avatar || '👥'}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  ✏️
                </button>
              )}
              {showEmojiPicker && (
                <div className="absolute top-14 left-0 z-50 w-72 p-3 rounded-2xl mirror-glass-card border border-white/15 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-75">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-[11px] font-bold text-slate-200">Choose Group Icon</span>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2.5">
                    {AVATAR_EMOJI_CATEGORIES.map((cat) => (
                      <div key={cat.name} className="space-y-1">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1">
                          {cat.name}
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {cat.emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleUpdateAvatar(emoji)}
                              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-base hover:scale-110 transition-all cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{chat.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                  Group
                </span>
              </div>
              <p className="text-xs text-slate-400">{groupMembers.length} participants</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Group Name Edit (Admin Only) */}
        {isAdmin && (
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span>Group Name</span>
              {!isEditingName ? (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-blue-400 hover:text-blue-300 font-bold"
                >
                  Edit Name
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setGroupName(chat.name); setIsEditingName(false); }}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveName}
                    disabled={isUpdating}
                    className="text-blue-400 font-bold hover:text-blue-300"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {isEditingName ? (
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            ) : (
              <div className="text-sm font-bold text-white">{chat.name}</div>
            )}
          </div>
        )}

        {/* Group Description Edit (Admin Only or View Only for Members) */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>Description</span>
            {isAdmin && (
              !isEditingDescription ? (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="text-blue-400 hover:text-blue-300 font-bold"
                >
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setGroupDescription(chat.description || ''); setIsEditingDescription(false); }}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={isUpdating}
                    className="text-blue-400 font-bold hover:text-blue-300"
                  >
                    Save
                  </button>
                </div>
              )
            )}
          </div>

          {isEditingDescription ? (
            <textarea
              value={groupDescription}
              onChange={e => setGroupDescription(e.target.value)}
              className="w-full min-h-[80px] p-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="What's this group about?"
            />
          ) : (
            <div className="text-xs text-slate-300 leading-relaxed italic">
              {chat.description || 'No description provided.'}
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Participants</span>
            <span className="text-[10px] text-slate-400">{groupMembers.length} members</span>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar mirror-glass-input p-2 rounded-2xl border border-white/10">
            {memberUsers.map(user => {
              const isUserCreator = user.id === chat.creatorId;
              const isUserAdmin = chat.groupAdmins?.includes(user.id);
              const isMe = user.id === currentUser.id;

              return (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0">
                      {user.avatar || '👤'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-white">
                        {user.fullName} {isMe && '(You)'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">@{user.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(isUserCreator || isUserAdmin) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                        {isUserCreator ? 'Creator' : 'Admin'}
                      </span>
                    )}

                    {!isMe && !isUserCreator && (
                      <div className="flex items-center gap-1">
                        {/* Only Creator can add/remove admins */}
                        {isCreator && (
                          <button
                            onClick={() => handleToggleAdmin(user.id, !!isUserAdmin)}
                            disabled={isUpdating}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${
                              isUserAdmin 
                                ? 'bg-white/10 border-white/20 text-slate-300 hover:bg-white/20' 
                                : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                            }`}
                          >
                            {isUserAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        )}

                        {/* Admins can kick non-admins (or creators can kick anyone) */}
                        {isAdmin && (!isUserAdmin || isCreator) && (
                          <button
                            onClick={() => handleKickMember(user.id)}
                            disabled={isUpdating}
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-blue-500/30 bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 transition-colors"
                          >
                            Kick
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExit}
            disabled={isUpdating}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🚪</span>
            <span>Exit Group</span>
          </button>
          
          {isCreator && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isUpdating}
              className="flex-1 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold text-blue-400 transition-all flex items-center justify-center gap-1.5"
            >
              <span>🗑️</span>
              <span>Delete Group</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
