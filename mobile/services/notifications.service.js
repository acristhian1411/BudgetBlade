import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGoAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';
const notificationsSupported = !isExpoGoAndroid;
let _handlerConfigured = false;

export const areNotificationsSupported = () => notificationsSupported;

export const setupNotificationHandler = () => {
  if (!notificationsSupported || _handlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  _handlerConfigured = true;
};

export const addNotificationResponseListener = (handler) => {
  if (!notificationsSupported) {
    return () => {};
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
};

/**
 * Request notification permissions.
 * On iOS, shows a system permission dialog.
 * On Android, permissions are already granted at install time.
 */
export const requestPermissions = async () => {
  if (!notificationsSupported) return false;

  if (Platform.OS === 'ios') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  // Android permissions are granted at install time
  return true;
};

/**
 * Cancel all scheduled notifications.
 */
export const cancelAllNotifications = async () => {
  if (!notificationsSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Schedule notifications for given occurrences.
 * One notification per occurrence, scheduled for 9:00 AM on the due_date.
 * @param {Array} occurrences - Array of { id, due_date, title, installment_number, amount } from DB
 */
export const scheduleOccurrenceNotifications = async (occurrences) => {
  if (!notificationsSupported) return;

  // Cancel all existing notifications first
  await cancelAllNotifications();

  for (const occ of occurrences) {
    try {
      const dueDate = new Date(occ.due_date);
      // Set notification time to 9:00 AM on the due date
      dueDate.setHours(9, 0, 0, 0);

      const now = new Date();
      // Only schedule if due date is in the future
      if (dueDate > now) {
        const body = occ.amount 
          ? `${occ.title} (cuota ${occ.installment_number}) - ${formatCurrency(occ.amount)}`
          : `${occ.title} (cuota ${occ.installment_number})`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Vencimiento próximo',
            body,
            data: { occurrenceId: occ.id.toString() },
            badge: 1,
          },
          trigger: {
            type: 'date',
            date: dueDate,
          },
        });
      }
    } catch (err) {
      console.warn('Failed to schedule notification for occurrence', occ.id, err);
    }
  }
};

/**
 * Helper: Format a number as PYG currency.
 * @param {number} val
 * @returns {string}
 */
const formatCurrency = (val) => {
  return new Intl.NumberFormat('es-PY', { 
    style: 'currency', 
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

/**
 * Get the last notification response (when user taps a notification).
 * Returns the notification data if the app was launched from a notification.
 * @returns {Promise<Object | null>} { occurrenceId } or null
 */
export const getInitialNotificationData = async () => {
  if (!notificationsSupported) return null;

  const response = await Notifications.getLastNotificationResponseAsync();
  if (response?.notification?.request?.content?.data?.occurrenceId) {
    return {
      occurrenceId: parseInt(response.notification.request.content.data.occurrenceId, 10),
    };
  }
  return null;
};
