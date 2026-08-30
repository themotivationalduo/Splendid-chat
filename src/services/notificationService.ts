import { PushNotification } from '../types';
import { playGlassChimeSound } from './audioService';

let notificationCallback: ((notification: PushNotification) => void) | null = null;

export function registerNotificationListener(callback: (notification: PushNotification) => void) {
  notificationCallback = callback;
}

export function unregisterNotificationListener() {
  notificationCallback = null;
}

/**
 * Request native web push notification permission
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This device does not support system push notifications');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Trigger an in-app & native push notification
 */
export function triggerPushNotification(
  title: string,
  body: string,
  options: {
    chatId?: string;
    senderId?: string;
    type?: 'message' | 'system' | 'call';
    avatar?: string;
    playSound?: boolean;
    createdAt?: number;
  } = {}
) {
  const { chatId, senderId, type = 'message', avatar, playSound = true, createdAt = Date.now() } = options;

  if (playSound) {
    playGlassChimeSound('incoming');
  }

  const notificationItem: PushNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    body,
    timestamp: 'Just now',
    chatId,
    senderId,
    isRead: false,
    type,
    avatar,
    createdAt
  };

  // 1. Notify in-app listener for mirror-glass toast banner
  if (notificationCallback) {
    notificationCallback(notificationItem);
  }

  // 2. Trigger native OS push notification if granted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`SPLENDID: ${title}`, {
        body,
        icon: '/favicon.ico',
        tag: chatId || 'splendid_chat',
      });
    } catch (e) {
      console.debug('Native notification display error:', e);
    }
  }

  return notificationItem;
}
