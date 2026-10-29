import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { scenarioColor } from '@/components/ScenarioCard';
import { ShareCard, type ShareCardRef, type ShareTheme } from '@/components/ShareCard';
import { Button, Card, Chip, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { getSnapshot } from '@/lib/data';
import { useLoad } from '@/lib/useLoad';
import { useUser } from '@/providers/AuthProvider';
import { useGame } from '@/providers/GameProvider';
import { colors, spacing } from '@/theme';

const QUESTIONS = ['Which path would you explore first?', 'Which version would you choose?', 'What would you change?'];
const THEMES: ShareTheme[] = ['night', 'violet', 'dawn'];

export default function Share() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useUser();
  const isPlus = profile?.plan === 'plus';
  const { award } = useGame();
  const { data: snap, error, reload } = useLoad(() => getSnapshot(id), [id]);
  const cardRef = useRef<ShareCardRef>(null);
  const [question, setQuestion] = useState(QUESTIONS[0]);
  const [theme, setTheme] = useState<ShareTheme>('night');
  const [picked, setPicked] = useState<string[] | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  if (error) return <Screen edges={[]}><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!snap) return <Screen edges={[]} scroll={false}><Loading /></Screen>;

  const all = snap.scenarios ?? [];
  const ids = picked ?? all.slice(0, 2).map((s) => s.id);
  const paths = all.filter((s) => ids.includes(s.id));

  const toggle = (sid: string) =>
    setPicked(ids.includes(sid) ? ids.filter((x) => x !== sid) : [...ids, sid].slice(-2));

  async function share() {
    setShareError(null);
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share my parallel lives' });
      if (snap) award('share', snap.id);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen edges={[]}>
      <T color={colors.textMuted}>
        Only the path titles and short taglines appear on the card — never your profile or personal details.
      </T>

      <ShareCard ref={cardRef} paths={paths} question={question} theme={theme} />

      {all.length > 2 ? (
        <View style={{ gap: spacing.sm }}>
          <Label>Paths on the card</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {all.map((s) => (
              <Chip key={s.id} label={s.title} selected={ids.includes(s.id)} color={scenarioColor(s)} onPress={() => toggle(s.id)} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Label>Question</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {QUESTIONS.map((q) => (
            <Chip key={q} label={q} selected={q === question} onPress={() => setQuestion(q)} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Label>Theme {isPlus ? '' : '· Plus'}</Label>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {THEMES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={t === theme}
              onPress={() => (isPlus || t === 'night' ? setTheme(t) : router.push('/premium'))}
            />
          ))}
        </View>
      </View>

      {shareError ? <ErrorBox message={shareError} /> : null}
      <Button title="Share image" icon="share-social-outline" loading={sharing} disabled={paths.length === 0} onPress={share} />
      <Card style={{ backgroundColor: colors.bgElevated }}>
        <T variant="small" color={colors.textFaint}>
          Sharing is always your choice. PARALLEL never posts anything on your behalf.
        </T>
      </Card>
    </Screen>
  );
}
