// Today's "What-If" card: one tiny, everyday choice with two illustrated outcomes.
// Personalised by Gemini when it answers quickly; otherwise from the hand-written deck.
import { cleanMeters, cleanScene, describeProfile, generateJson, METER_KEYS, METER_VALUES, sceneSchema } from '../_shared/gemini.ts';
import { DECK, pickDeckCard, type CardOption } from '../_shared/deck.ts';
import { adminClient, json, requireUser, serve } from '../_shared/http.ts';

const CATEGORIES = [...new Set(DECK.map((c) => c.category))];
const AI_TIMEOUT_MS = 25_000;

// Compact meters (no notes) keep the card small enough for a fast response.
const compactMeters = {
  type: 'OBJECT',
  description: 'How 5 life areas could change with this choice. Most stay "same".',
  properties: Object.fromEntries(METER_KEYS.map((k) => [k, { type: 'STRING', enum: [...METER_VALUES] }])),
  required: [...METER_KEYS],
};

type AiCard = {
  category: string;
  emoji: string;
  question: string;
  option_a: CardOption;
  option_b: CardOption;
  pip_says: string;
};

const optionSchema = {
  type: 'OBJECT',
  properties: {
    label: { type: 'STRING', description: 'The choice, max 5 simple words' },
    emoji: { type: 'STRING', description: 'One emoji' },
    scene: sceneSchema,
    meters: compactMeters,
    outcome: { type: 'STRING', description: 'What could happen if you choose this. One short, kind sentence, max 12 words' },
  },
  required: ['label', 'emoji', 'scene', 'meters', 'outcome'],
};

const cardSchema = {
  type: 'OBJECT',
  properties: {
    category: { type: 'STRING', enum: CATEGORIES },
    emoji: { type: 'STRING', description: 'One emoji for the question' },
    question: { type: 'STRING', description: 'A tiny real choice for today or this week, max 14 simple words, ending with "?"' },
    option_a: optionSchema,
    option_b: optionSchema,
    pip_says: { type: 'STRING', description: 'Pip the friendly firefly mascot says one cheerful line, max 10 words' },
  },
  required: ['category', 'emoji', 'question', 'option_a', 'option_b', 'pip_says'],
};

const cleanOption = (o: Partial<CardOption> | undefined): CardOption => ({
  label: String(o?.label ?? '').slice(0, 50) || 'This one',
  emoji: String(o?.emoji ?? '').slice(0, 8) || '✨',
  scene: cleanScene(o?.scene),
  meters: cleanMeters(
    Object.fromEntries(
      Object.entries((o?.meters ?? {}) as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' ? { level: v, note: '' } : v]),
    ),
  ),
  outcome: String(o?.outcome ?? '').slice(0, 140),
});

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);

  const { data: gs } = await admin.from('game_state').select('timezone').eq('user_id', user.id).maybeSingle();
  const tz = gs?.timezone ?? 'Asia/Kolkata';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()); // YYYY-MM-DD

  const { data: existing } = await admin.from('daily_cards').select('*').eq('user_id', user.id).eq('day', today).maybeSingle();
  if (existing) return json(existing);

  const { data: recent } = await admin
    .from('daily_cards')
    .select('category, question')
    .eq('user_id', user.id)
    .order('day', { ascending: false })
    .limit(14);
  const recentCats = (recent ?? []).slice(0, 4).map((r) => r.category);
  const recentQs = (recent ?? []).map((r) => r.question);

  let row: Record<string, unknown>;
  try {
    const [{ data: profile }, { data: scenarios }] = await Promise.all([
      admin.from('profiles').select('*').eq('id', user.id).single(),
      admin.from('scenarios').select('title, decision').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
    ]);
    const prompt = `${describeProfile(profile ?? {})}
Lives they explored recently: ${(scenarios ?? []).map((s) => `${s.title} (${s.decision ?? ''})`).join('; ') || 'none yet'}

Create today's "What-If" card for this person: one small, realistic choice they could make today or this week, connected to their goals or habits.
- Two clearly different options. Both are okay choices; neither is "wrong".
- For each option show how 5 life areas could change (most should be "same"; only change 1–3 areas).
- Avoid these recent questions: ${recentQs.slice(0, 7).join(' | ') || 'none'}
- Prefer a category different from: ${recentCats.join(', ') || 'none'}`;

    const ai = await generateJson<AiCard>({ prompt, schema: cardSchema, temperature: 1, timeoutMs: AI_TIMEOUT_MS });
    if (!ai.question || !ai.option_a || !ai.option_b) throw new Error('incomplete card');
    row = {
      source: 'ai',
      category: CATEGORIES.includes(ai.category) ? ai.category : 'habits',
      emoji: String(ai.emoji ?? '🔮').slice(0, 8),
      question: String(ai.question).slice(0, 160),
      option_a: cleanOption(ai.option_a),
      option_b: cleanOption(ai.option_b),
      pip_says: String(ai.pip_says ?? '').slice(0, 100) || null,
    };
  } catch (e) {
    console.log('daily-card: using deck fallback', e instanceof Error ? e.message : e);
    const deckCard = pickDeckCard(user.id, today, recentCats, recentQs);
    row = {
      source: 'deck',
      category: deckCard.category,
      emoji: deckCard.emoji,
      question: deckCard.question,
      option_a: deckCard.a,
      option_b: deckCard.b,
      pip_says: deckCard.pip_says,
    };
  }

  // Two quick taps can race; the unique (user_id, day) key keeps exactly one card.
  await admin.from('daily_cards').upsert({ ...row, user_id: user.id, day: today }, { onConflict: 'user_id,day', ignoreDuplicates: true });
  const { data: card } = await admin.from('daily_cards').select('*').eq('user_id', user.id).eq('day', today).single();
  return json(card);
});
