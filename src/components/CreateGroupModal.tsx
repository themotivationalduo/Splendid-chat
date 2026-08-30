import React, { useState } from 'react';
import { User } from '../types';
import { createGroupChat } from '../services/firestoreService';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onGroupCreated: (newChatId: string) => void;
}

const GROUP_AVATARS = ['👥', '🚀', '💬', '🎉', '🌟', '💼', '🔥', '🏆', '🍕', '💻'];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onGroupCreated
}) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👥');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const otherUsers = allUsers.filter(u => u.id !== currentUser.id);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0 || isCreating) return;

    setIsCreating(true);
    try {
      const selectedMembers = otherUsers.filter(u => selectedUserIds.includes(u.id));
      const newChat = await createGroupChat(
        currentUser, 
        groupName.trim(), 
        selectedMembers, 
        selectedAvatar,
        groupDescription.trim()
      );
      onGroupCreated(newChat.id);
      onClose();
    } catch (e) {
      console.error('Error creating group:', e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md mirror-glass-input border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👥</span>
            <div>
              <h3 className="text-base font-bold text-white">New Group Chat</h3>
              <p className="text-xs text-slate-400">Select participants to start messaging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Group Avatar Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Group Icon</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {GROUP_AVATARS.map(avatar => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all shrink-0 ${
                    selectedAvatar === avatar
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Group Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. Splendid Group, Project Alpha"
              className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              required
            />
          </div>

          {/* Group Description Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
            <textarea
              value={groupDescription}
              onChange={e => setGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              className="w-full min-h-[80px] p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
          </div>

          {/* Member Selection List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Add Members</label>
              <span className="text-[10px] text-red-400 font-bold">
                {selectedUserIds.length} selected
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar mirror-glass-input p-2 rounded-2xl border border-white/10">
              {otherUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No other contacts found.
                </div>
              ) : (
                otherUsers.map(user => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/30 text-white'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0">
                          {user.avatar || '👤'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{user.fullName}</div>
                          <div className="text-[10px] text-slate-400 truncate">@{user.username}</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                        isSelected ? 'bg-red-600 border-red-500 text-white' : 'border-white/20 bg-transparent'
                      }`}>
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!groupName.trim() || selectedUserIds.length === 0 || isCreating}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            {isCreating ? 'Creating Group...' : 'Create Group Chat'}
          </button>
        </form>
      </div>
    </div>
  );
};
