import React, { useState } from 'react';
import { PushNotification } from '../types';
import { requestPushPermission, triggerPushNotification } from '../services/notificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onSelectChat: (chatId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onSelectChat
}) => {
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const status = await requestPushPermission();
    setPermissionStatus(status);
    if (status === 'granted') {
      triggerPushNotification(
        'Push Notifications Activated',
        'You will now receive real-time push alerts for new messages in SPLENDID CHAT.',
        { type: 'system' }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-xl animate-in fade-in duration-75">
      <div className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-white/10 shadow-2xl space-y-4 max-h-[85vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xl shadow-inner">
              🔔
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Push Notification Center</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                  {notifications.filter(n => !n.isRead).length} New
                </span>
              </h3>
              <p className="text-xs text-slate-400">Real-time alerts and events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 text-base"
          >
            ❌
          </button>
        </div>

        {/* Browser Push Permission Bar */}
        <div className="p-3.5 rounded-2xl mirror-glass-input border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✨</span>
            <div>
              <span className="font-semibold text-slate-200 block">Browser Push Notifications</span>
              <span className="text-[11px] text-slate-400 capitalize">Status: {permissionStatus}</span>
            </div>
          </div>
          {permissionStatus !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30"
            >
              Enable
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Enabled</span>
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between text-xs px-1">
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors font-medium"
          >
            <span>📭</span>
            <span>Mark all read</span>
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors font-medium"
          >
            <span>🗑️</span>
            <span>Clear list</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {notifications.length === 0 ? (
            <div className="text-center py-14 text-slate-400 space-y-2">
              <div className="text-3xl">🔕</div>
              <p className="text-xs font-semibold text-slate-200">No notifications yet</p>
              <p className="text-[11px] text-slate-500">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (notif.chatId) {
                    onSelectChat(notif.chatId);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  !notif.isRead
                    ? 'mirror-glass-input border-red-500/30 text-white'
                    : 'mirror-glass-input border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-sm">
                    {notif.avatar || '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-xs text-slate-200 truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
