import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { C, S } from '@/constants/theme';

import { Icon, Row, T } from './ui';

export function close() { if (router.canGoBack()) router.back(); else router.replace('/'); }

/** Kopfzeile für Detail-Ansichten: kleine Zeile oben, Titel, Schließen-Knopf */
export function ModalHeader({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <Row between style={{ alignItems: 'flex-start' }} gap={S[3]}>
      <View style={{ flex: 1, gap: 2 }}>
        {!!kicker && <T v="small" tone="muted">{kicker}</T>}
        <T v="title" style={title.length > 22 ? { fontSize: 22, lineHeight: 28 } : { fontSize: 28, lineHeight: 34 }}>{title.replace(/\//g, "/\u200b")}</T>
      </View>
      <Pressable onPress={close} accessibilityLabel="Schließen" hitSlop={7} testID="closeBtn"
        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
        <Icon icon={X} color={C.text2} size={15} />
      </Pressable>
    </Row>
  );
}
