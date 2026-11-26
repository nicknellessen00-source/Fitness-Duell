import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CoinIcon, useCoins } from '@/components/coin';
import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Num, Row, Screen, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore } from '@/context/app-store';
import { success } from '@/lib/haptics';
import { nf } from '@/lib/util';

/** Anfeuern: einem Online-Freund ein paar FitCoins schicken */
export default function Cheer() {
  const { uid, name } = useLocalSearchParams<{ uid: string; name: string }>();
  const { cheer } = useStore(); const { balance: bal, online } = useCoins();
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true); setMsg('');
    const err = await cheer(uid, amount);
    setBusy(false);
    if (err) setMsg(err); else { success(); close(); }
  };

  return (
    <Screen bottomInset>
      <ModalHeader kicker="Anfeuern" title={name || 'Freund'} />
      <T v="small" tone="secondary">Schick {name || 'deinem Freund'} ein paar FitCoins als Anerkennung. Höchstens 25 auf einmal und 50 pro Tag.</T>
      {!online ? (
        <Card><T tone="secondary">Anfeuern geht nur mit Online-Konto und eingerichteten Online-Coins.</T></Card>
      ) : (
        <Card>
          <Row>
            {[5, 10, 25].map(a => (
              <Btn key={a} title={`${a}`} grow kind={amount === a ? 'primary' : 'secondary'} onPress={() => setAmount(a)} testID={'amt-' + a} />
            ))}
          </Row>
          <Row between>
            <T v="small" tone="muted">Dein Kontostand</T>
            <Row gap={S[1] + 2}><CoinIcon size={16} /><Num size={14}>{nf(bal)}</Num></Row>
          </Row>
          {!!msg && <T v="small" color={C.bad}>{msg}</T>}
          <View style={{ height: S[1] }} />
          <Btn title={`${amount} FitCoins schicken`} kind="primary" disabled={busy || bal < amount} onPress={send} testID="cheerSend" />
        </Card>
      )}
    </Screen>
  );
}
