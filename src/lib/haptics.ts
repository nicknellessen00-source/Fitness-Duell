/* Fühlbare Rückmeldung nach Apple-Vorbild – auf Web und älteren Geräten ohne Wirkung */
import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

const on = Platform.OS === 'ios' || Platform.OS === 'android';
export const tap = () => { if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
export const select = () => { if (on) Haptics.selectionAsync().catch(() => {}); };
export const success = () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
export const warn = () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); };

/** Bestätigung für endgültige Aktionen: auf iOS/Android der System-Dialog, im Web ein zweites Tippen */
export function confirmDestructive(title: string, message: string, label: string, action: () => void) {
  if (!on) return false;
  warn();
  Alert.alert(title, message, [{ text: 'Abbrechen', style: 'cancel' }, { text: label, style: 'destructive', onPress: action }]);
  return true;
}
