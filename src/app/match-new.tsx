import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { CoinIcon, useCoins } from '@/components/coin';
import { ModalHeader } from '@/components/modal-header';
import { Avatar, Btn, Card, Divider, Field, Icon, Num, Row, Screen, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { SPORTS } from '@/lib/data';
import { success } from '@/lib/haptics';
import { SPORT_SF } from '@/lib/icons';
import { allFriends, friendDigest } from '@/lib/logic';
import { sportIcon } from '@/lib/sport-icons';
import { addDays, nf, parseKey, today } from '@/lib/util';

/* Sportarten, die man typischerweise gegeneinander spielt, zuerst */
const TOP = ['tennis', 'padel', 'squash', 'badminton', 'tischtennis', 'golf', 'laufen', 'radfahren', 'schwimmen', 'fussball', 'basketball', 'boxen'];
const TEXTS = ['Lust auf ein Match?', 'Zeit für eine Revanche!', 'Wer verliert, gibt das Getränk aus.', 'Mal sehen, wer hier wirklich fit ist.'];
const TIMES = ['08:00', '12:00', '18:00', '19:30'];

function dayOptions(): [string, string][] {
  const t = today(); const out: [string, string][] = [['', 'Offen'], [t, 'Heute'], [addDays(t, 1), 'Morgen']];
  for (let i = 2; i <= 7; i++) {
    const d = addDays(t, i); const wd = parseKey(d).getDay();
    if (wd === 6 || wd === 0) out.push([d, wd === 6 ? 'Samstag' : 'Sonntag']);
  }
  return out;
}

function Chip({ on, label, onPress, testID }: { on: boolean; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={4} testID={testID}
      style={{ height: 34, paddingHorizontal: S[4], justifyContent: 'center', borderRadius: 17, backgroundColor: on ? C.accent : C.fill }}>
      <T v="small" strong={on} color={on ? C.onAccent : C.text}>{label}</T>
    </Pressable>
  );
}

export default function MatchNew() {
  const params = useLocalSearchParams<{ friend?: string; sport?: string }>();
  const u = useUser(); const { cloud, createMatch } = useStore(); const { balance, online } = useCoins();
  const friends = allFriends(u, cloud.friends).map(f => ({ f, dg: friendDigest(f, cloud.friends) })).filter(x => x.dg);
  const [fid, setFid] = useState(params.friend || friends[0]?.f.id || '');
  const [sport, setSport] = useState(params.sport || 'tennis');
  const [more, setMore] = useState(false);
  const [text, setText] = useState(TEXTS[0]);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('18:00');
  const [place, setPlace] = useState('');
  const [stake, setStake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const sel = friends.find(x => x.f.id === fid);
  const isCloud = sel?.f.kind === 'cloud';
  const sports = more ? [...TOP, ...SPORTS.map(s => s.id).filter(id => !TOP.includes(id))] : TOP;

  const send = async () => {
    if (!sel) return;
    let playAt: number | null = null;
    if (day) {
      const m = time.match(/^(\d{1,2})[:.](\d{2})$/);
      if (!m) { setErr('Uhrzeit bitte als HH:MM, z. B. 18:30'); return; }
      const d = parseKey(day); d.setHours(+m[1], +m[2], 0, 0); playAt = d.getTime();
    }
    setBusy(true); setErr('');
    const e = await createMatch({ friend: { kind: isCloud ? 'cloud' : 'demo', id: isCloud ? sel.f.uid! : sel.f.id }, sport, message: text.trim(), playAt, place: place.trim(), stake: isCloud ? stake : 0 });
    setBusy(false);
    if (e) setErr(e); else { success(); router.back(); }
  };

  return (
    <Screen bottomInset>
      <ModalHeader kicker="Sport-Herausforderung" title="Freund herausfordern" />
      {!friends.length ? <Card><T tone="secondary">Füge zuerst einen Freund hinzu.</T></Card> : (<>
        <Card style={{ gap: S[2] }}>
          <T v="h3">Gegner</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S[3], paddingVertical: S[1] }}>
            {friends.map(({ f, dg }) => (
              <Pressable key={f.id} onPress={() => { setFid(f.id); if (f.kind !== 'cloud') setStake(0); }} testID={'mf-' + f.id} style={{ alignItems: 'center', gap: S[1], width: 72 }}>
                <View style={{ padding: 2, borderRadius: 26, borderWidth: 2, borderColor: fid === f.id ? C.accentInk : 'transparent' }}>
                  <Avatar name={dg!.name} color={dg!.color} size={44} />
                </View>
                <T v="meta" numberOfLines={1} tone={fid === f.id ? 'primary' : 'secondary'}>{dg!.name.replace(' (Demo)', '')}</T>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        <Card style={{ gap: S[2] }}>
          <T v="h3">Sportart</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
            {sports.map(id => {
              const sp = SPORTS.find(s => s.id === id); if (!sp) return null;
              const on = sport === id;
              return (
                <Pressable key={id} onPress={() => setSport(id)} testID={'ms-' + id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: S[1] + 2, height: 36, paddingHorizontal: S[3], borderRadius: 18, backgroundColor: on ? C.accent : C.fill }}>
                  <Icon icon={sportIcon(id, sp.cat)} sf={SPORT_SF[id]} size={16} color={on ? C.onAccent : C.text2} />
                  <T v="small" strong={on} color={on ? C.onAccent : C.text}>{sp.name}</T>
                </Pressable>
              );
            })}
          </View>
          {!more && <Btn title="Weitere Sportarten" small kind="quiet" onPress={() => setMore(true)} />}
        </Card>

        <Card style={{ gap: S[2] }}>
          <T v="h3">Nachricht</T>
          <TextInput value={text} onChangeText={setText} multiline maxLength={280} placeholder="Schreib etwas dazu" placeholderTextColor={C.muted} testID="mText"
            style={{ minHeight: 72, borderRadius: 10, backgroundColor: C.raised, color: C.text, padding: S[3], fontSize: 17, textAlignVertical: 'top' }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S[2] }}>
            {TEXTS.map(t => <Chip key={t} on={text === t} label={t} onPress={() => setText(t)} />)}
          </ScrollView>
        </Card>

        <Card style={{ gap: S[2] }}>
          <T v="h3">Wann und wo</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S[2] }}>
            {dayOptions().map(([d, l]) => <Chip key={l} on={day === d} label={l} onPress={() => setDay(d)} testID={'md-' + (d || 'open')} />)}
          </ScrollView>
          {!!day && (
            <Row wrap>
              {TIMES.map(t => <Chip key={t} on={time === t} label={t} onPress={() => setTime(t)} />)}
              <TextInput value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} placeholderTextColor={C.muted}
                style={{ width: 76, height: 34, borderRadius: 17, backgroundColor: C.raised, color: C.text, textAlign: 'center', fontSize: 15 }} />
            </Row>
          )}
          <Field label="Ort (optional)" value={place} onChangeText={setPlace} maxLength={80} placeholder="Tennisclub, Halle, Park …" />
        </Card>

        <Card style={{ gap: S[2] }}>
          <Row between>
            <T v="h3">Einsatz</T>
            {isCloud && online && <Row gap={S[1] + 2}><CoinIcon size={16} /><Num size={14} color={C.text2}>{nf(balance)}</Num></Row>}
          </Row>
          {isCloud && online ? (<>
            <Row>{[0, 10, 25, 50].map(a => <Btn key={a} title={a ? String(a) : 'Ohne'} small grow kind={stake === a ? 'primary' : 'secondary'} disabled={a > balance} onPress={() => setStake(a)} testID={'mst-' + a} />)}</Row>
            <T v="meta" tone="muted">Beide setzen gleich viel. Wer gewinnt, bekommt {stake ? stake * 2 : 'beide Einsätze'} FitCoins. Bei Unentschieden oder Absage gibt es alles zurück.</T>
          </>) : (
            <T v="small" tone="muted">{isCloud ? 'FitCoin-Einsätze gehen mit Online-Coins (Profil → Online-Konto).' : 'Gegen Demo-Freunde ohne Einsatz – zum Ausprobieren.'}</T>
          )}
        </Card>

        {!!err && <T v="small" color={C.bad}>{err}</T>}
        <Btn title={stake ? `Herausfordern · ${stake} FitCoins` : 'Herausfordern'} kind="primary" disabled={busy || !sel} onPress={send} testID="mSend" />
        <Divider />
        <T v="meta" tone="muted" center>{sel ? `${sel.dg!.name.replace(' (Demo)', '')} bekommt deine Einladung und kann zusagen oder ablehnen.` : ''}</T>
      </>)}
      <View style={{ height: R.small }} />
    </Screen>
  );
}
