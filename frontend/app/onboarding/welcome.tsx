/**
 * Onboarding 1: Ask Anything - AI assistant branding, light theme.
 * Animated demo card simulates typing + voice input in real-time.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Spacing, Layout } from '@/theme';
import {
  Skip,
  PaginationDots,
  OnboardingCta,
  OnboardingProgressBar,
  PulsatingRings,
} from '@/components/Onboarding';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';

/* Demo phrases — alternates between typing and voice modes */
const DEMOS: { text: string; mode: 'type' | 'voice' }[] = [
  { text: 'Take me home with stops at Starbucks and Walmart', mode: 'type' },
  { text: 'Find the nearest gas station on my route', mode: 'voice' },
  { text: 'Navigate to the airport via a coffee shop', mode: 'type' },
];

const TYPE_MS = 45;
const ERASE_MS = 20;
const WORD_MS = 260;
const HOLD_MS = 2800;
const GAP_MS = 500;

/* ─── Wave Bars (voice listening visualizer) ─── */

function WaveBars({ active }: { active: boolean }) {
  const h1 = useSharedValue(6);
  const h2 = useSharedValue(6);
  const h3 = useSharedValue(6);

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    if (active) {
      h1.value = withRepeat(withSequence(
        withTiming(18, { duration: 300, easing: ease }),
        withTiming(6, { duration: 300, easing: ease }),
      ), -1);
      h2.value = withDelay(100, withRepeat(withSequence(
        withTiming(22, { duration: 350, easing: ease }),
        withTiming(8, { duration: 350, easing: ease }),
      ), -1));
      h3.value = withDelay(200, withRepeat(withSequence(
        withTiming(14, { duration: 280, easing: ease }),
        withTiming(6, { duration: 280, easing: ease }),
      ), -1));
    } else {
      h1.value = withTiming(6, { duration: 200 });
      h2.value = withTiming(6, { duration: 200 });
      h3.value = withTiming(6, { duration: 200 });
    }
  }, [active]);

  const s1 = useAnimatedStyle(() => ({ height: h1.value }));
  const s2 = useAnimatedStyle(() => ({ height: h2.value }));
  const s3 = useAnimatedStyle(() => ({ height: h3.value }));

  return (
    <View style={styles.waveBars}>
      <Animated.View style={[styles.waveBar, s1]} />
      <Animated.View style={[styles.waveBar, s2]} />
      <Animated.View style={[styles.waveBar, s3]} />
    </View>
  );
}

/* ─── Demo Card — typewriter + voice simulation ─── */

function DemoCard() {
  const [text, setText] = useState('');
  const [cursorOn, setCursorOn] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Cursor blink */
  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  /* Mic glow when voice is active */
  const micScale = useSharedValue(1);
  const micAlpha = useSharedValue(0.1);

  useEffect(() => {
    if (voiceActive) {
      micScale.value = withRepeat(withSequence(
        withTiming(1.12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ), -1);
      micAlpha.value = withTiming(0.25, { duration: 300 });
    } else {
      micScale.value = withTiming(1, { duration: 300 });
      micAlpha.value = withTiming(0.1, { duration: 300 });
    }
  }, [voiceActive]);

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
    backgroundColor: `rgba(59, 130, 246, ${micAlpha.value})`,
  }));

  /* Main animation loop using async/await + sleep */
  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timerRef.current = setTimeout(() => { if (!cancelled) resolve(); }, ms);
      });

    const typeChars = async (phrase: string) => {
      for (let i = 1; i <= phrase.length && !cancelled; i++) {
        setText(phrase.substring(0, i));
        await sleep(TYPE_MS + Math.random() * 25);
      }
    };

    const speakWords = async (phrase: string) => {
      const words = phrase.split(' ');
      for (let i = 1; i <= words.length && !cancelled; i++) {
        setText(words.slice(0, i).join(' '));
        await sleep(WORD_MS + Math.random() * 80);
      }
    };

    const erase = async (current: string) => {
      for (let i = current.length - 1; i >= 0 && !cancelled; i--) {
        setText(current.substring(0, i));
        await sleep(ERASE_MS);
      }
      setText('');
    };

    const run = async () => {
      await sleep(1200);
      let idx = 0;
      while (!cancelled) {
        const { text: phrase, mode } = DEMOS[idx];
        const isVoice = mode === 'voice';

        if (isVoice) setVoiceActive(true);
        if (isVoice) {
          await speakWords(phrase);
        } else {
          await typeChars(phrase);
        }
        if (isVoice) setVoiceActive(false);

        await sleep(HOLD_MS);
        await erase(phrase);
        await sleep(GAP_MS);
        idx = (idx + 1) % DEMOS.length;
      }
    };

    run();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.demoCard}>
      <View style={styles.demoRow}>
        <Text style={styles.demoText} numberOfLines={2}>
          {text}
          <Text style={{ opacity: cursorOn ? 1 : 0, color: '#3B82F6', fontWeight: '300' }}>|</Text>
        </Text>
        <View style={styles.micArea}>
          {voiceActive && <WaveBars active />}
          <Animated.View style={[styles.micBtn, micStyle]}>
            <Ionicons
              name={voiceActive ? 'mic' : 'mic-outline'}
              size={22}
              color="#3B82F6"
            />
          </Animated.View>
        </View>
      </View>
      {/* Mode label */}
      <Animated.Text
        key={voiceActive ? 'v' : 't'}
        entering={FadeIn.duration(200)}
        style={styles.modeLabel}
      >
        {voiceActive ? 'Listening...' : 'Type a message'}
      </Animated.Text>
    </Animated.View>
  );
}

/* ─── Screen ─── */

export default function WelcomeScreen() {
  const router = useRouter();

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Skip onPress={handleSkip} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(500)} style={styles.ringsWrap}>
            <PulsatingRings size={140}>
              <View style={styles.chatIconWrap}>
                <Ionicons name="chatbubble-outline" size={56} color="#3B82F6" />
              </View>
            </PulsatingRings>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(400).delay(100)} style={styles.title}>
            Ask Anything.
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(400).delay(160)} style={styles.titleAccent}>
            Get Answers Now.
          </Animated.Text>

          <Animated.Text entering={FadeInDown.duration(400).delay(220)} style={styles.subtitle}>
            Tell us your destination in plain English.{'\n'}No more tapping through menus.
          </Animated.Text>

          <DemoCard />
        </ScrollView>

        <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.footer}>
          <OnboardingProgressBar step={1} />
          <View style={styles.footerRow}>
            <PaginationDots activeStep={1} />
            <OnboardingCta label="Next" onPress={() => router.push('/onboarding/features')} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  inner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  ringsWrap: { marginBottom: Spacing.xl },
  chatIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    color: '#1A2332',
    textAlign: 'center',
  },
  titleAccent: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },

  /* Demo card */
  demoCard: {
    width: '100%',
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Layout.radiusLarge,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 48,
  },
  demoText: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
    color: '#1A2332',
    minHeight: 22,
  },
  micArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: '#9CA3AF',
    marginTop: Spacing.xs,
  },

  /* Wave bars */
  waveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
  },

  /* Footer */
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.base,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
