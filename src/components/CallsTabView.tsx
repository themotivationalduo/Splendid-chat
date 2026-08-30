import React from 'react';
import { Chat, CallLog } from '../types';
import { playGlassChimeSound } from '../services/audioService';

interface CallsTabViewProps {
  chats: Chat[];
  callLogs: CallLog[];
  onStartCall: (chat: Chat, isVideo: boolean) => void;
  onOpenContacts: () => void;
}

export const CallsTabView: React.FC<CallsTabViewProps> = ({
  chats,
  callLogs,
  onStartCall,
  onOpenContacts
}) => {
  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4 pb-28 animate-in fade-in duration-75">
      {/* Header Info Banner */}
      <div className="p-4 rounded-3xl mirror-glass border border-white/10 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl text-white shadow-md shadow-emerald-500/20">
            📞
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>HD Audio & Video Calls</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Crystal clear peer calling with high quality audio.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenContacts}
          className="px-3 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-600 text-xs font-bold transition-all"
        >
          <span>➕ New Call</span>
        </button>
      </div>

      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Recent Calls ({callLogs.length})
        </h3>
      </div>

      {/* Call Logs or Empty State */}
      {callLogs.length === 0 ? (
        <div className="p-8 rounded-3xl mirror-glass-card border border-white/10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-2xl">
            📵
          </div>
          <h4 className="text-sm font-bold text-slate-100">No recent calls</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            You haven't made or received any calls yet. Select a contact from your list to start an audio or video call.
          </p>
          <button
            onClick={onOpenContacts}
            className="mt-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all active:scale-95 flex items-center gap-1.5 mx-auto"
          >
            <span>👥</span>
            <span>Browse Contacts to Call</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/5 mirror-glass-card rounded-3xl p-2 border border-white/10">
          {callLogs.map((log) => {
            const associatedChat = chats.find(c => c.id === log.chatId) || chats[0];

            return (
              <div key={log.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors select-none">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl mirror-glass-input border border-white/10 flex items-center justify-center text-xl text-white shrink-0 shadow-sm">
                    {log.avatar || '👤'}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{log.name}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>
                        {log.type === 'incoming' ? '📲' : log.type === 'outgoing' ? '📞' : '📵'}
                      </span>
                      <span className="capitalize">{log.type}</span>
                      <span>•</span>
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => alert('Voice Call feature is currently under maintenance.')}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-white transition-colors flex items-center justify-center text-base"
                    title="Audio Call"
                  >
                    <span>📞</span>
                  </button>
                  <button
                    onClick={() => alert('Video Call feature is currently under maintenance.')}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-white transition-colors flex items-center justify-center text-base"
                    title="Video Call"
                  >
                    <span>📹</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
