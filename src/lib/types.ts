export type Plan = 'free' | 'plus';

export type Profile = {
  id: string;
  display_name: string | null;
  age_range: string | null;
  stage: string | null;
  interests: string[];
  ambition: string | null;
  habits: string | null;
  strengths: string | null;
  challenges: string | null;
  change_goal: string | null;
  hours_available: number | null;
  plan: Plan;
  consent_memory: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

export type Dimension = { area: string; outlook: string };

export type Scenario = {
  id: string;
  snapshot_id: string;
  user_id: string;
  kind: 'baseline' | 'alternate';
  position: number;
  title: string;
  tagline: string;
  decision: string | null;
  premise: string;
  summary: string;
  tradeoff: string;
  what_could_change: string;
  requirements: string[];
  risks: string[];
  assumptions: string[];
  dimensions: Dimension[];
  narrative: string | null;
  created_at: string;
};

export type Snapshot = {
  id: string;
  user_id: string;
  title: string;
  insight: string | null;
  horizon_years: number;
  inputs: Record<string, unknown>;
  created_at: string;
  scenarios?: Scenario[];
};

export type ActionPlan = {
  id: string;
  user_id: string;
  scenario_id: string | null;
  title: string;
  summary: string | null;
  review_date: string | null;
  created_at: string;
  plan_tasks?: PlanTask[];
  scenarios?: Pick<Scenario, 'id' | 'title' | 'snapshot_id'> | null;
};

export type PlanTask = {
  id: string;
  plan_id: string;
  user_id: string;
  title: string;
  detail: string | null;
  week: number;
  is_milestone: boolean;
  done: boolean;
  done_at: string | null;
  created_at: string;
};

export type Checkin = {
  id: string;
  user_id: string;
  plan_id: string | null;
  note: string;
  created_at: string;
};

export type Usage = { period: string; generations: number };
