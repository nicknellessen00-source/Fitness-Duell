import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CoinIcon, useCoins } from '@/components/coin';
import { Mannequin, useLevel } from '@/components/mannequin';
import { ModalHeader } from '@/components/modal-header';
import { Avatar, Btn, Card, Divider, Num, Row, Screen, Seg, T, ValueRow } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { COIN, lookOf, REASON_LABEL, SHOP, type ShopItem, type WearKind } from '@/lib/coins';
import { success } from '@/lib/haptics';
import { nf } from '@/lib/util';

type Tab = 'shop' | 'earn' | 'history';

export default function Coins() {
  const u = useUser(); const { buy, equip } = useStore();
  const [tab, setTab] = useState<Tab>('shop');
  const [msg, setMsg] = useState('');
  const [tryOn, setTryOn] = useState<ShopItem | null>(null);
  const lv = useLevel();
  const { balance: bal, ledger, online, serverMissing } = useCoins();
  const inv = u.inv || { jokers: 0, jokerWeeks: [], owned: [] };
  const hist = ledger;

  const doBuy = async (it: ShopItem) => {
    setMsg('');
    const err = await buy(it.id);
    if (err) setMsg(err); else { success(); setMsg(`${it.name} gekauft`); setTryOn(null); }
  };

  const item = (it: ShopItem) => {
    const owned = it.kind !== 'joker' && inv.owned.includes(it.id);
    const active = it.kind !== 'joker' && inv[it.kind] === it.id;
    const locked = !owned && !!it.minLevel && lv.level < it.minLevel;
    const wear = it.kind === 'shirt' || it.kind === 'shorts' || it.kind === 'shoes' || it.kind === 'band';
    const trying = tryOn?.id === it.id;
    return (
      <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S[3], minHeight: 60, paddingVertical: S[2] }} testID={'shop-' + it.id}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: it.kind === 'joker' ? C.accent : C.raised, borderWidth: it.kind === 'frame' ? 3 : 0, borderColor: it.color }}>
          {wear ? <View style={{ width: 22, height: it.kind === 'band' ? 8 : it.kind === 'shoes' ? 12 : 22, borderRadius: it.kind === 'shirt' ? 6 : 4, backgroundColor: it.color }} />
            : it.kind === 'joker' ? <T strong color={C.onAccent}>J</T>
              : <Avatar name={u.profile.name} color={u.profile.color} size={28} />}
        </View>
        <View style={{ flex: 1 }}>
          <T>{it.name}{it.kind === 'joker' && inv.jokers > 0 ? ` · ${inv.jokers} vorhanden` : ''}</T>
          <T v="meta" tone={locked ? 'secondary' : 'muted'}>{locked ? `Ab Level ${it.minLevel}` : wear ? (active ? 'Trägt deine Figur' : owned ? 'Gekauft' : '') : it.desc}</T>
        </View>
        {owned ? (
          <Btn title={active ? 'Aktiv' : 'Tragen'} small kind={active ? 'quiet' : 'secondary'} disabled={active}
            onPress={() => { equip(it.kind as WearKind, it.id); setTryOn(null); }} testID={'equip-' + it.id} />
        ) : locked ? (
          <View style={{ height: 36, paddingHorizontal: S[3], borderRadius: 18, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' }} testID={'lock-' + it.id}>
            <T v="meta" strong tone="muted">Level {it.minLevel}</T>
          </View>
        ) : (<Row gap={S[2]}>
          {wear && <Btn title={trying ? 'Aus' : 'Probe'} small kind="quiet" onPress={() => setTryOn(trying ? null : it)} testID={'try-' + it.id} />}
          <Pressable onPress={() => doBuy(it)} disabled={bal < it.price} testID={'buy-' + it.id}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S[1] + 2, height: 36, paddingHorizontal: S[3], borderRadius: 18, backgroundColor: bal >= it.price ? C.accent : C.fill, opacity: pressed ? 0.8 : 1 })}>
            <CoinIcon size={16} />
            <Num size={14} color={bal >= it.price ? C.onAccent : C.muted}>{it.price}</Num>
          </Pressable>
        </Row>)}
      </View>
    );
  };

  const outfit = { ...lookOf(u), ...(tryOn ? { [tryOn.kind]: tryOn.color } : {}) };
  const wearSection = (kind: WearKind, title: string) => (
    <Card style={{ gap: 0 }} key={kind}>
      <Row between><T v="h3">{title}</T>
        {inv[kind] && <Btn title={kind === 'frame' ? 'Ohne' : kind === 'band' ? 'Ablegen' : 'Standard'} small kind="quiet" onPress={() => equip(kind, undefined)} />}</Row>
      {SHOP.filter(s => s.kind === kind).map((it, i) => <View key={it.id}>{i > 0 && <Divider />}{item(it)}</View>)}
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Screen bottomInset>
      <ModalHeader kicker="Belohnungen" title="FitCoins" />
      <Card>
        <Row gap={S[3]}>
          <CoinIcon size={44} />
          <View style={{ flex: 1 }}>
            <Num size={36} testID="coinBalance">{nf(bal)}</Num>
            <T v="small" tone="muted">{online ? 'Online-Konto · ' : ''}FitCoins · kein Geldwert</T>
          </View>
          <Mannequin width={84} outfit={outfit} animate={false} />
        </Row>
      </Card>

      {serverMissing && <T v="small" tone="muted" center>Online-Coins sind auf dem Server noch nicht eingerichtet – bis dahin zählt das Gerät.</T>}
      <Seg items={[['shop', 'Shop'], ['earn', 'Verdienen'], ['history', 'Verlauf']]} value={tab} onChange={setTab} />
      {!!msg && <T v="small" tone="secondary" center testID="coinMsg">{msg}</T>}

      {tab === 'shop' && (<>
        <Card style={{ gap: 0 }}>
          <T v="h3">Joker</T>
          {item(SHOP[0])}
        </Card>
        {wearSection('shirt', 'Shirts')}
        {wearSection('shorts', 'Hosen')}
        {wearSection('shoes', 'Schuhe')}
        {wearSection('band', 'Stirnbänder')}
        {wearSection('frame', 'Rahmen in der Rangliste')}
      </>)}

      {tab === 'earn' && (
        <Card style={{ gap: 0 }}>
          <ValueRow label="Training oder Sport ab 20 Minuten" value={`+${COIN.training}`} />
          <ValueRow label="Schrittziel (automatisch gezählt)" value={`+${COIN.steps}`} />
          <ValueRow label="Neue Bestleistung" value={`+${COIN.pr}`} />
          <ValueRow label="7 Tage in Folge aktiv" value={`+${COIN.streak}`} />
          <ValueRow label="Wochen-Challenge geschafft" value={`+${COIN.challenge}`} />
          <ValueRow label="Duell gewonnen" value={`+${COIN.duel}`} />
          <Divider />
          <T v="meta" tone="muted" style={{ marginTop: S[2] }}>Training, Schritte und Bestleistungen bringen zusammen höchstens {COIN.dailyCap} FitCoins pro Tag. FitCoins lassen sich nicht kaufen oder auszahlen.</T>
        </Card>
      )}

      {tab === 'history' && (
        <Card style={{ gap: 0 }}>
          {!hist.length && <T v="small" tone="muted">Noch keine Buchungen</T>}
          {hist.map((t, i) => (
            <View key={t.key}>
              {i > 0 && <Divider />}
              <Row gap={S[3]} style={{ minHeight: 48 }}>
                <View style={{ flex: 1 }}>
                  <T v="small">{REASON_LABEL[t.reason]}</T>
                  {!!t.note && <T v="meta" tone="muted" numberOfLines={1}>{t.note}</T>}
                </View>
                <Num size={14} color={t.amount >= 0 ? C.accentInk : C.text2}>{t.amount >= 0 ? '+' : ''}{nf(t.amount)}</Num>
              </Row>
            </View>
          ))}
        </Card>
      )}
      <View style={{ height: tryOn ? 190 : R.small }} />
    </Screen>
    {tryOn && (
      <View testID="tryOnCard" style={{ position: 'absolute', left: S[4], right: S[4], bottom: S[6], flexDirection: 'row', alignItems: 'center', gap: S[4], padding: S[3], borderRadius: R.card + 4, backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
        <Mannequin width={104} outfit={outfit} />
        <View style={{ flex: 1, gap: S[1] }}>
          <T v="meta" tone="muted">Anprobe</T>
          <T v="h3">{tryOn.name}</T>
          <Row gap={S[2]}>
            <Btn title="Zurück" small kind="quiet" onPress={() => setTryOn(null)} testID="tryOff" />
            <Btn title={`${tryOn.price} kaufen`} small kind="primary" disabled={bal < tryOn.price} onPress={() => doBuy(tryOn)} testID="tryBuy" />
          </Row>
        </View>
      </View>
    )}
    </View>
  );
}
