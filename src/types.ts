export type Split = {
  app: string;
  name: string;
  count: number;
  millis: number;
};
export type Config = {
  enabled: boolean;
  consent: boolean;
  onboarded: boolean;
  blockEnabled: boolean;
  dailyLimit: number;
  unlockReels: number;
  cooldownMinutes: number;
  bubble: boolean;
  aiEnabled: boolean;
  aiConsentVersion: number;
  monitoredApps: string[];
  limits: Record<string, number>;
};
export type Permissions = {
  accessibility: boolean;
  connected: boolean;
  usage: boolean;
  overlay: boolean;
  notifications: boolean;
  battery: boolean;
  android: string;
  manufacturer: string;
};
export type Snapshot = {
  day: string;
  count: number;
  splits: Split[];
  hours: number[];
  week: { date: string; count: number }[];
  sessions: {
    id: string;
    app: string;
    start: number;
    end: number;
    count: number;
  }[];
  config: Config;
  permissions: Permissions;
  backendConnected: boolean;
  backendUrl: string;
  lastAi: string;
  allowanceExpiry: number;
};
export const monitoredApps = [
  {
    app: 'com.instagram.android',
    name: 'Instagram',
    short: 'IG',
    color: '#F29F99',
    surface: 'Reels',
  },
  {
    app: 'com.google.android.youtube',
    name: 'YouTube',
    short: 'YT',
    color: '#EFCCC1',
    surface: 'Shorts',
  },
  {
    app: 'com.zhiliaoapp.musically',
    name: 'TikTok',
    short: 'TK',
    color: '#D9D3ED',
    surface: 'For You',
  },
  {
    app: 'com.ss.android.ugc.trill',
    name: 'TikTok Lite',
    short: 'TL',
    color: '#D9D3ED',
    surface: 'For You',
  },
  {
    app: 'com.snapchat.android',
    name: 'Snapchat',
    short: 'SC',
    color: '#F6DF83',
    surface: 'Spotlight',
  },
  {
    app: 'com.facebook.katana',
    name: 'Facebook',
    short: 'FB',
    color: '#CADBCB',
    surface: 'Reels',
  },
];
const day = new Date().toLocaleDateString('en-CA');
export const emptySnapshot: Snapshot = {
  day,
  count: 0,
  splits: monitoredApps.map(a => ({ ...a, count: 0, millis: 0 })),
  hours: Array(24).fill(0),
  week: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return { date: d.toLocaleDateString('en-CA'), count: 0 };
  }),
  sessions: [],
  config: {
    enabled: false,
    consent: false,
    onboarded: false,
    blockEnabled: true,
    dailyLimit: 100,
    unlockReels: 10,
    cooldownMinutes: 15,
    bubble: true,
    aiEnabled: false,
    aiConsentVersion: 0,
    monitoredApps: monitoredApps.map(a => a.app),
    limits: {},
  },
  permissions: {
    accessibility: false,
    connected: false,
    usage: false,
    overlay: false,
    notifications: false,
    battery: false,
    android: '',
    manufacturer: '',
  },
  backendConnected: false,
  backendUrl: '',
  lastAi: 'AI is off. Local detection is ready.',
  allowanceExpiry: 0,
};
