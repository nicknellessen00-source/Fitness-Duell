import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { CoinIcon } from '@/components/coin';
import { ModalHeader } from '@/components/modal-header';
import { Btn, Card, Divider, Field, Icon, Num, Row, Screen, T, ValueRow } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { confirmDestructive, success, tap } from '@/lib/haptics';
import { SP } from '@/lib/logic';
import { allMatches, fmtWhen, matchState, meIn, nameOf, otherIn, sportName } from '@/lib/matches';
import { dateKey } from '@/lib/util';

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const u = useUser(); const { cloud, matchAct } = useStore();
  const m = allMatches(u, cloud.matches).find(x => x.id === id);
  const [text, setText] = useState('');
  const [reporting, setReporting] = useState(false);
  const [winner, setWinner] = useState<'me' | 'them' | 'draw'>('me');
  const [score, setScore] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [armed, setArmed] = useState(false);
  if (!m) return <Screen bottomInset><ModalHeader title="Herausforderung nicht gefunden" /></Screen>;

  const me = meIn(u, m), other = otherIn(u, m);
  const them = nameOf(other, u, cloud.friends);
  const st = matchState(u, m);
  const run = async (a: Parameters<typeof matchAct>[1]) => {
    setBusy(true); setErr('');
    const e = await matchAct(m, a);
    setBusy(false);
    if (e) setErr(e); else if (a.kind !== 'say') success();
    return !e;
  };
  const say = async () => { if (!text.trim()) return; tap(); if (await run({ kind: 'say', text: text.trim() })) setText(''); };
  const cancel = () => {
    const go = () => run({ kind: 'cancel', text: text.trim() || undefined });
    if (confirmDestructive('Absagen?', m.stake ? 'Die Einsätze gehen zurück.' : 'Die Herausforderung wird beendet.', 'Absagen', go)) return;
    if (!armed) return setArmed(true); go();
  };
  const report = () => run({ kind: 'report', winner: winner === 'draw' ? null : winner === 'me' ? me : other, score: score.trim() })
    .then(ok => ok && setReporting(false));
  const winnerName = m.winner == null ? 'Unentschieden' : m.winner === me ? 'Du' : them;
  const sp = SP[m.sport];

  return (
    <Screen bottomInset>
      <ModalHeader kicker={`Herausforderung · ${sportName(m.sport)}`} title={`${m.challenger === me ? 'Du' : them} gegen ${m.challenger === me ? them : 'dich'}`} />

      <Card style={{ gap: 0 }} testID="matchInfo">
        <Row between style={{ marginBottom: S[2] }}>
          <T v="small" strong color={st.needsMe ? C.accentInk : C.text2} testID="matchStatus">{st.text}</T>
          {m.stake > 0 && <Row gap={S[1] + 2}><CoinIcon size={18} /><Num size={16}>{['accepted', 'reported', 'done'].includes(m.status) ? m.stake * 2 : m.stake}</Num></Row>}
        </Row>
        <ValueRow label="Termin" value={fmtWhen(m.playAt)} />
        {!!m.place && <ValueRow label="Ort" value={m.place} />}
        {m.stake > 0 && <ValueRow label="Einsatz je Person" value={`${m.stake} FitCoins`} />}
        {(m.status === 'reported' || m.status === 'done') && (<>
          <Divider />
          <ValueRow label="Sieger" value={winnerName} accent={m.winner === me} />
          {!!m.score && <ValueRow label="Ergebnis" value={m.score} />}
        </>)}
      </Card>

      {/* Aktionen je nach Stand */}
      {m.status === 'open' && m.opponent === me && (
        <Row>
          <Btn title="Ablehnen" grow disabled={busy} onPress={() => run({ kind: 'respond', accept: false, text: text.trim() || undefined })} testID="mDecline" />
          <Btn title={m.stake ? `Annehmen · ${m.stake} setzen` : 'Annehmen'} kind="primary" grow disabled={busy} onPress={() => run({ kind: 'respond', accept: true, text: text.trim() || undefined })} testID="mAccept" />
        </Row>
      )}
      {m.status === 'accepted' && !reporting && <Btn title="Ergebnis eintragen" kind="primary" onPress={() => setReporting(true)} testID="mReport" />}
      {m.status === 'accepted' && reporting && (
        <Card>
          <T v="h3">Wer hat gewonnen?</T>
          <Row>
            {([['me', 'Ich'], ['them', them], ['draw', 'Remis']] as const).map(([k, l]) => (
              <Btn key={k} title={l} small grow kind={winner === k ? 'primary' : 'secondary'} onPress={() => setWinner(k)} testID={'mw-' + k} />
            ))}
          </Row>
          <Field label="Ergebnis (optional)" value={score} onChangeText={setScore} maxLength={40} placeholder={m.sport === 'golf' ? '3 auf, 2 übrig' : '6:4 6:3'} testID="mScore" />
          <Row><Btn title="Abbrechen" kind="quiet" grow onPress={() => setReporting(false)} /><Btn title="Eintragen" kind="primary" grow disabled={busy} onPress={report} testID="mReportSend" /></Row>
          <T v="meta" tone="muted">{them} muss das Ergebnis bestätigen{m.stake ? ', erst dann gehen die FitCoins an den Sieger' : ''}.</T>
        </Card>
      )}
      {m.status === 'reported' && m.reportedBy !== me && (
        <Row>
          <Btn title="Stimmt nicht" grow disabled={busy} onPress={() => run({ kind: 'confirm', ok: false, text: text.trim() || undefined })} testID="mDispute" />
          <Btn title="Bestätigen" kind="primary" grow disabled={busy} onPress={() => run({ kind: 'confirm', ok: true, text: text.trim() || undefined })} testID="mConfirm" />
        </Row>
      )}
      {m.status === 'done' && sp && (
        <Btn title={`${sp.name} als Training eintragen`} onPress={() => router.push({ pathname: '/sport/[id]', params: { id: m.sport, min: '60', date: dateKey(new Date(m.playAt || m.updatedAt)) } })} testID="mLog" />
      )}
      {(m.status === 'open' || m.status === 'accepted') && (
        <Btn title={armed ? 'Wirklich absagen' : m.status === 'open' && m.challenger === me ? 'Einladung zurückziehen' : 'Absagen'} kind="danger" disabled={busy} onPress={cancel} testID="mCancel" />
      )}
      {!!err && <T v="small" color={C.bad}>{err}</T>}

      {/* Nachrichten */}
      <Card style={{ gap: S[2] }} testID="chat">
        <T v="h3">Nachrichten</T>
        {!m.messages.length && <T v="small" tone="muted">Noch keine Nachrichten</T>}
        {m.messages.map(x => {
          const mine = x.user === me;
          return (
            <View key={x.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', gap: 2 }}>
              <View style={{ backgroundColor: mine ? C.accent : C.raised, borderRadius: R.card + 2, borderBottomRightRadius: mine ? 4 : R.card + 2, borderBottomLeftRadius: mine ? R.card + 2 : 4, paddingVertical: S[2], paddingHorizontal: S[3] }}>
                <T v="small" color={mine ? C.onAccent : C.text}>{x.text}</T>
              </View>
              <T v="meta" tone="muted" style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                {mine ? 'Du' : nameOf(x.user, u, cloud.friends)} · {new Date(x.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </T>
            </View>
          );
        })}
        <Row style={{ alignItems: 'flex-end' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Nachricht" placeholderTextColor={C.muted} multiline maxLength={500} testID="mMsg"
            style={{ flex: 1, minHeight: 40, maxHeight: 120, borderRadius: 20, backgroundColor: C.raised, color: C.text, paddingHorizontal: S[4], paddingTop: 10, paddingBottom: 10, fontSize: 16 }} />
          <Pressable onPress={say} disabled={!text.trim() || busy} accessibilityLabel="Senden" testID="mSay"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: text.trim() ? C.accent : C.fill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={ArrowUp} color={text.trim() ? C.onAccent : C.muted} size={20} />
          </Pressable>
        </Row>
      </Card>
    </Screen>
  );
}
