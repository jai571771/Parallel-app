/**
 * Deterministic Decision Lab maths. The PDF is explicit that numbers come from
 * transparent formulas, never from the LLM.
 */
export type LabInputs = {
  hoursPerDay: number; // 0–6
  daysPerWeek: number; // 1–7
  consistency: number; // 0.2–1
  years: number; // 1, 3, 5, 10
};

export type LabResult = {
  focusedHours: number;
  hoursPerWeek: number;
  weeklyLabel: string;
  equivalents: { label: string; value: string }[];
  formula: string;
};

const round = (n: number) => Math.round(n);

export function computeLab({ hoursPerDay, daysPerWeek, consistency, years }: LabInputs): LabResult {
  const hoursPerWeek = hoursPerDay * daysPerWeek * consistency;
  const focusedHours = round(hoursPerWeek * 52 * years);

  // Rough, clearly-labelled equivalents to make the number tangible.
  const equivalents = [
    { label: 'Full-time work weeks (40h)', value: (focusedHours / 40).toFixed(1) },
    { label: 'Hours per month (average)', value: String(round(hoursPerWeek * 52 / 12)) },
    { label: '30-hour learning courses', value: String(Math.floor(focusedHours / 30)) },
    { label: 'Weekend-size projects (~16h)', value: String(Math.floor(focusedHours / 16)) },
  ];

  return {
    focusedHours,
    hoursPerWeek,
    weeklyLabel: `${hoursPerWeek.toFixed(1)} h / week`,
    equivalents,
    formula: `${hoursPerDay}h × ${daysPerWeek} days × 52 weeks × ${years} yr × ${Math.round(consistency * 100)}% = ${focusedHours.toLocaleString()} h`,
  };
}

/** Simple assumption-based savings illustration (no returns modelled unless rate > 0). */
export function computeSavings(monthly: number, years: number, annualRatePct: number) {
  const months = years * 12;
  const r = annualRatePct / 100 / 12;
  const total = r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r);
  return { contributed: monthly * months, total: Math.round(total) };
}
