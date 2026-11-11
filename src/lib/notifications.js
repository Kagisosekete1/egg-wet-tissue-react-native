import {saveInboxNotification} from './inbox';
import { OneSignal } from 'react-native-onesignal';
import { router } from 'expo-router';

export const ONESIGNAL_APP_ID = 'e263c199-0f70-46eb-88c2-445f62d6c6d4';
let initialized = false;

export function initializeNotifications() {
  if (initialized) return;
  try {
    OneSignal.initialize(ONESIGNAL_APP_ID);
    initialized = true;
  } catch (error) {
    // Notifications are optional; a native SDK problem must never block game startup.
    console.warn('OneSignal initialization failed; continuing without push notifications.', error);
    return;
  }

  try {
    // Keep OneSignal in-app message cards/popups from appearing over the game UI.
    OneSignal.InAppMessages.setPaused(true);
  } catch (error) {
    console.warn('Could not pause OneSignal in-app messages.', error);
  }

  try {
    OneSignal.Notifications.addEventListener('foregroundWillDisplay',event=>{void saveInboxNotification(event.getNotification()).catch(()=>{});});
    OneSignal.Notifications.addEventListener('click', (event) => {
      void saveInboxNotification(event?.notification).catch(()=>{});
      const data = event?.notification?.additionalData;
      if (data?.type === 'egg_challenge') router.push({ pathname: '/challenges', params: { challenge_id: data.challenge_id } });
      if (data?.type === 'egg_battle_turn' && data.battle_id) router.push({ pathname: '/battle', params: { id: data.battle_id } });
    });
  } catch (error) {
    console.warn('Could not register OneSignal notification listener.', error);
  }
}

export async function enableNotifications() {
  initializeNotifications();
  const granted = await OneSignal.Notifications.requestPermission(true);
  if (granted) OneSignal.User.pushSubscription.optIn();
  return { granted, id: await OneSignal.User.pushSubscription.getIdAsync() };
}

export async function getPushSubscriptionId() {
  initializeNotifications();
  return OneSignal.User.pushSubscription.getIdAsync();
}
