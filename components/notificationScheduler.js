// notificationScheduler.js
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_REMINDER_TASK = "WEATHER_REMINDER_TASK";

// Background task
TaskManager.defineTask(WEATHER_REMINDER_TASK, async () => {
  try {
    const city = await AsyncStorage.getItem('default_city');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌤️ Daily Weather Update",
        body: `Check today's weather in ${city || 'your city'}`,
        sound: true,
      },
      trigger: null, // immediate when background task runs
    });
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the task
export async function registerDailyWeatherReminder() {
  await BackgroundFetch.registerTaskAsync(WEATHER_REMINDER_TASK, {
    minimumInterval: 60 * 60 * 24, // 24 hours
    stopOnTerminate: false,
    startOnBoot: true,
  });
}