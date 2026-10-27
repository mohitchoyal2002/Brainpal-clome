import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Brain,
  Button,
  C,
  Card,
  Chip,
  Icon,
  Row,
  Section,
  text,
} from '../components/ui';
import { monitoredApps, Snapshot } from '../types';
export function Today({
  data,
  onReceipt,
  onSetup,
  onLimits,
  onChallenge,
}: {
  data: Snapshot;
  onReceipt: () => void;
  onSetup: () => void;
  onLimits: () => void;
  onChallenge: () => void;
}) {
  const minutes = Math.floor(
    data.splits.reduce((a, b) => a + b.millis, 0) / 60000,
  );
  const remaining = Math.max(0, data.config.dailyLimit - data.count);
  const active = data.config.enabled && data.permissions.connected;
  return (
    <>
      <Row style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <View>
          <Text style={text.label}>YOUR DAILY REALITY CHECK</Text>
          <Text style={[text.title, { marginTop: 7 }]}>Hey, human.</Text>
        </View>
        <View style={s.date}>
          <Text style={s.dateText}>
            {new Date().toLocaleDateString('en', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </Row>
      <Card style={s.hero}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Chip label="TODAY'S SCROLL COUNT" color="#FFF3D5" />
          <Icon name="spark" />
        </Row>
        <View style={{ alignItems: 'center', marginTop: 13 }}>
          <Brain size={135} sleepy={data.count === 0} />
          <Text adjustsFontSizeToFit numberOfLines={1} style={s.count}>
            {data.count}
          </Text>
          <Text style={s.reels}>reels. yep, we counted.</Text>
        </View>
        <View style={s.heroLine} />
        <Row style={{ justifyContent: 'space-around' }}>
          <View>
            <Text style={s.metric}>
              {minutes}
              <Text style={s.unit}> min</Text>
            </Text>
            <Text style={s.metricLabel}>IN THE SCROLL HOLE</Text>
          </View>
          <View style={s.divider} />
          <View>
            <Text style={s.metric}>
              {remaining}
              <Text style={s.unit}> reels</Text>
            </Text>
            <Text style={s.metricLabel}>UNTIL YOUR BREAK</Text>
          </View>
        </Row>
      </Card>
      {!active && (
        <Pressable
          accessibilityRole="button"
          onPress={onSetup}
          style={s.notice}
        >
          <View style={s.dot} />
          <Text style={{ flex: 1, fontSize: 13, color: C.ink, lineHeight: 19 }}>
            Your buddy is on a break. Finish setup and turn on monitoring to
            start counting.
          </Text>
          <Icon name="arrow" size={18} />
        </Pressable>
      )}
      <Row style={{ marginTop: 16 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onReceipt}
          style={[s.quick, { backgroundColor: C.pink }]}
        >
          <Icon name="receipt" />
          <Text style={s.quickText}>Your reel receipt</Text>
          <Icon name="arrow" size={17} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit limits"
          onPress={onLimits}
          style={[
            s.quick,
            {
              flex: 0,
              width: 60,
              justifyContent: 'center',
              backgroundColor: C.white,
            },
          ]}
        >
          <Icon name="lock" />
        </Pressable>
      </Row>
      <Section
        title="Where the reels went"
        aside={<Text style={text.body}>By app</Text>}
      />
      <Card style={{ paddingVertical: 4 }}>
        {data.splits
          .filter(a => data.config.monitoredApps.includes(a.app))
          .map((a, i, arr) => {
            const meta = monitoredApps.find(m => m.app === a.app)!;
            return (
              <Row
                key={a.app}
                style={[
                  s.appRow,
                  i < arr.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                  },
                ]}
              >
                <View
                  style={[
                    s.appIcon,
                    { backgroundColor: meta?.color || C.cream },
                  ]}
                >
                  <Text style={s.appInitial}>{meta?.short}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.appName}>{a.name}</Text>
                  <Text style={s.appSub}>
                    {meta?.surface} · {Math.floor(a.millis / 60000)} min
                  </Text>
                </View>
                <Text style={s.appCount}>{a.count}</Text>
              </Row>
            );
          })}
        <Text style={[text.body, { fontSize: 11, paddingVertical: 10 }]}>
          Only detected short videos. Regular feeds and app time aren't counted
          as reels.
        </Text>
      </Card>
      <Section title="A boundary, with kindness" />
      <Card style={{ backgroundColor: C.green }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={text.h2}>Real life is loading.</Text>
            <Text style={[text.body, { marginTop: 8, color: '#555F51' }]}>
              A short walk or a quiet minute earns a fresh scroll allowance.
            </Text>
          </View>
          <Brain size={75} sleepy />
        </Row>
        <View style={{ height: 18 }} />
        <Button
          label="Try an unlock challenge"
          variant="light"
          icon="arrow"
          onPress={onChallenge}
        />
      </Card>
    </>
  );
}
export function Insights({
  data,
  onShare,
}: {
  data: Snapshot;
  onShare: () => void;
}) {
  const total = data.week.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...data.week.map(d => d.count));
  const hourly = Math.max(1, ...data.hours);
  return (
    <>
      <Text style={text.label}>THE BIGGER PICTURE</Text>
      <Text style={[text.title, { marginTop: 8 }]}>
        Small shifts.{'\n'}Better weeks.
      </Text>
      <Card style={{ marginTop: 24, backgroundColor: C.violet }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={text.label}>LAST 7 DAYS</Text>
          <Chip label="REELS WRAPPED" color={C.white} />
        </Row>
        <Text style={[s.metric, { fontSize: 60, marginTop: 20 }]}>
          {total}
          <Text style={{ fontSize: 16 }}> reels</Text>
        </Text>
        <View style={s.chart}>
          {data.week.map((d, i) => (
            <View style={s.barColumn} key={d.date}>
              <Text style={s.barValue}>{d.count}</Text>
              <View
                style={[
                  s.bar,
                  {
                    height: Math.max(3, (d.count / max) * 100),
                    backgroundColor: i === 6 ? C.ink : '#B7AEC9',
                  },
                ]}
              />
              <Text style={s.barLabel}>
                {new Date(d.date + 'T12:00:00').toLocaleDateString('en', {
                  weekday: 'narrow',
                })}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[text.body, { fontSize: 12, marginVertical: 16 }]}>
          Your real counts, including days with no recorded reels.
        </Text>
        <Button label="Share my weekly story" icon="share" onPress={onShare} />
      </Card>
      <Section title="Your scroll clock" />
      <Card>
        <Text style={text.body}>Reels by hour · today</Text>
        <View style={[s.chart, { gap: 3, height: 110 }]}>
          {data.hours.map((n, h) => (
            <View
              style={{ flex: 1, justifyContent: 'flex-end', height: 80 }}
              key={h}
              accessibilityLabel={`${h}:00, ${n} reels`}
            >
              <View
                style={{
                  height: Math.max(2, (n / hourly) * 70),
                  backgroundColor: C.pink,
                  borderRadius: 3,
                }}
              />
            </View>
          ))}
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={s.barLabel}>00:00</Text>
          <Text style={s.barLabel}>12:00</Text>
          <Text style={s.barLabel}>23:00</Text>
        </Row>
      </Card>
      <Section title="Recent sessions" />
      {data.sessions.length ? (
        data.sessions.map(session => (
          <Card key={session.id + session.app} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={s.appName}>
                  {monitoredApps.find(a => a.app === session.app)?.name}
                </Text>
                <Text style={text.body}>
                  {new Date(session.start).toLocaleTimeString('en', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={s.appCount}>{session.count} reels</Text>
            </Row>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={text.body}>
            Your first detected session will appear here. No need to scroll just
            to fill a chart.
          </Text>
        </Card>
      )}
    </>
  );
}
export function Receipt({ data }: { data: Snapshot }) {
  return (
    <View style={s.receipt}>
      <Text style={[text.label, { textAlign: 'center', letterSpacing: 4 }]}>
        B R A I N P A L
      </Text>
      <View style={{ alignItems: 'center', paddingVertical: 18 }}>
        <Brain size={70} />
      </View>
      <Text style={[text.h2, { textAlign: 'center' }]}>Your reel receipt</Text>
      <Text style={[text.body, { textAlign: 'center', marginTop: 8 }]}>
        {data.day} · Today's bill
      </Text>
      <View style={s.dashed} />
      {data.splits.map(a => (
        <Row
          key={a.app}
          style={{ justifyContent: 'space-between', marginVertical: 9 }}
        >
          <Text style={s.mono}>{a.name}</Text>
          <Text style={s.mono}>{String(a.count).padStart(3, '0')}</Text>
        </Row>
      ))}
      <View style={s.dashed} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={text.h2}>TOTAL</Text>
        <Text style={text.h2}>{data.count} reels</Text>
      </Row>
      <Text style={[s.mono, { textAlign: 'center', marginTop: 28 }]}>
        NO REFUNDS.
      </Text>
      <Text
        style={[text.body, { textAlign: 'center', fontSize: 12, marginTop: 8 }]}
      >
        Your attention is the real currency.
      </Text>
      <View style={s.barcode}>
        {Array.from({ length: 50 }, (_, i) => (
          <View
            key={i}
            style={{
              width: i % 3 === 0 ? 3 : 1,
              height: 28,
              backgroundColor: C.ink,
            }}
          />
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  date: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    borderRadius: 14,
  },
  dateText: { fontSize: 12, color: C.ink, fontWeight: '700' },
  hero: {
    backgroundColor: C.cream,
    borderColor: '#EDCF94',
    padding: 20,
    overflow: 'hidden',
  },
  count: {
    fontSize: 96,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: -7,
    lineHeight: 108,
  },
  reels: { color: '#625B4B', fontSize: 14, fontWeight: '600' },
  heroLine: { height: 1, backgroundColor: '#D9C69B', marginVertical: 24 },
  metric: { fontSize: 26, fontWeight: '800', letterSpacing: -1, color: C.ink },
  unit: { fontSize: 13, letterSpacing: 0, fontWeight: '500' },
  metricLabel: {
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 5,
    color: '#6E624B',
    fontWeight: '700',
  },
  divider: { width: 1, height: 36, backgroundColor: '#D9C69B' },
  notice: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: { height: 8, width: 8, borderRadius: 4, backgroundColor: C.pink },
  quick: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: C.border,
    borderWidth: 1,
  },
  quickText: { flex: 1, fontSize: 13, fontWeight: '800', color: C.ink },
  appRow: { paddingVertical: 16 },
  appIcon: {
    height: 42,
    width: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInitial: { fontSize: 13, fontWeight: '900', color: C.ink },
  appName: { fontSize: 14, fontWeight: '700', color: C.ink },
  appSub: { fontSize: 11, color: C.muted, marginTop: 4 },
  appCount: { fontSize: 21, fontWeight: '800', color: C.ink },
  chart: {
    height: 150,
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 7, maxWidth: 36, marginBottom: 8 },
  barLabel: { fontSize: 10, color: C.muted },
  barValue: { fontSize: 10, color: C.ink, marginBottom: 7 },
  receipt: {
    padding: 16,
    paddingBottom: 28,
    marginBottom: 20,
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
  },
  mono: { fontFamily: 'monospace', fontSize: 13, color: C.ink },
  dashed: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.ink,
    marginVertical: 22,
  },
  barcode: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    marginTop: 24,
  },
});
