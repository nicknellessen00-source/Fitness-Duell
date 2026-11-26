import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, Square } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { C } from '@/constants/theme';
import { tap } from '@/lib/haptics';

import { Icon } from './ui';

/** Mikrofon-Knopf: gesprochener Text („zwei Eier und ein Glas Orangensaft“) landet im Eingabefeld */
export function VoiceButton({ onText, onError }: { onText: (t: string, final: boolean) => void; onError: (m: string) => void }) {
  const [on, setOn] = useState(false);
  useSpeechRecognitionEvent('start', () => setOn(true));
  useSpeechRecognitionEvent('end', () => setOn(false));
  useSpeechRecognitionEvent('result', e => { const t = e.results[0]?.transcript; if (t) onText(t, e.isFinal); });
  useSpeechRecognitionEvent('error', e => {
    setOn(false);
    if (e.error !== 'aborted' && e.error !== 'no-speech') onError(e.error === 'not-allowed' ? 'Mikrofon oder Spracherkennung wurde nicht erlaubt' : 'Spracheingabe nicht verfügbar');
  });
  const toggle = async () => {
    tap();
    if (on) { ExpoSpeechRecognitionModule.stop(); return; }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) { onError('Spracheingabe ist auf diesem Gerät nicht verfügbar'); return; }
    const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!p.granted) { onError('Mikrofon oder Spracherkennung wurde nicht erlaubt'); return; }
    ExpoSpeechRecognitionModule.start({ lang: 'de-DE', interimResults: true, continuous: false });
  };
  return (
    <Pressable onPress={toggle} accessibilityLabel={on ? 'Spracheingabe beenden' : 'Spracheingabe'} testID="mic"
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? C.bad : C.raised, alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon={on ? Square : Mic} color={on ? '#fff' : C.text} filled={on} size={18} />
    </Pressable>
  );
}
