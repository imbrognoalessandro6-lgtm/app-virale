import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, formatEuro, parseISODate } from './format';
import type { Deadline } from './types';

const PREFIX = 'scadenza-';
const CHANNEL = 'scadenze';
const REMIND_HOUR = 9;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const supported = Platform.OS !== 'web';

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Promemoria scadenze',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Riallinea i promemoria locali con l'elenco delle scadenze: 3 giorni prima e il giorno stesso alle 9.
 * Va chiamata dopo ogni aggiornamento, così anche le scadenze aggiunte da altri membri suonano su questo telefono.
 */
export async function syncReminders(deadlines: Deadline[]): Promise<void> {
  if (!supported) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const now = Date.now();
  for (const d of deadlines) {
    if (d.paid) continue;
    const amount = d.amount ? ` (${formatEuro(d.amount)})` : '';
    const reminders = [
      { offset: -3, title: `⏰ Tra 3 giorni: ${d.title}`, suffix: 'meno3' },
      { offset: 0, title: `🔔 Scade oggi: ${d.title}`, suffix: 'oggi' },
    ];
    for (const r of reminders) {
      const when = parseISODate(addDays(d.dueDate, r.offset));
      when.setHours(REMIND_HOUR, 0, 0, 0);
      if (when.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${d.id}-${r.suffix}`,
        content: { title: r.title, body: `Apri l'app per segnarla come pagata${amount}.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      });
    }
  }
}
