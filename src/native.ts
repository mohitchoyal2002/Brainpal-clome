import { NativeModules, Platform, Share } from 'react-native';
import { Config, emptySnapshot, Snapshot } from './types';
const native = Platform.OS === 'android' ? NativeModules.BrainPal : null;
export const isAndroid = Boolean(native);
export const bridge = {
  async snapshot(): Promise<Snapshot> {
    return native ? JSON.parse(await native.getSnapshot()) : emptySnapshot;
  },
  async update(values: Partial<Config>) {
    if (!native) {
      throw new Error('Monitoring requires the Android app.');
    }
    await native.updateConfig(JSON.stringify(values));
  },
  async permission(kind: string) {
    if (native) {
      await native.openPermission(kind);
    } else {
      throw new Error('Open the installed Android app to grant access.');
    }
  },
  async challenge() {
    if (native) {
      await native.startChallenge();
    } else {
      throw new Error('Physical challenges run in the Android app.');
    }
  },
  async connect(url: string, name: string) {
    if (!native) {
      throw new Error('Connect from the installed Android app.');
    }
    return JSON.parse(await native.connectBackend(url, name));
  },
  async remote(op: string, payload: object = {}) {
    if (!native) {
      throw new Error('Connect your backend in the Android app.');
    }
    return JSON.parse(await native.remote(op, JSON.stringify(payload)));
  },
  async usage(): Promise<Record<string, number>> {
    return native ? JSON.parse(await native.usage()) : {};
  },
  async clear() {
    if (native) {
      await native.clearData();
    }
  },
  async shareReceipt(weekly = false) {
    if (native) {
      await native.shareReceipt(weekly);
    } else {
      await Share.share({ message: 'BrainPal · Your scroll receipt' });
    }
  },
};
