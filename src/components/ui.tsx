import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  Vibration,
  Platform,
} from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
export const C = {
  bg: '#FFF9EE',
  cream: '#FDE7B3',
  pink: '#F29F99',
  gold: '#FFD642',
  ink: '#20211F',
  muted: '#72736C',
  border: '#E7E0D0',
  white: '#FFFEF9',
  green: '#DCE9D9',
  violet: '#E1DDEE',
};
export const text = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -1.3, color: C.ink },
  body: { fontSize: 15, lineHeight: 22, color: C.muted },
  label: { fontSize: 11, letterSpacing: 1.6, fontWeight: '800', color: C.ink },
  h2: { fontSize: 21, letterSpacing: -0.6, fontWeight: '800', color: C.ink },
});
export function haptic() {
  if (Platform.OS === 'android') {
    Vibration.vibrate(8);
  }
}
export function Brain({
  size = 100,
  sleepy = false,
}: {
  size?: number;
  sleepy?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      accessibilityLabel="BrainPal brain buddy"
    >
      <G
        stroke={C.ink}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path
          d="M59 21C46 8 32 16 30 28C13 28 9 46 18 56C7 70 18 88 32 88C36 103 51 103 60 94C71 106 88 98 88 86C108 85 113 65 101 55C108 39 98 27 86 28C83 13 68 11 59 21Z"
          fill={C.pink}
        />
        <Path
          d="M59 22L60 41M60 77L60 94M30 29C30 41 42 44 43 36M20 56C28 57 33 51 32 47M31 87C31 76 41 77 43 84M85 29C88 42 75 43 74 36M100 55C91 57 85 51 88 46M89 86C87 77 77 77 75 85"
          fill="none"
        />
        {sleepy ? (
          <Path d="M35 59Q43 66 51 59M69 59Q77 66 85 59" fill="none" />
        ) : (
          <>
            <Circle cx="43" cy="59" r="13" fill={C.cream} />
            <Circle cx="78" cy="59" r="13" fill={C.cream} />
            <Path
              d="M41 65C30 58 45 47 49 56C53 64 39 64 40 57C42 53 46 57 44 59M76 65C65 58 80 47 84 56C88 64 74 64 75 57C77 53 81 57 79 59"
              fill="none"
              strokeWidth="2"
            />
          </>
        )}
        <Path d="M55 77Q60 83 66 77" fill="none" />
      </G>
      <Circle cx="27" cy="68" r="4" fill="#E98B84" />
      <Circle cx="94" cy="68" r="4" fill="#E98B84" />
    </Svg>
  );
}
export function Icon({
  name,
  color = C.ink,
  size = 21,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    home: 'M3 11L12 3L21 11M5 10V21H19V10M10 21V15H14V21',
    stats: 'M5 20V12M12 20V4M19 20V8',
    lock: 'M6 10H18V21H6ZM8 10V7A4 4 0 0 1 16 7V10M12 14V17',
    battle:
      'M4 3L20 19M20 3L4 19M3 15L8 20M16 20L21 15M3 3H8M3 3V8M21 3H16M21 3V8',
    settings: 'M4 7H20M4 17H20M8 4V10M16 14V20',
    arrow: 'M5 12H19M13 6L19 12L13 18',
    check: 'M5 12L10 17L19 7',
    share: 'M12 15V3M7 8L12 3L17 8M5 13V21H19V13',
    spark: 'M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5Z',
    receipt: 'M6 3H18V21L15 19L12 21L9 19L6 21ZM9 8H15M9 12H15',
    pause: 'M8 5V19M16 5V19',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[name] || paths.spark}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Button({
  label,
  onPress,
  variant = 'dark',
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'dark' | 'light' | 'pink';
  icon?: string;
  disabled?: boolean;
}) {
  const dark = variant === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: dark ? C.ink : variant === 'pink' ? C.pink : C.white,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[s.buttonText, { color: dark ? C.white : C.ink }]}>
        {label}
      </Text>
      {icon && <Icon name={icon} color={dark ? C.white : C.ink} size={18} />}
    </Pressable>
  );
}
export function Chip({
  label,
  color = C.green,
}: {
  label: string;
  color?: string;
}) {
  return (
    <View style={[s.chip, { backgroundColor: color }]}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.ink }}>
        {label}
      </Text>
    </View>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Section({
  title,
  aside,
}: {
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <Row
      style={{
        justifyContent: 'space-between',
        marginTop: 28,
        marginBottom: 14,
      }}
    >
      <Text style={text.h2}>{title}</Text>
      {aside}
    </Row>
  );
}
export function Reveal({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let disposed = false;
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    });
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (disposed) {
          return;
        }
        if (reduced) {
          opacity.setValue(1);
        } else {
          animation.start();
        }
      })
      .catch(() => {
        if (!disposed) {
          opacity.setValue(1);
        }
      });
    return () => {
      disposed = true;
      animation.stop();
    };
  }, [opacity]);
  return (
    <Animated.View
      style={{
        opacity,
        transform: [
          {
            translateY: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: {
    borderRadius: 17,
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: { fontSize: 14, fontWeight: '700' },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
});
