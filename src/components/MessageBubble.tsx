import React from 'react';
import { Message, User } from '../types';
import { AudioVoicePlayer } from './AudioVoicePlayer';

const REACTION_EMOJIS = ['😊', '😂', '😍', '🤔', '👍', '❤️', '🔥', '🎉'];

interface MessageBubbleProps {
  msg: Message;
  isUser: boolean;
  currentUser: User;
  chat: any;
  onDeleteMessage: (msgId: string) => void;
  onOpenForward: (msg: Message) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onOpenLightbox: (url: string, content: string) => void;
  onTogglePin: (msg: Message) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  editingMessageText: string;
  setEditingMessageText: (text: string) => void;
  handleSaveEdit: (msg: Message) => void;
  activeReactionMessageId: string | null;
  setActiveReactionMessageId: (id: string | null) => void;
  swipingMsgId: string | null;
  swipeOffset: number;
  setMessageToDelete: (id: string | null) => void;
  setReplyingTo: (msg: Message | null) => void;
  MEDIA_EXPIRATION_MS: number;
  handleDragStart: (x: number, y: number, msg: Message) => void;
  handleDragMove: (x: number, y: number) => void;
  handleDragEnd: (msg: Message) => void;
}

export const MessageBubble = React.memo(({
  msg,
  isUser,
  currentUser,
  chat,
  onDeleteMessage,
  onOpenForward,
  onToggleReaction,
  onOpenLightbox,
  onTogglePin,
  editingMessageId,
  setEditingMessageId,
  editingMessageText,
  setEditingMessageText,
  handleSaveEdit,
  activeReactionMessageId,
  setActiveReactionMessageId,
  swipingMsgId,
  swipeOffset,
  setMessageToDelete,
  setReplyingTo,
  MEDIA_EXPIRATION_MS,
  handleDragStart,
  handleDragMove,
  handleDragEnd
}: MessageBubbleProps) => {
  const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

  return (
    <div
      key={msg.id}
      id={`message-${msg.id}`}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY, msg)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={() => handleDragEnd(msg)}
      onMouseDown={(e) => handleDragStart(e.clientX, e.clientY, msg)}
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={() => handleDragEnd(msg)}
      onMouseLeave={() => handleDragEnd(msg)}
      className={`flex items-end gap-2 w-full group ${isUser ? 'justify-end' : 'justify-start'} mb-1`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm shadow-sm shrink-0">
          {chat.avatar || '👤'}
        </div>
      )}
      
      <div className={`relative max-w-[85%] rounded-2xl p-2.5 shadow-sm ${
          isUser
            ? 'text-white rounded-tr-none'
            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none border border-white/5'
        }`}
        style={isUser ? { backgroundColor: chat?.bubbleColor || '#701a75' } : {}}
      >
        
        {/* Forwarded Header Banner */}
        {msg.isForwarded && (
          <div className="flex items-center gap-1 text-[9px] text-red-300 font-semibold mb-1 opacity-90">
            <span>↗️</span>
            <span>Forwarded {msg.forwardedFrom ? `from ${msg.forwardedFrom}` : ''}</span>
          </div>
        )}

        {/* Reply preview if present */}
        {msg.replyTo && (
          <div className={`mb-2 p-2 rounded-lg text-[11px] border-l-2 ${isUser ? 'bg-black/20 border-white/60 text-white/90' : 'bg-white/5 border-red-500 text-slate-300'}`}>
            <span className="font-bold block text-[9px] text-red-300">
              {msg.replyTo.senderName}
            </span>
            <span className="truncate block opacity-90">{msg.replyTo.content}</span>
          </div>
        )}

        {/* Content Rendering based on Type */}
        {msg.type === 'text' && (
          <div className="space-y-1">
            {msg.isExpired ? (
              <div className="flex items-center gap-2 text-[11px] italic opacity-85 py-0.5">
                <span className="text-sm font-normal opacity-90">🚫</span>
                <span>Message expired</span>
              </div>
            ) : editingMessageId === msg.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editingMessageText}
                  onChange={(e) => setEditingMessageText(e.target.value)}
                  className="w-full bg-black/40 text-[13px] p-2 rounded-lg text-white border border-white/10 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingMessageId(null)} className="text-[9px] text-slate-400">Cancel</button>
                  <button onClick={() => handleSaveEdit(msg)} className="text-[9px] text-blue-400 font-bold">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap font-normal">
                {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                  if (part.match(/^https?:\/\//)) {
                    return (
                      <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink-300 underline underline-offset-2 hover:text-pink-200 font-medium break-all"
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                })}
              </p>
            )}
          </div>
        )}

        {msg.type === 'image' && (
          <div className="space-y-1.5">
            {msg.mediaUrl && (Date.now() - msg.createdAt < MEDIA_EXPIRATION_MS) ? (
              <div
                onClick={() => onOpenLightbox(msg.mediaUrl!, msg.content)}
                className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-white/10 max-h-60"
              >
                <img
                  src={msg.mediaUrl}
                  alt="24h Disappearing Photo"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover group-hover/img:scale-105 transition-transform duration-75"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-black/20 rounded-xl text-slate-500 text-xs border border-white/5">
                <span>⏱️</span>
                <span>Media expired</span>
              </div>
            )}
            {msg.content && msg.content !== 'Photo Attachment' && (
              <p className="text-[11px] pt-1">{msg.content}</p>
            )}
          </div>
        )}

        {msg.type === 'voice' && (Date.now() - msg.createdAt < MEDIA_EXPIRATION_MS ? (
          <AudioVoicePlayer
            audioUrl={msg.mediaUrl}
            duration={msg.mediaMeta?.duration || 17}
            waveData={msg.mediaMeta?.waveData}
            isUserMessage={isUser}
            senderAvatar={isUser ? currentUser.avatar : chat?.avatar || '👤'}
            accentColor={chat?.accentColor}
          />
        ) : (
          <div className="flex items-center gap-2 p-3 bg-black/20 rounded-xl text-slate-500 text-xs border border-white/5">
            <span>⏱️</span>
            <span>Voice note expired</span>
          </div>
        ))}

        {/* Reactions Badge row */}
        {hasReactions && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {Object.entries(msg.reactions || {}).map(([emoji, users]) => {
              const userList = (Array.isArray(users) ? users : []) as string[];
              const userReacted = userList.includes(currentUser.id);
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(msg.id, emoji)}
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                    userReacted
                      ? 'bg-red-500/30 border-red-400 text-white shadow-sm'
                      : 'bg-black/40 border-white/15 text-slate-300 hover:bg-black/60'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{userList.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bubble Footer (Time & Read Receipts) */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[9px] select-none ${
            isUser ? 'text-white/80' : 'text-slate-400'
          }`}
        >
          <span>{msg.timestamp}</span>
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm shadow-sm shrink-0">
          {currentUser.avatar || '👤'}
        </div>
      )}
    </div>
  );
});
