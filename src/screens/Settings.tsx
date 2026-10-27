import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Brain,
  Button,
  C,
  Card,
  Chip,
  Row,
  Section,
  text,
} from '../components/ui';
import { bridge } from '../native';
import { Config, Snapshot } from '../types';
import { s, Toggle } from './Limits';
type Run = (action: () => Promise<unknown>) => Promise<void>;
type Friend = {
  id: string;
  name: string;
  count: number | null;
  syncedAt: number | null;
  day: string | null;
};
export function Battle({
  data,
  run,
  onSettings,
}: {
  data: Snapshot;
  run: Run;
  onSettings: () => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const refresh = async () => {
    if (!data.backendConnected) {
      return;
    }
    setLoading(true);
    try {
      await bridge.remote('sync');
      const result = await bridge.remote('friends');
      setFriends(result.friends);
      setStatus('Updated just now');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (data.backendConnected) {
      run(refresh);
    }
  }, [data.backendConnected]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Text style={text.label}>LESS SCROLLING, TOGETHER</Text>
      <Text style={[text.title, { marginTop: 8 }]}>Scroll Battle.</Text>
      <Card
        style={{
          backgroundColor: C.cream,
          marginTop: 24,
          alignItems: 'center',
        }}
      >
        <Brain size={124} />
        <Text style={[text.h2, { textAlign: 'center', marginTop: 10 }]}>
          Let's see who scrolls less.
        </Text>
        <Text style={[text.body, { textAlign: 'center', marginVertical: 14 }]}>
          An accountability buddy makes a little less scrolling feel a little
          more fun.
        </Text>
        <Chip label="LOWEST REEL COUNT WINS" color={C.white} />
      </Card>
      {!data.backendConnected ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={text.h2}>Connect your circle</Text>
          <Text style={[text.body, { marginVertical: 14 }]}>
            Connect your own backend in Settings to create invites and compare
            real daily counts with friends.
          </Text>
          <Button label="Connect backend" icon="arrow" onPress={onSettings} />
        </Card>
      ) : (
        <>
          <Section
            title="Your daily standings"
            aside={
              loading ? (
                <ActivityIndicator color={C.ink} />
              ) : (
                <Chip label="TODAY" />
              )
            }
          />
          <Card>
            <Row
              style={{ justifyContent: 'space-between', paddingVertical: 10 }}
            >
              <Text style={s.title}>You</Text>
              <Text style={text.h2}>{data.count}</Text>
            </Row>
            {[...friends]
              .sort((a, b) => (a.count ?? Infinity) - (b.count ?? Infinity))
              .map((f, i) => (
                <Row
                  key={f.id}
                  style={{
                    paddingVertical: 16,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                  }}
                >
                  <Chip
                    label={String(i + 1).padStart(2, '0')}
                    color={C.violet}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{f.name}</Text>
                    <Text style={[text.body, { fontSize: 11 }]}>
                      {f.syncedAt
                        ? `Updated ${new Date(f.syncedAt).toLocaleTimeString()}`
                        : 'No stats shared yet'}
                    </Text>
                  </View>
                  <Text style={text.h2}>{f.count ?? '—'}</Text>
                </Row>
              ))}
            {friends.length === 0 && (
              <Text style={[text.body, { paddingVertical: 14 }]}>
                Your first friend goes here. Share an invite to begin.
              </Text>
            )}
            <Text style={[text.body, { fontSize: 11, marginBottom: 12 }]}>
              {status} · counts are self-reported by each device.
            </Text>
            <Button
              label="Refresh standings"
              variant="light"
              onPress={() => run(refresh)}
            />
          </Card>
          <Section title="Bring a buddy" />
          <Card>
            <Button
              label="Create and share an invite"
              variant="pink"
              icon="share"
              onPress={() =>
                run(async () => {
                  const invite = await bridge.remote('invite');
                  await Share.share({
                    message: `Let's see who scrolls less! Join my BrainPal Scroll Battle. Code: ${invite.code}`,
                  });
                })
              }
            />
            <TextInput
              accessibilityLabel="Friend invite code"
              placeholder="Friend's 8-character invite code"
              placeholderTextColor={C.muted}
              autoCapitalize="characters"
              maxLength={8}
              style={[s.field, { marginTop: 20 }]}
              value={code}
              onChangeText={setCode}
            />
            <Button
              label="Accept invite"
              disabled={code.trim().length !== 8}
              variant="light"
              onPress={() =>
                run(async () => {
                  await bridge.remote('accept', {
                    code: code.trim().toUpperCase(),
                  });
                  setCode('');
                  await refresh();
                })
              }
            />
          </Card>
        </>
      )}
    </>
  );
}
export function SettingsScreen({
  data,
  update,
  run,
  onPermissions,
}: {
  data: Snapshot;
  update: (values: Partial<Config>) => void;
  run: Run;
  onPermissions: () => void;
}) {
  const [url, setUrl] = useState(data.backendUrl);
  const [name, setName] = useState('Hit');
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState<'clear' | 'delete' | null>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [usage, setUsage] = useState<Record<string, number> | null>(null);
  return (
    <>
      <Text style={text.label}>YOUR BRAIN, YOUR CHOICES</Text>
      <Text style={[text.title, { marginTop: 8 }]}>A little about you.</Text>
      <Card style={{ marginTop: 24 }}>
        <Toggle
          title="Reels monitoring"
          subtitle={
            data.permissions.connected
              ? 'Accessibility service connected'
              : 'Finish permission setup to start'
          }
          value={data.config.enabled}
          disabled={!data.permissions.accessibility || !data.config.consent}
          onChange={v => update({ enabled: v })}
        />
        <Button
          label="Permissions & device setup"
          variant="light"
          icon="arrow"
          onPress={onPermissions}
        />
      </Card>
      <Section title="A smarter second opinion" />
      <Card style={{ backgroundColor: C.violet }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={text.h2}>Gemini, meet BrainPal.</Text>
          <Chip label="OPTIONAL" color={C.white} />
        </Row>
        <Text style={[text.body, { marginTop: 12 }]}>
          Local Android signals count known reels. Gemini helps recognize
          uncertain short-video layouts when apps change. It cannot see missing
          events or guarantee every count.
        </Text>
        <Toggle
          title="Gemini AI assistance"
          subtitle="Uses your private backend and the direct Gemini API."
          disabled={!data.backendConnected}
          value={data.config.aiEnabled}
          onChange={v =>
            v ? setAiConsent(true) : update({ aiEnabled: false })
          }
        />
        <Text style={[text.body, { fontSize: 12 }]}>{data.lastAi}</Text>
      </Card>
      <Section title="Your private connection" />
      <Card>
        <Text style={text.body}>
          Set up the included backend and enter its HTTPS origin. The Gemini API
          key stays on your server.
        </Text>
        <TextInput
          style={s.field}
          accessibilityLabel="Your display name"
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder="Your display name"
          placeholderTextColor={C.muted}
        />
        <TextInput
          style={s.field}
          accessibilityLabel="Backend URL"
          placeholder="https://your-project.vercel.app"
          placeholderTextColor={C.muted}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Button
          label={data.backendConnected ? 'Check connection' : 'Connect backend'}
          disabled={!url.trim()}
          icon="arrow"
          onPress={() =>
            run(async () => {
              await bridge.connect(url, name);
              setStatus('Connected. Your device token is stored securely.');
            })
          }
        />
        {status !== '' && (
          <Text style={[text.body, { fontSize: 12, marginTop: 12 }]}>
            {status}
          </Text>
        )}
        {data.backendConnected && (
          <View style={{ marginTop: 12 }}>
            <Button
              label="Disconnect"
              variant="light"
              onPress={() => run(() => bridge.remote('disconnect'))}
            />
          </View>
        )}
      </Card>
      <Section title="What your phone knows" />
      <Card>
        <Text style={text.body}>
          Usage Access reports time in an entire app. It is shown separately
          from measured reel time and is never used to invent reel counts.
        </Text>
        <View style={{ height: 14 }} />
        <Button
          label="Read today's app usage"
          variant="light"
          onPress={() =>
            run(async () => {
              setUsage(await bridge.usage());
            })
          }
        />
        {usage &&
          data.splits.map(a => (
            <Row
              key={a.app}
              style={{ justifyContent: 'space-between', marginTop: 12 }}
            >
              <Text style={text.body}>{a.name}</Text>
              <Text style={s.title}>
                {Math.floor((usage[a.app] || 0) / 60000)} min
              </Text>
            </Row>
          ))}
      </Card>
      <Section title="Keep your data yours" />
      <Card>
        <Text style={[text.body, { marginBottom: 16 }]}>
          Counts and events stay on your phone. Scroll Battle syncs only daily
          totals and app splits to your backend when you open or refresh Battle.
          No ad tracking is included.
        </Text>
        <Button
          label="Clear counts on this phone"
          variant="light"
          onPress={() => setConfirm('clear')}
        />
        {data.backendConnected && (
          <View style={{ marginTop: 12 }}>
            <Button
              label="Delete my server account & local data"
              variant="light"
              onPress={() => setConfirm('delete')}
            />
          </View>
        )}
      </Card>
      <Text
        style={[
          text.body,
          { textAlign: 'center', fontSize: 11, marginTop: 28 },
        ]}
      >
        BrainPal RN · 1.1.0{`\n`}Built for a little more real life.
      </Text>
      <Modal
        visible={Boolean(confirm)}
        transparent
        onRequestClose={() => setConfirm(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#20211F80',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Card>
            <Text style={text.h2}>
              {confirm === 'delete'
                ? 'Delete your account?'
                : 'Clear your local counts?'}
            </Text>
            <Text style={[text.body, { marginVertical: 18 }]}>
              {confirm === 'delete'
                ? 'This deletes your server profile, invites, friendships, and local history. It cannot be undone.'
                : 'This removes the scroll history stored on this phone. Your server account is kept.'}
            </Text>
            <Button
              label="Delete permanently"
              onPress={() => {
                const action = confirm;
                setConfirm(null);
                run(() =>
                  action === 'delete'
                    ? bridge.remote('delete')
                    : bridge.clear(),
                );
              }}
            />
            <View style={{ height: 10 }} />
            <Button
              label="Keep my data"
              variant="light"
              onPress={() => setConfirm(null)}
            />
          </Card>
        </View>
      </Modal>
      <Modal
        visible={aiConsent}
        transparent
        onRequestClose={() => setAiConsent(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#20211F80',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Card>
            <Text style={text.h2}>Enable Gemini assistance?</Text>
            <Text style={[text.body, { marginVertical: 18 }]}>
              BrainPal will send selected apps' resource IDs, fixed interface
              labels, and numeric scroll measurements to your backend and Google
              Gemini. Screenshots, arbitrary on-screen text, and messages are
              excluded. Requests may use your Gemini free quota. On the free
              tier, Google may use this data to improve its products. You can
              disable this anytime.
            </Text>
            <Button
              label="I agree · enable Gemini"
              onPress={() => {
                setAiConsent(false);
                update({ aiEnabled: true, aiConsentVersion: 2 });
              }}
            />
            <View style={{ height: 10 }} />
            <Button
              label="Keep local detection"
              variant="light"
              onPress={() => setAiConsent(false)}
            />
          </Card>
        </View>
      </Modal>
    </>
  );
}
