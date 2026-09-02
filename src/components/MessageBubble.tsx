import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
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
  onScrollToMessage?: (messageId: string) => void;
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
  onScrollToMessage,
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

  // Media identification helper for replies
  const getRepliedMediaDetails = (replyTo?: Message['replyTo']) => {
    if (!replyTo) return null;

    const type = replyTo.type;
    const content = replyTo.content || '';
    const isImage = type === 'image' || !!replyTo.mediaUrl || content.includes('Photo') || content.includes('📷') || content.includes('GIF') || content.includes('Sticker') || content.includes('🏖️') || content.includes('🌆');
    const isVoice = type === 'voice' || content.includes('Voice') || content.includes('🎤') || content.includes('Voice Note');
    const isFile = type === 'file' || content.includes('File') || content.includes('📎');
    const isStatus = content.startsWith('Status:') || replyTo.senderName?.includes('Status') || content.includes('Status');
    const isGif = content.includes('GIF') || content.includes('🎬');
    const isSticker = content.includes('Sticker') || content.includes('🎨');

    return {
      isMedia: isImage || isVoice || isFile || isStatus,
      isImage,
      isVoice,
      isFile,
      isStatus,
      isGif,
      isSticker,
      mediaUrl: replyTo.mediaUrl
    };
  };

  const repliedMedia = getRepliedMediaDetails(msg.replyTo);

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (msg.replyTo?.id && onScrollToMessage) {
      onScrollToMessage(msg.replyTo.id);
    }
  };

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
      onContextMenu={(e) => {
        e.preventDefault();
        setActiveReactionMessageId(msg.id);
      }}
      className={`flex items-end gap-2 w-full group ${isUser ? 'justify-end' : 'justify-start'} mb-1 select-none`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm shadow-sm shrink-0">
          {msg.senderAvatar || chat.avatar || '👤'}
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
          <div className="flex items-center gap-1 text-[9px] text-blue-300 font-semibold mb-1 opacity-90">
            <span>↗️</span>
            <span>Forwarded {msg.forwardedFrom ? `from ${msg.forwardedFrom}` : ''}</span>
          </div>
        )}

        {/* Interactive Reply Preview with Media Identification & Scroll-to-Message */}
        {msg.replyTo && (
          <div
            onClick={handleReplyClick}
            role="button"
            tabIndex={0}
            title="Click to jump to replied message"
            className={`mb-2 p-2 rounded-xl text-[11px] border-l-4 transition-all duration-150 cursor-pointer select-none group/reply hover:brightness-110 active:scale-[0.98] ${
              repliedMedia?.isImage
                ? isUser ? 'bg-black/30 border-cyan-400 text-white/95' : 'bg-cyan-950/30 border-cyan-400 text-slate-200 shadow-sm'
                : repliedMedia?.isVoice
                ? isUser ? 'bg-black/30 border-amber-400 text-white/95' : 'bg-amber-950/30 border-amber-400 text-slate-200 shadow-sm'
                : repliedMedia?.isStatus
                ? isUser ? 'bg-black/30 border-emerald-400 text-white/95' : 'bg-emerald-950/30 border-emerald-400 text-slate-200 shadow-sm'
                : isUser ? 'bg-black/25 border-white/70 text-white/90' : 'bg-white/5 border-blue-500 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Header: Sender & Action hint */}
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className={`font-bold text-[10px] truncate ${
                    repliedMedia?.isImage
                      ? 'text-cyan-300'
                      : repliedMedia?.isVoice
                      ? 'text-amber-300'
                      : repliedMedia?.isStatus
                      ? 'text-emerald-300'
                      : 'text-blue-300'
                  }`}>
                    {msg.replyTo.senderName}
                  </span>

                  <span className="text-[9px] opacity-70 group-hover/reply:opacity-100 group-hover/reply:translate-x-0.5 transition-all text-slate-300 flex items-center gap-0.5 shrink-0">
                    <span>Jump</span>
                    <span>⤴</span>
                  </span>
                </div>

                {/* Body Content with Media Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Media Type Identifiers */}
                  {repliedMedia?.isImage && (
                    <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-[9px] font-bold inline-flex items-center gap-1 shrink-0">
                      {repliedMedia.isGif ? '🎬 GIF' : repliedMedia.isSticker ? '🎨 Sticker' : '📷 Photo'}
                    </span>
                  )}

                  {repliedMedia?.isVoice && (
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-500/25 text-amber-200 border border-amber-400/40 text-[9px] font-bold inline-flex items-center gap-1 shrink-0">
                      <span>🎤 Voice Note</span>
                      <span className="font-mono opacity-80">ılılı</span>
                    </span>
                  )}

                  {repliedMedia?.isStatus && !repliedMedia.isImage && !repliedMedia.isVoice && (
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-[9px] font-bold inline-flex items-center gap-1 shrink-0">
                      ✨ Status Story
                    </span>
                  )}

                  {repliedMedia?.isFile && (
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-500/25 text-blue-200 border border-blue-400/40 text-[9px] font-bold inline-flex items-center gap-1 shrink-0">
                      📎 File Attachment
                    </span>
                  )}

                  {/* Content text */}
                  <span className="truncate text-xs opacity-90 leading-tight">
                    {msg.replyTo.content && msg.replyTo.content !== 'Photo Attachment' && !msg.replyTo.content.startsWith('Status: 📷')
                      ? msg.replyTo.content
                      : (repliedMedia?.isImage ? 'Photo attachment' : repliedMedia?.isVoice ? 'Voice memo' : msg.replyTo.content)}
                  </span>
                </div>
              </div>

              {/* Replied Image Thumbnail if available */}
              {repliedMedia?.isImage && (
                <div className="shrink-0">
                  {repliedMedia.mediaUrl ? (
                    <img
                      src={repliedMedia.mediaUrl}
                      alt="Replied media thumbnail"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-cover rounded-lg border border-white/20 shadow-inner group-hover/reply:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-cyan-900/40 border border-cyan-400/30 flex items-center justify-center text-base">
                      📷
                    </div>
                  )}
                </div>
              )}

              {/* Replied Voice Note icon if available */}
              {repliedMedia?.isVoice && !repliedMedia.isImage && (
                <div className="w-9 h-9 rounded-lg bg-amber-900/40 border border-amber-400/30 flex items-center justify-center text-sm text-amber-300 shrink-0">
                  🎙️
                </div>
              )}
            </div>
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
            senderAvatar={isUser ? currentUser.avatar : msg.senderAvatar || chat?.avatar || '👤'}
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
                      ? 'bg-blue-500/30 border-blue-400 text-white shadow-sm'
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
          className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] select-none ${
            isUser ? 'text-white/80' : 'text-slate-400'
          }`}
        >
          {msg.isEdited && (
            <span className="opacity-75 italic text-[8px] tracking-tight">edited</span>
          )}
          <span>{msg.timestamp}</span>
          {isUser && (() => {
            const isRead = msg.status === 'read';
            const isDelivered = msg.status === 'delivered';
            const isPending = msg.status === 'sending' || msg.status === 'pending' || (!isRead && typeof navigator !== 'undefined' && !navigator.onLine);
            
            const myReadReceipts = currentUser.readReceipts !== false;
            const peerReadReceipts = chat?.participant?.readReceipts !== false;
            const shouldShowBlueTicks = myReadReceipts && peerReadReceipts;

            if (isRead) {
              return (
                <span className="inline-flex items-center ml-0.5" title="Read / Viewed">
                  <CheckCheck className={`w-3.5 h-3.5 stroke-[2.5] ${shouldShowBlueTicks ? 'text-sky-400' : (isUser ? 'text-white/80' : 'text-slate-400')}`} />
                </span>
              );
            }
            
            if (isDelivered) {
              return (
                <span className="inline-flex items-center ml-0.5" title="Delivered">
                  <CheckCheck className={`w-3.5 h-3.5 stroke-[2.5] ${isUser ? 'text-white/80' : 'text-slate-400'}`} />
                </span>
              );
            }

            if (isPending) {
              return (
                <span className="inline-flex items-center ml-0.5" title="Not sent (offline / pending)">
                  <Clock className={`w-3 h-3 animate-pulse stroke-[2.5] ${isUser ? 'text-white/80' : 'text-slate-400'}`} />
                </span>
              );
            }

            return (
              <span className="inline-flex items-center ml-0.5" title="Sent">
                <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isUser ? 'text-white/80' : 'text-slate-400'}`} />
              </span>
            );
          })()}
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
