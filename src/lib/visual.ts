import type { MeterKey, MeterLevel } from './types';

// Keep in sync with SCENES / METER_KEYS in supabase/functions/_shared/gemini.ts
export const SCENES = ['study', 'startup', 'office', 'creative', 'city_move', 'health', 'travel', 'balance', 'teaching', 'outdoors'] as const;
export type SceneKey = (typeof SCENES)[number];

export function sceneKey(v: string | null | undefined): SceneKey {
  return (SCENES as readonly string[]).includes(v ?? '') ? (v as SceneKey) : 'balance';
}

export const METERS: { key: MeterKey; icon: string; label: string }[] = [
  { key: 'skills', icon: '💪', label: 'Skills' },
  { key: 'work', icon: '💼', label: 'Work & studies' },
  { key: 'money', icon: '💰', label: 'Money' },
  { key: 'free_time', icon: '⏰', label: 'Free time' },
  { key: 'wellbeing', icon: '😊', label: 'Happiness' },
];

export const LEVEL_DISPLAY: Record<MeterLevel, { arrows: string; text: string; color: string }> = {
  up2: { arrows: '▲▲', text: 'A lot more', color: '#4ADE80' },
  up: { arrows: '▲', text: 'More', color: '#86EFAC' },
  same: { arrows: '●', text: 'About the same', color: '#A6ACCF' },
  down: { arrows: '▼', text: 'Less', color: '#FDBA74' },
  down2: { arrows: '▼▼', text: 'A lot less', color: '#FF8A3D' },
};
