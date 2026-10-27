import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Brain,
  Button,
  C,
  Card,
  Chip,
  haptic,
  Icon,
  Reveal,
  Row,
  text,
} from './src/components/ui';
import { bridge, isAndroid } from './src/native';
import { Config, emptySnapshot, Snapshot } from './src/types';
import { Today, Insights, Receipt } from './src/screens/Today';
import { Limits, PermissionsScreen } from './src/screens/Limits';
import { Battle, SettingsScreen } from './src/screens/Settings';
type Tab = 'today' | 'insights' | 'limits' | 'battle' | 'settings';
const tabs: { key: Tab; title: string; icon: string }[] = [
  { key: 'today', title: 'Today', icon: 'home' },
  { key: 'insights', title: 'Insights', icon: 'stats' },
  { key: 'limits', title: 'Limits', icon: 'lock' },
  { key: 'battle', title: 'Battle', icon: 'battle' },
  { key: 'settings', title: 'You', icon: 'settings' },
];
function AppContent() {
  const [tab, setTab] = useState<Tab>('today');
  const [data, setData] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [consent, setConsent] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setData(await bridge.snapshot());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    let visible = true;
    const timer = setInterval(() => {
      if (visible) {
        refresh();
      }
    }, 2500);
    const sub = AppState.addEventListener('change', state => {
      visible = state === 'active';
      if (state === 'active') {
        refresh();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [refresh],
  );
  const update = (values: Partial<Config>) => run(() => bridge.update(values));
  const active = data.permissions.connected && data.config.enabled;
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={s.top}>
        <Row style={{ gap: 6 }}>
          <Brain size={34} />
          <Text style={s.brand}>
            brainpal<Text style={{ color: C.pink }}>.</Text>
          </Text>
        </Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open permission status"
          onPress={() => setSetup(true)}
        >
          <Chip
            label={active ? '●  LOOKING OUT FOR YOU' : '○  MONITORING PAUSED'}
            color={active ? C.green : '#EDE8DC'}
          />
        </Pressable>
      </View>
      {!isAndroid && (
        <Text style={s.preview}>
          Design preview · monitoring runs in the Android app
        </Text>
      )}
      <ScrollView
        contentContainerStyle={s.content}
        key={tab}
        showsVerticalScrollIndicator={false}
      >
        <Reveal>
          {tab === 'today' && (
            <Today
              data={data}
              onReceipt={() => setReceipt(true)}
              onSetup={() => setSetup(true)}
              onLimits={() => setTab('limits')}
              onChallenge={() => run(bridge.challenge)}
            />
          )}
          {tab === 'insights' && (
            <Insights
              data={data}
              onShare={() => run(() => bridge.shareReceipt(true))}
            />
          )}
          {tab === 'limits' && (
            <Limits
              data={data}
              update={update}
              onChallenge={() => run(bridge.challenge)}
            />
          )}
          {tab === 'battle' && (
            <Battle
              data={data}
              run={run}
              onSettings={() => setTab('settings')}
            />
          )}
          {tab === 'settings' && (
            <SettingsScreen
              data={data}
              update={update}
              run={run}
              onPermissions={() => setSetup(true)}
            />
          )}
        </Reveal>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={s.navWrap}>
        <View style={s.nav}>
          {tabs.map(t => (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
              accessibilityLabel={t.title}
              onPress={() => {
                haptic();
                setTab(t.key);
              }}
              style={[s.navItem, tab === t.key && s.navSelected]}
            >
              <Icon name={t.icon} />
              <Text
                style={[s.navLabel, tab === t.key && { fontWeight: '800' }]}
              >
                {t.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
      <Modal
        visible={setup}
        animationType="slide"
        onRequestClose={() => setSetup(false)}
      >
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={text.title}>A little setup.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSetup(false)}
                style={{ padding: 12 }}
              >
                <Text style={{ fontSize: 18, color: C.ink }}>Done</Text>
              </Pressable>
            </Row>
            <PermissionsScreen data={data} run={run} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={receipt}
        animationType="slide"
        transparent
        onRequestClose={() => setReceipt(false)}
      >
        <View style={s.scrim}>
          <View style={s.sheet}>
            <ScrollView>
              <Receipt data={data} />
              <Button
                label="Share my bill"
                icon="share"
                onPress={() => run(() => bridge.shareReceipt())}
              />
              <View style={{ height: 10 }} />
              <Button
                label="Back to today"
                variant="light"
                onPress={() => setReceipt(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!loading && !data.config.onboarded && !previewDismissed}
        animationType="fade"
        transparent
        onRequestClose={() => {}}
      >
        <View style={s.scrim}>
          <View style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Chip label="MEET YOUR SCROLL BUDDY" color={C.cream} />
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <Brain size={150} />
              </View>
              <Text style={[text.title, { fontSize: 38, textAlign: 'center' }]}>
                Less scrolling.{'\n'}More living.
              </Text>
              <Text
                style={[text.body, { textAlign: 'center', marginVertical: 18 }]}
              >
                Count your reels, set a kind boundary, and earn a fresh start
                with a real-world challenge.
              </Text>
              <Card style={{ backgroundColor: C.bg, padding: 16 }}>
                <Text style={[text.body, { fontSize: 13, color: C.ink }]}>
                  BrainPal uses Android Accessibility to read the visible layout
                  of apps you select, recognize video surfaces, and count scroll
                  changes. Counts stay on this phone. You can turn it off at any
                  time.
                </Text>
                <Text style={[text.body, { fontSize: 13, marginTop: 10 }]}>
                  Optional Gemini AI is off by default. Enabling it sends
                  resource IDs, fixed interface labels, and scroll measurements
                  to your backend and Google Gemini. Screenshots, message text,
                  and passwords are excluded.
                </Text>
              </Card>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                onPress={() => setConsent(!consent)}
                style={s.consent}
              >
                <View style={[s.check, consent && { backgroundColor: C.ink }]}>
                  {consent && <Icon name="check" size={16} color={C.white} />}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    lineHeight: 19,
                    color: C.ink,
                  }}
                >
                  I understand and agree to enable app-layout access for reels
                  monitoring.
                </Text>
              </Pressable>
              <Button
                label={isAndroid ? 'Meet my brain buddy' : 'Explore the design'}
                disabled={isAndroid && !consent}
                icon="arrow"
                onPress={() => {
                  if (isAndroid) {
                    run(async () => {
                      await bridge.update({ consent: true, onboarded: true });
                      setSetup(true);
                    });
                  } else {
                    setPreviewDismissed(true);
                  }
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(error)}
        transparent
        animationType="fade"
        onRequestClose={() => setError('')}
      >
        <View style={s.scrim}>
          <Card style={{ width: '100%', maxWidth: 420 }}>
            <Text style={text.h2}>A quick heads-up</Text>
            <Text style={[text.body, { marginVertical: 18 }]}>{error}</Text>
            <Button label="Got it" onPress={() => setError('')} />
          </Card>
        </View>
      </Modal>
      {loading && (
        <View style={s.loading}>
          <ActivityIndicator color={C.ink} />
        </View>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  top: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  brand: { fontSize: 25, fontWeight: '900', letterSpacing: -1.3, color: C.ink },
  preview: {
    paddingHorizontal: 24,
    paddingBottom: 10,
    color: C.muted,
    fontSize: 12,
  },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24 },
  navWrap: { backgroundColor: C.bg },
  nav: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 7,
    flexDirection: 'row',
    backgroundColor: C.ink,
    borderRadius: 25,
  },
  navItem: {
    flex: 1,
    minHeight: 60,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.bg,
    margin: 2,
  },
  navSelected: { backgroundColor: C.pink },
  navLabel: { fontSize: 10, color: C.ink },
  scrim: {
    flex: 1,
    backgroundColor: '#20211F80',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '94%',
    padding: 24,
    borderRadius: 30,
    backgroundColor: C.bg,
  },
  modalContent: { padding: 24, paddingBottom: 50 },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
});
