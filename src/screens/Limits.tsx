import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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
import { Config, monitoredApps, Snapshot } from '../types';
import { bridge } from '../native';
export function Toggle({
  title,
  subtitle,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Row style={{ paddingVertical: 14 }}>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {subtitle && (
          <Text style={[text.body, { fontSize: 12, marginTop: 4 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: '#DDD8CB', true: C.ink }}
        thumbColor={value ? C.pink : C.white}
      />
    </Row>
  );
}
function NumberSetting({
  label,
  initial,
  min = 1,
  max = 5000,
  save,
}: {
  label: string;
  initial: number;
  min?: number;
  max?: number;
  save: (n: number) => void;
}) {
  const [value, setValue] = useState(String(initial));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setValue(String(initial)), [initial]);
  return (
    <View style={{ marginVertical: 10 }}>
      <Text style={[text.body, { fontSize: 13, marginBottom: 7 }]}>
        {label}
      </Text>
      <Row>
        <TextInput
          accessibilityLabel={label}
          style={[s.input, { flex: 1 }]}
          keyboardType="number-pad"
          value={value}
          onChangeText={setValue}
          maxLength={5}
        />
        <Button
          label="Save"
          variant="light"
          onPress={() => {
            const n = Number(value);
            if (value.trim() && Number.isInteger(n) && n >= min && n <= max) {
              setInvalid(false);
              save(n);
            } else {
              setInvalid(true);
            }
          }}
        />
      </Row>
      {invalid && (
        <Text
          accessibilityRole="alert"
          style={{ color: '#994A3F', marginTop: 5, fontSize: 12 }}
        >
          Choose a whole number from {min} to {max}.
        </Text>
      )}
    </View>
  );
}
export function Limits({
  data,
  update,
  onChallenge,
}: {
  data: Snapshot;
  update: (v: Partial<Config>) => void;
  onChallenge: () => void;
}) {
  const c = data.config;
  return (
    <>
      <Text style={text.label}>MAKE ROOM FOR REAL LIFE</Text>
      <Text style={[text.title, { marginTop: 8 }]}>
        Your rules.{'\n'}Your fresh start.
      </Text>
      <Card style={{ marginTop: 24, backgroundColor: C.pink }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={text.h2}>A limit, not a lecture.</Text>
            <Text style={[text.body, { marginTop: 8, color: '#704F4B' }]}>
              When you hit your reel budget, your buddy steps in with a break.
            </Text>
          </View>
          <Brain size={78} />
        </Row>
        <Toggle
          title="Block at my limit"
          value={c.blockEnabled}
          onChange={v => update({ blockEnabled: v })}
        />
        <NumberSetting
          label="Total daily reel budget"
          initial={c.dailyLimit}
          save={v => update({ dailyLimit: v })}
        />
      </Card>
      <Section title="Pick your scroll spaces" />
      <Card>
        {monitoredApps.map(a => (
          <View key={a.app}>
            <Toggle
              title={a.name}
              subtitle={a.surface}
              value={c.monitoredApps.includes(a.app)}
              onChange={v =>
                update({
                  monitoredApps: v
                    ? [...c.monitoredApps, a.app]
                    : c.monitoredApps.filter(p => p !== a.app),
                })
              }
            />
            {c.monitoredApps.includes(a.app) && (
              <NumberSetting
                label={`${a.name} limit · 0 uses daily budget`}
                initial={c.limits[a.app] || 0}
                min={0}
                save={n => update({ limits: { ...c.limits, [a.app]: n } })}
              />
            )}
          </View>
        ))}
      </Card>
      <Section title="Earn a little more" />
      <Card style={{ backgroundColor: C.green }}>
        <Text style={text.body}>
          Finish a challenge to earn a temporary allowance. Walking, jumping,
          phone jail, thumb detox, intentional swipes, or an NFC card.
        </Text>
        <NumberSetting
          label="Reels earned per challenge"
          initial={c.unlockReels}
          max={100}
          save={n => update({ unlockReels: n })}
        />
        <NumberSetting
          label="Allowance expires after · minutes"
          initial={c.cooldownMinutes}
          max={120}
          save={n => update({ cooldownMinutes: n })}
        />
        <Text style={[text.body, { fontSize: 12, marginBottom: 16 }]}>
          Jump detection uses motion peaks and may mistake shaking for jumps.
          NFC reads a card tap; it does not verify identity.
        </Text>
        <Button label="Try a challenge" icon="arrow" onPress={onChallenge} />
      </Card>
      <Section title="Keep it gentle" />
      <Card>
        <Toggle
          title="Floating brain counter"
          subtitle="A small live counter above your short videos."
          value={c.bubble}
          onChange={v => update({ bubble: v })}
        />
        <Text style={[text.body, { fontSize: 12 }]}>
          Android's accessibility overlay keeps the counter and limit screen
          visible. You can always turn monitoring off in Settings.
        </Text>
      </Card>
    </>
  );
}
export function PermissionsScreen({
  data,
  run,
}: {
  data: Snapshot;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const p = data.permissions;
  const permissions = [
    {
      key: 'accessibility',
      title: 'Recognize reels',
      state: p.accessibility,
      required: true,
      body: 'Settings → Accessibility → Installed apps → BrainPal → On. Reads app layouts for the counter and shows your limit overlay.',
    },
    {
      key: 'usage',
      title: 'App usage access',
      state: p.usage,
      required: false,
      body: 'Choose BrainPal → Allow usage access. Adds app-time diagnostics if accessibility is interrupted; app time is never converted into reel counts.',
    },
    {
      key: 'notifications',
      title: 'Notifications',
      state: p.notifications,
      required: false,
      body: 'Optional. You can leave this off.',
    },
    {
      key: 'battery',
      title: 'Battery freedom',
      state: p.battery,
      required: false,
      body: 'Optional. In Android battery settings, allow unrestricted activity if monitoring stops in the background.',
    },
  ];
  return (
    <>
      <Text style={text.body}>
        Access is checked live when you return from Settings. Only Accessibility
        is required for reels detection.
      </Text>
      {permissions.map((permission, i) => (
        <Card key={permission.key} style={{ marginTop: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Chip
              label={`0${i + 1} · ${
                permission.required ? 'REQUIRED' : 'OPTIONAL'
              }`}
              color={C.cream}
            />
            <Chip
              label={permission.state ? 'GRANTED' : 'MISSING'}
              color={permission.state ? C.green : '#EDE8DC'}
            />
          </Row>
          <Text style={[text.h2, { marginTop: 16 }]}>{permission.title}</Text>
          <Text style={[text.body, { fontSize: 13, marginVertical: 12 }]}>
            {permission.body}
          </Text>
          <Button
            label={permission.state ? 'Review access' : 'Open Android Settings'}
            variant="light"
            icon="arrow"
            onPress={() => run(() => bridge.permission(permission.key))}
          />
        </Card>
      ))}
      <Card style={{ marginTop: 16, backgroundColor: C.cream }}>
        <Text style={text.h2}>Switch greyed out?</Text>
        <Text
          style={[
            text.body,
            { color: '#625B4B', fontSize: 13, marginVertical: 12 },
          ]}
        >
          For an APK installed outside the Play Store, Android may restrict
          Accessibility. Open App info → menu ⋮ → Allow restricted settings,
          then return to Accessibility. Samsung may also show an Auto Blocker
          prompt. Available options depend on Android and your device.
        </Text>
        <Button
          label="Open BrainPal App info"
          variant="light"
          onPress={() => run(() => bridge.permission('app'))}
        />
      </Card>
      {p.accessibility && !p.connected && (
        <Text style={[text.body, { marginVertical: 16 }]}>
          Accessibility is enabled, but the service hasn't connected. Reopen
          BrainPal or toggle the service off and on.
        </Text>
      )}
      <View style={{ marginTop: 22 }}>
        <Button
          label={
            data.config.enabled
              ? 'Monitoring is on · pause'
              : 'Turn on monitoring'
          }
          disabled={!p.accessibility || !data.config.consent}
          onPress={() =>
            run(() => bridge.update({ enabled: !data.config.enabled }))
          }
        />
      </View>
    </>
  );
}
export const s = StyleSheet.create({
  title: { fontSize: 14, fontWeight: '700', color: C.ink },
  input: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    color: C.ink,
    fontSize: 16,
  },
  field: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    color: C.ink,
    fontSize: 14,
    marginVertical: 8,
  },
});
