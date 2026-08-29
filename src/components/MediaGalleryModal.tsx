import React, { useState } from 'react';
import { Message } from '../types';
import { AudioVoicePlayer } from './AudioVoicePlayer';

interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onOpenLightbox: (imageUrl: string, caption?: string) => void;
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  isOpen,
  onClose,
  messages,
  onOpenLightbox
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'voice'>('images');

  if (!isOpen) return null;

  const imageMessages = messages.filter(m => m.type === 'image' && m.mediaUrl);
  const voiceMessages = messages.filter(m => m.type === 'voice' && m.mediaUrl);

  const handleDownload = (url: string, filename: string = 'media-file') => {
    // Basic download trigger using anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 mirror-glass backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-lg h-[80vh] flex flex-col mirror-glass-input border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🖼️</span> Media Gallery
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex p-2 border-b border-white/10 bg-black/10">
          <button
            onClick={() => setActiveTab('images')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'images' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            Images ({imageMessages.length})
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'voice' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            Voice Notes ({voiceMessages.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'images' && (
            <div className="grid grid-cols-3 gap-2">
              {imageMessages.length > 0 ? (
                imageMessages.map(msg => (
                  <div key={msg.id} className="relative group aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/5">
                    <img
                      src={msg.mediaUrl}
                      alt="Gallery Item"
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-75"
                      onClick={() => onOpenLightbox(msg.mediaUrl!, msg.content)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex flex-col justify-end p-2">
                      <div className="flex items-center justify-between pointer-events-auto">
                         <span className="text-[9px] text-slate-300 truncate">{msg.timestamp}</span>
                         <button 
                           onClick={() => handleDownload(msg.mediaUrl!, `image_${msg.id}.jpg`)}
                           title="Download Image"
                           className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-md transition-colors"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                         </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <span className="text-4xl opacity-50">🖼️</span>
                  <p className="text-sm font-medium">No images shared yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-3">
              {voiceMessages.length > 0 ? (
                voiceMessages.map(msg => (
                  <div key={msg.id} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                          {msg.senderAvatar || '👤'}
                        </div>
                        <span className="text-xs font-bold text-emerald-400">{msg.senderName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                    </div>
                    <AudioVoicePlayer
                      audioUrl={msg.mediaUrl}
                      duration={msg.mediaMeta?.duration || 14}
                      waveData={msg.mediaMeta?.waveData}
                    />
                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => handleDownload(msg.mediaUrl!, `voice_${msg.id}.mp3`)}
                        className="text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1.5 bg-black/40 hover:bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/5 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <span className="text-4xl opacity-50">🎤</span>
                  <p className="text-sm font-medium">No voice notes shared yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
