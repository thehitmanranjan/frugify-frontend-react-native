import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_DATE_KEY = 'frugify_install_date';
const LAST_OPEN_DATE_KEY = 'frugify_last_open_date';

export async function getInstallDate(): Promise<number> {
  let date = await AsyncStorage.getItem(INSTALL_DATE_KEY);
  if (!date) {
    const now = Date.now();
    await AsyncStorage.setItem(INSTALL_DATE_KEY, now.toString());
    return now;
  }
  return parseInt(date, 10);
}

export async function getLastOpenDate(): Promise<number | null> {
  const date = await AsyncStorage.getItem(LAST_OPEN_DATE_KEY);
  return date ? parseInt(date, 10) : null;
}

export async function setLastOpenDate(date: number) {
  await AsyncStorage.setItem(LAST_OPEN_DATE_KEY, date.toString());
}
