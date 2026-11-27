import React, { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, Screen, Title, s, C } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/context/ProfileContext';
import { POWERUP_CATALOG, uuid } from '../../src/game/rules';
import { loadPowerupInventory, purchasePowerup } from '../../src/lib/powerups';
import { equipShield, loadShieldInventory, purchaseShield, SHIELD_CATALOG } from '../../src/lib/shields';

export default function Shop() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const [section, setSection] = useState(params.section === 'shield' ? 'shield' : 'boost');
  const [boostInventory, setBoostInventory] = useState({});
  const [shieldInventory, setShieldInventory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [popup, setPopup] = useState('');
  const actionBusy = useRef(false);
  const pendingPurchaseIds = useRef({});
  const balance = Math.max(0, Number(profile?.points) || 0);

  const refresh = useCallback(async () => {
    if (!user?.id) { setBoostInventory({}); setShieldInventory([]); return; }
    try {
      await refreshProfile();
      const [boosts, shields] = await Promise.all([loadPowerupInventory(user.id), loadShieldInventory(user.id)]);
      setBoostInventory(boosts);
      setShieldInventory(shields);
      setLoadError('');
    } catch (error) {
      setLoadError(error?.message || 'Could not load your shop inventory. Please try again.');
    }
  }, [refreshProfile, user]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function buyWithPoints(item, kind) {
    if (actionBusy.current || !user?.id || balance < item.price) return;
    actionBusy.current = true; setBusy(true); setNotice('');
    try {
      if (kind === 'boost') {
        const key = `${kind}:${item.type}`;
        const requestId = pendingPurchaseIds.current[key] || (pendingPurchaseIds.current[key] = uuid());
        await purchasePowerup(item.type, requestId);
        delete pendingPurchaseIds.current[key];
        setNotice(`${item.name} added to your inventory.`);
      } else {
        await purchaseShield(item.type, uuid());
        setNotice(`${item.name} purchased. Equip it before your next game.`);
      }
      await refresh();
    } catch (error) {
      setPopup(error?.message || 'Please check your points and try again.');
    } finally { actionBusy.current = false; setBusy(false); }
  }

  async function equip(item) {
    if (actionBusy.current) return;
    actionBusy.current = true; setBusy(true); setNotice('');
    try {
      await equipShield(item?.id || null);
      setNotice(item ? `${item.name} equipped.` : 'Shield unequipped.');
      await refresh();
    } catch (error) {
      setPopup(error?.message || 'Please try again.');
    } finally { actionBusy.current = false; setBusy(false); }
  }

  function moneyComingSoon(item) {
    setPopup(`Money purchases for ${item.name} are not available yet. You can use points now.`);
  }

  function purchaseButtons(item, kind) {
    const missing = Math.max(0, item.price - balance);
    return <View style={{ flexDirection: 'row', gap: 9 }}>
      <View style={{ flex: 1 }}><Button title={busy ? 'Please wait…' : `Use points · ${item.price.toLocaleString()}`} onPress={() => buyWithPoints(item, kind)} disabled={busy || !user?.id || missing > 0} /></View>
      <View style={{ flex: 1 }}><Button title="Use money" secondary onPress={() => moneyComingSoon(item)} disabled={busy} /></View>
    </View>;
  }

  const ShieldCard = ({ shield }) => {
    const owned = shieldInventory.filter(item => item.shield_type === shield.type);
    const active = owned.find(item => item.equipped && item.remaining_hits > 0);
    const available = owned.find(item => !item.equipped && item.remaining_hits > 0);
    const missing = Math.max(0, shield.price - balance);
    return <Card key={shield.type} style={{ borderColor: `${shield.tone}88`, borderWidth: 1.5, padding: 14, borderRadius: 20, gap: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${shield.tone}25`, borderWidth: 1.3, borderColor: shield.tone, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24 }}>{shield.icon}</Text></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={{ color: C.ink, fontSize: 17, fontWeight: '900' }}>{shield.name}</Text><Text style={s.muted}>{shield.description}</Text><Text style={{ color: shield.tone, fontWeight: '900' }}>{shield.hits} {shield.hits === 1 ? 'hit' : 'hits'} · {owned.length} owned</Text></View>
      </View>
      {!!active && <Text style={{ color: C.green, fontWeight: '900' }}>EQUIPPED · {active.remaining_hits}/{active.max_hits} hits left</Text>}
      {!!available && <Text style={{ color: C.muted, fontWeight: '800' }}>Ready to equip · {available.remaining_hits}/{available.max_hits} hits left</Text>}
      {purchaseButtons(shield, 'shield')}
      {missing > 0 && <Text style={s.muted}>You need {missing.toLocaleString()} more points.</Text>}
      {active ? <Button title="Unequip" secondary onPress={() => equip(null)} disabled={busy} /> : available ? <Button title="Equip shield" secondary onPress={() => equip(available)} disabled={busy} /> : owned.length > 0 ? <Text style={s.muted}>Your shields are broken. Buy another to protect the egg.</Text> : null}
    </Card>;
  };

  return <Screen>
    <Modal visible={!!popup} transparent animationType="fade" onRequestClose={() => setPopup('')}>
      <View style={{ flex: 1, backgroundColor: '#39254f88', justifyContent: 'center', alignItems: 'center', padding: 22 }}>
        <View style={{ width: '100%', maxWidth: 420, padding: 22, gap: 14, borderRadius: 28, backgroundColor: C.pale, borderWidth: 2, borderColor: C.line }}>
          <Text style={{ color: C.gold, fontSize: 22, fontWeight: '900' }}>{popup.startsWith('Money purchases') ? 'Coming soon' : 'Shop update'}</Text>
          <Text style={s.muted}>{popup}</Text>
          <Button title="Okay" onPress={() => setPopup('')} />
        </View>
      </View>
    </Modal>
    <Text style={s.title}>Shop</Text>
    <Card style={{ borderColor: C.gold, borderWidth: 1.5 }}>
      <Text style={{ color: C.gold, fontWeight: '900', letterSpacing: 1.2 }}>YOUR GAME WALLET</Text>
      <Text style={{ color: C.ink, fontSize: 30, fontWeight: '900' }}>{balance.toLocaleString()} <Text style={{ color: C.muted, fontSize: 15 }}>points</Text></Text>
      <Text style={s.muted}>Choose how to buy each item. Point purchases work now; money checkout is coming soon.</Text>
      {!user?.id && <Text style={s.muted}>Sign in to save points, boosts and shields.</Text>}
      {!!loadError && <Text accessibilityLiveRegion="polite" style={{ color: '#ffd2d2' }}>{loadError}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={{ color: C.green, fontWeight: '800' }}>{notice}</Text>}
    </Card>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {[['boost', '⚡ Boost Shop'], ['shield', '🛡️ Shield Shop']].map(([key, label]) => <Pressable key={key} onPress={() => setSection(key)} accessibilityRole="tab" accessibilityState={{ selected: section === key }} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1.3, borderColor: section === key ? C.gold : C.line, backgroundColor: section === key ? C.gold : '#f5eafa' }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '900' }}>{label}</Text></Pressable>)}
    </ScrollView>
    {section === 'boost' ? <>
      <Card><Text style={{ color: C.gold, fontWeight: '900', letterSpacing: 1.2 }}>⚡ CHANGE THE ROUND</Text><Title small>Boost Shop</Title><Text style={s.muted}>Choose an attack, defence or clever dice move. Purchases are saved to your account.</Text></Card>
      {POWERUP_CATALOG.map(item => {
        const missing = Math.max(0, item.price - balance);
        return <Card key={item.type} style={{ borderColor: C.line, borderWidth: 1.3, padding: 14, borderRadius: 20, gap: 9 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#eadcf8', borderWidth: 1.3, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24 }}>{item.icon}</Text></View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: C.ink, fontSize: 16, fontWeight: '900' }}>{item.name}</Text><Text style={s.muted}>{item.description}</Text><Text style={{ color: C.ink, fontWeight: '900' }}>Owned · {boostInventory[item.type] || 0}</Text></View></View>
          {purchaseButtons(item, 'boost')}{missing > 0 && <Text style={s.muted}>You need {missing.toLocaleString()} more points.</Text>}
        </Card>;
      })}
    </> : <>
      <Card><Text style={{ color: C.gold, fontWeight: '900', letterSpacing: 1.2 }}>🛡️ PROTECT YOUR EGG</Text><Title small>Shield Shop</Title><Text style={s.muted}>Each shield blocks a fall-causing hit. Equip a shield before your next game.</Text></Card>
      {SHIELD_CATALOG.map(shield => <ShieldCard key={shield.type} shield={shield} />)}
    </>}
  </Screen>;
}
