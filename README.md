# PARALLEL — Meet the life you didn't choose

An AI-powered life-exploration app. You can explore alternative versions of your future, compare their trade-offs, and turn the path you prefer into a practical plan.

**Stack:** Expo SDK 58 (React Native, TypeScript, Expo Router) · Supabase (Postgres, Auth, Edge Functions) · Google Gemini (structured JSON output, called only from the server).

> PARALLEL generates hypothetical, assumption-based scenarios. It does not predict anyone's future.

---

## What's in the app

| Area | What it does |
|---|---|
| **Welcome / Auth** | Landing hook, then email + password sign-up and sign-in |
| **Onboarding** | Six short questions you can skip (stage, ambition, interests, habits and time, strengths and challenges, first "what if") |
| **Future Reveal** | Your current trajectory, plus the baseline "Familiar Path" and an alternate life, shown on an animated branching map |
| **Scenario detail** | Premise, possible scenario, life areas, trade-off, requirements, risks, assumptions, and the **Meet your future self** story |
| **Life vs. Life** | Side-by-side comparison (Plus adds risks, life areas and 3-way compare) |
| **Decision Lab** | Sliders that update a transparent hours formula and a savings illustration as you move them, then "What if…" to generate a new path |
| **Plan** | AI action plan with weekly tasks, milestones, review date, your own tasks and check-ins |
| **My Lives** | Archive of saved snapshots with a life map for each |
| **Share card** | A privacy-safe "Two lives. One choice." image you share yourself (no profile data on it) |
| **Profile** | Edit answers, plan usage, scenario-memory consent, **export my data** (JSON), **delete my data** |
| **Premium** | Honest Free vs. Plus comparison at ₹299/month. Payments are not wired up yet ("notify me") |

Free-tier limits are enforced **on the server** in the Edge Functions. See [src/lib/limits.ts](src/lib/limits.ts) and [supabase/functions/_shared/limits.ts](supabase/functions/_shared/limits.ts), and keep the two files in sync.

```
src/app/            screens (Expo Router)
src/components/     UI kit, LifeMap (SVG), ScenarioCard, ShareCard
src/lib/            supabase client, data access, edge-function API, deterministic calc
supabase/migrations SQL schema + RLS
supabase/functions  generate-snapshot · generate-narrative · generate-plan (Gemini)
```

---

## Supabase setup — step by step

You only need to do this once. It takes about 15 minutes.

### 1. Create the project
1. Go to <https://supabase.com> and sign up (GitHub login is easiest).
2. Click **New project**.
   - **Name:** `parallel`
   - **Database password:** generate one and **save it somewhere safe**.
   - **Region:** *South Asia (Mumbai)*, the closest one for India.
3. Wait about 2 minutes while the project starts.

### 2. Copy your API keys into the app
1. In the dashboard, open **Project Settings → API Keys**. Copy the **publishable** key (`sb_publishable_…`). The legacy **anon** key also works.
2. Open **Project Settings → Data API** (or use the **Connect** button) and copy the **Project URL** (`https://xxxx.supabase.co`).
3. In this project folder, copy `.env.example` to `.env` and fill it in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
   ```
   These two values are safe to ship in an app. Row Level Security protects the data. **Never** put the `service_role`/secret key or the Gemini key in `.env`.

### 3. Turn on email + password auth
**Authentication → Sign In / Providers → Email**: make sure it's enabled.
For development, turn **off "Confirm email"** so new accounts can sign in immediately. Turn it back on before a public launch.

### 4. Get a Gemini API key
Go to <https://aistudio.google.com/apikey>, click **Create API key**, and copy it.

### 5. Link the Supabase CLI (no global install needed)
Run these in this project folder:
```bash
npx supabase login                         # opens the browser to authorize
npx supabase link --project-ref <your-ref> # the ref is the "xxxx" in https://xxxx.supabase.co
```
It will ask for the database password from step 1.

### 6. Create the database tables
```bash
npx supabase db push
```
This applies [supabase/migrations/20261029000000_init.sql](supabase/migrations/20261029000000_init.sql), which creates the tables, row-level security policies, a sign-up trigger and the usage counter.
*Alternative:* paste that file into **SQL Editor → New query → Run**.

### 7. Store the Gemini key as a server secret
```bash
npx supabase secrets set GEMINI_API_KEY=your-gemini-key
# optional: choose a different model (default: gemini-3.5-flash-lite — fast enough for the 150s function limit)
npx supabase secrets set GEMINI_MODEL=gemini-3.5-flash-lite GEMINI_THINKING_LEVEL=minimal
```

### 8. Deploy the Edge Functions
```bash
npx supabase functions deploy generate-snapshot --no-verify-jwt
npx supabase functions deploy generate-narrative --no-verify-jwt
npx supabase functions deploy generate-plan --no-verify-jwt
```
`--no-verify-jwt` is intentional. Each function verifies the user's session itself with `auth.getUser()`.

### 9. Check that it worked
- **Table Editor** shows `profiles`, `snapshots`, `scenarios`, `plans`, `plan_tasks`, `checkins` and `usage`, each with RLS enabled.
- After you sign up in the app, a row appears in `profiles`.
- **Edge Functions → (function) → Logs** shows each AI call. Any errors from Gemini appear there too.

---

## Run it on your Android phone (Expo Go)

1. Install **Expo Go** from the Play Store.
2. Run:
   ```bash
   npm install
   npx expo start
   ```
3. Either:
   - **Same Wi-Fi:** scan the QR code with Expo Go, or
   - **USB:** with USB debugging on and the phone authorized (`adb devices` shows `device`), run `adb reverse tcp:8081 tcp:8081`, then press **`a`** in the Expo terminal.
4. After you edit `.env`, restart with `npx expo start --clear`.

### Useful commands
```bash
npx tsc --noEmit      # typecheck
npx expo-doctor       # dependency / config health
```

### Giving yourself Plus for testing
In **SQL Editor**, run:
```sql
update public.profiles set plan = 'plus' where id = (select id from auth.users where email = 'you@example.com');
```
A database trigger stops users from changing their own plan from the app.

---

## Roadmap (from the concept doc)
- Razorpay subscriptions (requires a development build, not Expo Go)
- Multiple-horizon comparisons, scenario version history, richer share themes
- PostHog analytics for activation, retention and conversion
