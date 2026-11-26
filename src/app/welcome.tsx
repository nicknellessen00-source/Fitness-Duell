import { router } from 'expo-router';
import { Dumbbell, Flag, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Btn, Card, Icon, Row, T } from '@/components/ui';
import { S } from '@/constants/theme';
import { EXERCISES, POINTS } from '@/lib/data';

const FEATURES: [LucideIcon, string][] = [
  [Flag, `Jede Woche eine Challenge für alle – geschafft +${POINTS.challengeDone}, verpasst ${POINTS.challengeFailed} Punkte`],
  [Trophy, 'Rangliste mit deinen Freunden, jedes Training und jeder Schritt zählt'],
  [Dumbbell, `${EXERCISES.length} Übungen und Trainingspläne passend zu deinem Ziel`],
  [UtensilsCrossed, 'Mahlzeiten als Text eintragen, Kalorien werden direkt erkannt'],
];

export default function Welcome() {
  return (
    <AuthShell>
      <View style={{ gap: S[2], paddingTop: S[6] }}>
        <T v="title">Fitness als Wettkampf unter Freunden</T>
        <T tone="secondary">Trainiere, sammle Punkte und sieh jede Woche, wer vorne liegt.</T>
      </View>
      <Card>
        {FEATURES.map(([I, t]) => (
          <Row key={t} gap={S[3]} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 20, paddingTop: 2 }}><Icon icon={I} /></View>
            <T v="small" tone="secondary" style={{ flex: 1 }}>{t}</T>
          </Row>
        ))}
      </Card>
      <View style={{ gap: S[2] }}>
        <Btn title="Konto anlegen" kind="primary" onPress={() => router.push('/register')} testID="goReg" />
        <Btn title="Anmelden" onPress={() => router.push('/login')} testID="goLogin" />
      </View>
      <T v="meta" tone="muted" center>Schon ein Online-Konto? Über „Anmelden“ holst du deinen Stand auf dieses Gerät</T>
      <Btn title="Datenschutz" kind="quiet" small onPress={() => router.push('/datenschutz')} />
    </AuthShell>
  );
}
