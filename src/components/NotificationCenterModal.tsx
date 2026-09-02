import React, { useState, useMemo } from 'react';
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

export interface AggregatedNotificationBatch {
  id: string;
  senderId?: string;
  chatId?: string;
  title: string;
  avatar?: string;
  type: 'message' | 'system' | 'call';
  latestTimestamp: string;
  latestCreatedAt: number;
  earliestCreatedAt: number;
  isRead: boolean;
  count: number;
  unreadCount: number;
  messages: {
    id: string;
    body: string;
    timestamp: string;
    createdAt: number;
    isRead: boolean;
  }[];
  notificationIds: string[];
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
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});
  const [selectedFullNotification, setSelectedFullNotification] = useState<AggregatedNotificationBatch | null>(null);

  // 30-second window batching mechanism with 2-day expiration
  const batchedNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return [];

    const WINDOW_MS = 30 * 1000; // 30 seconds
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 2 days expiration
    const now = Date.now();

    // Normalize, filter out notifications older than 2 days, and sort from newest to oldest
    const sorted = [...notifications]
      .map(n => ({
        ...n,
        title: 'SPLENDID CHAT',
        createdAt: n.createdAt || Date.now()
      }))
      .filter(n => (now - n.createdAt) <= TWO_DAYS_MS)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const batches: AggregatedNotificationBatch[] = [];

    for (const notif of sorted) {
      const senderKey = notif.senderId || notif.chatId || notif.title;

      // Find an existing batch with the same senderKey and type that is within the 30-second window
      const matchingBatch = batches.find(b => {
        const bSenderKey = b.senderId || b.chatId || b.title;
        if (bSenderKey !== senderKey || b.type !== notif.type) return false;

        // Check if this notification is within 30s of the batch's time range
        const timeDiffLatest = Math.abs(b.latestCreatedAt - notif.createdAt);
        const timeDiffEarliest = Math.abs(b.earliestCreatedAt - notif.createdAt);

        return timeDiffLatest <= WINDOW_MS || timeDiffEarliest <= WINDOW_MS;
      });

      if (matchingBatch) {
        matchingBatch.count += 1;
        if (!notif.isRead) {
          matchingBatch.unreadCount += 1;
          matchingBatch.isRead = false;
        }
        matchingBatch.notificationIds.push(notif.id);
        matchingBatch.messages.push({
          id: notif.id,
          body: notif.body,
          timestamp: notif.timestamp,
          createdAt: notif.createdAt,
          isRead: notif.isRead
        });

        // Update timestamps
        if (notif.createdAt > matchingBatch.latestCreatedAt) {
          matchingBatch.latestCreatedAt = notif.createdAt;
          matchingBatch.latestTimestamp = notif.timestamp;
        }
        if (notif.createdAt < matchingBatch.earliestCreatedAt) {
          matchingBatch.earliestCreatedAt = notif.createdAt;
        }
      } else {
        batches.push({
          id: notif.id,
          senderId: notif.senderId,
          chatId: notif.chatId,
          title: 'SPLENDID CHAT',
          avatar: notif.avatar,
          type: notif.type,
          latestTimestamp: notif.timestamp,
          latestCreatedAt: notif.createdAt,
          earliestCreatedAt: notif.createdAt,
          isRead: notif.isRead,
          count: 1,
          unreadCount: notif.isRead ? 0 : 1,
          messages: [{
            id: notif.id,
            body: notif.body,
            timestamp: notif.timestamp,
            createdAt: notif.createdAt,
            isRead: notif.isRead
          }],
          notificationIds: [notif.id]
        });
      }
    }

    // Sort batches so newest activity is at the top
    batches.sort((a, b) => b.latestCreatedAt - a.latestCreatedAt);

    return batches;
  }, [notifications]);

  const totalUnreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const toggleExpand = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedBatchIds(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-75 select-none will-change-transform">
      <div 
        className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-4 max-h-[85vh] flex flex-col relative will-change-transform"
        style={{ willChange: 'transform' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl shadow-inner">
              🔔
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Push Notification Center</span>
                {totalUnreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold shadow-sm shadow-blue-600/40">
                    {totalUnreadCount} New
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Real-time alerts</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  ⚡ 30s Batching Active
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all text-xs border border-white/10 active:scale-95"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Push Permission Bar */}
        <div className="p-3.5 rounded-2xl mirror-glass-input border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✨</span>
            <div>
              <span className="font-semibold text-slate-200 block">System Push Notifications</span>
              <span className="text-[11px] text-slate-400 capitalize">Status: {permissionStatus}</span>
            </div>
          </div>
          {permissionStatus !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 active:scale-95"
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
            disabled={notifications.length === 0}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors font-medium cursor-pointer"
          >
            <span>📭</span>
            <span>Mark all read</span>
          </button>
          <button
            onClick={onClearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors font-medium cursor-pointer"
          >
            <span>🗑️</span>
            <span>Clear list</span>
          </button>
        </div>

        {/* Notifications List (Aggregated by 30-second window) */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-[220px]">
          {batchedNotifications.length === 0 ? (
            <div className="text-center py-14 text-slate-400 space-y-2">
              <div className="text-3xl">🔕</div>
              <p className="text-xs font-semibold text-slate-200">No notifications yet</p>
              <p className="text-[11px] text-slate-500">Notifications automatically expire after 2 days</p>
            </div>
          ) : (
            batchedNotifications.map((batch) => {
              const isExpanded = !!expandedBatchIds[batch.id];
              const isMulti = batch.count > 1;

              return (
                <div
                  key={batch.id}
                  onClick={() => {
                    setSelectedFullNotification(batch);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none relative group ${
                    !batch.isRead
                      ? 'mirror-glass-input border-blue-500/40 text-white shadow-md shadow-blue-500/10'
                      : 'mirror-glass-input border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with batch count pill */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-sm font-bold shadow-inner">
                        {batch.avatar || (batch.type === 'call' ? '📞' : batch.type === 'system' ? '⚙️' : '💬')}
                      </div>
                      {isMulti && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-blue-600 border border-[#090b0f] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg">
                          {batch.count}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title & Timestamp Header */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs text-slate-100 truncate">
                            SPLENDID CHAT
                          </span>
                          {isMulti && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                              {batch.count} alerts
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {batch.latestTimestamp}
                        </span>
                      </div>

                      {/* Content summary */}
                      {isMulti ? (
                        <div className="space-y-1.5">
                          {/* Summary headline */}
                          <p className="text-xs text-slate-300 line-clamp-1 leading-relaxed">
                            <span className="text-slate-400 font-medium mr-1">Latest:</span>
                            {batch.messages[0]?.body}
                          </p>

                          {/* Expandable messages list */}
                          {isExpanded && (
                            <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5 animate-in slide-in-from-top-1 fade-in duration-75">
                              {batch.messages.map((msg, idx) => (
                                <div 
                                  key={msg.id || idx}
                                  className="text-[11px] p-1.5 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-2"
                                >
                                  <span className="text-slate-300 flex-1 leading-relaxed">
                                    • {msg.body}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono shrink-0">
                                    {msg.timestamp}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Expand/Collapse Trigger */}
                          <div className="flex items-center justify-between pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(batch.id, e)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                            >
                              <span>{isExpanded ? '▴ Hide details' : `▾ View all ${batch.count} alerts`}</span>
                            </button>
                            {!batch.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {batch.messages[0]?.body}
                          </p>
                          {!batch.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Complete Notification Information Modal */}
        {selectedFullNotification && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-75">
            <div className="w-full max-w-sm p-6 rounded-3xl mirror-glass-card border border-white/20 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-sm font-bold">
                    {selectedFullNotification.avatar || '💬'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">SPLENDID CHAT</h4>
                    <p className="text-[10px] text-slate-400">{selectedFullNotification.latestTimestamp}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFullNotification(null)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs border border-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div className="text-xs font-medium text-slate-300 space-y-2">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                    Notification Details ({selectedFullNotification.count} message{selectedFullNotification.count > 1 ? 's' : ''})
                  </span>
                  {selectedFullNotification.messages.map((m, i) => (
                    <div key={m.id || i} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <p className="text-slate-100 text-xs leading-relaxed">{m.body}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1 border-t border-white/5">
                        <span>Received</span>
                        <span>{m.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                {selectedFullNotification.chatId && (
                  <button
                    onClick={() => {
                      if (selectedFullNotification.chatId) {
                        onSelectChat(selectedFullNotification.chatId);
                      }
                      setSelectedFullNotification(null);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30"
                  >
                    Open Chat
                  </button>
                )}
                <button
                  onClick={() => setSelectedFullNotification(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
