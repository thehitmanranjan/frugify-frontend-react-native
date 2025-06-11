import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export type SmsMessage = {
  _id: string;
  address: string;
  body: string;
  date: number;
  read: number;
};

export function useUnreadSms(since: number) {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    async function fetchSms() {
      setLoading(true);
      setError(null);
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Permission',
            message: 'Frugify needs access to your SMS messages to show unread messages.',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('SMS permission denied');
          setLoading(false);
          return;
        }
        // @ts-ignore
        const SmsAndroid = require('react-native-get-sms-android');
        SmsAndroid.list(
          JSON.stringify({
            box: 'inbox',
            minDate: since,
            read: 0,
          }),
          (fail: any) => {
            if (!cancelled) {
              setError('Failed to get SMS: ' + fail);
              setLoading(false);
            }
          },
          (count: number, smsList: string) => {
            if (!cancelled) {
              const arr: SmsMessage[] = JSON.parse(smsList);
              setMessages(arr);
              setLoading(false);
            }
          }
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Unknown error');
          setLoading(false);
        }
      }
    }
    fetchSms();
    return () => {
      cancelled = true;
    };
  }, [since]);

  return { messages, loading, error };
}
