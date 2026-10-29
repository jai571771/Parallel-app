import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { LifeMeters } from '@/components/LifeMeters';
import { LifeScene } from '@/components/LifeScene';
import { PipSays } from '@/components/Pip';
import { Button, Card, ErrorBox, Label, Screen, T } from '@/components/ui';
import type { CardOption } from '@/lib/types';
import { useGame } from '@/providers/GameProvider';
import { colors, radius, spacing } from '@/theme';

/** Today's What-If: one tiny choice, two possible outcomes, +10 XP. */
export default function Daily() {
  const { card, cardLoading, cardError, loadCard, answerCard } = useGame();
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  async function choose(choice: 'a' | 'b') {
    if (!card || card.chosen || answering) return;
    setAnswering(true);
    setError(null);
    try {
      await answerCard(choice);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnswering(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>Today's What-If</Label>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      {!card ? (
        cardError ? (
          <ErrorBox message={cardError} onRetry={loadCard} />
        ) : (
          <>
            <PipSays mood="thinking" text={cardLoading ? 'Hmm… let me think of a good one for you…' : 'Getting your card…'} />
            <LifeScene scene="balance" height={180} />
          </>
        )
      ) : (
        <>
          <PipSays
            mood={card.chosen ? 'cheer' : 'happy'}
            text={card.chosen ? card.pip_says || 'Nice choice! Every choice is a tiny step.' : 'Imagine this choice for a second. Which one feels like you?'}
          />
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ fontSize: 48 }}>{card.emoji}</Text>
            <T variant="h2" style={{ textAlign: 'center' }}>{card.question}</T>
          </View>

          {(['a', 'b'] as const).map((key, i) => (
            <OptionCard
              key={key}
              option={key === 'a' ? card.option_a : card.option_b}
              color={i === 0 ? colors.cyan : colors.violet}
              state={!card.chosen ? 'open' : card.chosen === key ? 'chosen' : 'other'}
              disabled={answering}
              onPress={() => choose(key)}
            />
          ))}

          {error ? <ErrorBox message={error} /> : null}

          {card.chosen ? (
            <>
              <Button
                title="Explore this as a full life"
                icon="sparkles"
                onPress={() =>
                  router.navigate({
                    pathname: '/lab',
                    params: { decision: (card.chosen === 'a' ? card.option_a : card.option_b).label },
                  })
                }
              />
              <Button title="Back home" variant="ghost" onPress={() => router.back()} />
              <Countdown />
            </>
          ) : (
            <T variant="small" color={colors.textFaint} style={{ textAlign: 'center' }}>
              Tap a choice to see how it could shape your life · +10 XP
            </T>
          )}
        </>
      )}
    </Screen>
  );
}

function OptionCard({
  option,
  color,
  state,
  disabled,
  onPress,
}: {
  option: CardOption;
  color: string;
  state: 'open' | 'chosen' | 'other';
  disabled: boolean;
  onPress: () => void;
}) {
  const reveal = useRef(new Animated.Value(state === 'chosen' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(reveal, { toValue: state === 'chosen' ? 1 : 0, friction: 7, useNativeDriver: false }).start();
  }, [state, reveal]);

  return (
    <Pressable onPress={onPress} disabled={state !== 'open' || disabled} style={({ pressed }) => ({ opacity: state === 'other' ? 0.45 : pressed ? 0.85 : 1 })}>
      <Card accent={state === 'chosen' ? color : undefined} style={{ padding: 0, overflow: 'hidden' }}>
        <LifeScene scene={option.scene} color={color} emoji={option.emoji} height={state === 'chosen' ? 150 : 110} rounded={false} animate={state !== 'other'} />
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T variant="h3" style={{ flex: 1 }}>{option.label}</T>
            {state === 'chosen' ? (
              <View style={{ backgroundColor: color, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                <T variant="small" color={colors.bg} style={{ fontWeight: '800' }}>Your pick</T>
              </View>
            ) : null}
          </View>
          {state !== 'open' ? <T color={colors.textMuted}>{option.outcome}</T> : null}
          {state === 'chosen' ? (
            <Animated.View style={{ opacity: reveal, marginTop: spacing.sm }}>
              <LifeMeters meters={option.meters} showNotes={false} />
            </Animated.View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((midnight.getTime() - now) / 60000));
  return (
    <T variant="small" color={colors.textFaint} style={{ textAlign: 'center' }}>
      🌙 A new What-If arrives in {Math.floor(mins / 60)}h {mins % 60}m
    </T>
  );
}
