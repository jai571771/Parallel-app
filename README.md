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
| **Future Reveal** | Each possible life shown as an illustrated scene, 5 life-area meters (more / same / less, never fake numbers) and emoji good parts / hard parts, all in plain language |
| **Scenario detail** | Premise, possible scenario, life areas, trade-off, requirements, risks, assumptions, and the **Meet your future self** story |
| **Life vs. Life** | Side-by-side comparison (Plus adds risks, life areas and 3-way compare) |
| **Decision Lab** | Sliders that update a transparent hours formula and a savings illustration as you move them, then "What if…" to generate a new path |
| **Plan** | AI action plan with weekly tasks, milestones, review date, your own tasks and check-ins |
| **My Lives** | Archive of saved snapshots with a life map for each |
| **Share card** | A privacy-safe "Two lives. One choice." image you share yourself (no profile data on it) |
| **Profile** | Edit answers, plan usage, scenario-memory consent, **export my data** (JSON), **delete my data** |
| **Daily What-If** | One tiny everyday choice per day (AI-personalised, with a 48-card hand-written backup deck). Pick a side, see the illustrated outcome, +10 XP |
| **Game layer** | Pip the firefly guide, XP, levels (Dreamer → Visionary), daily streak 🔥 with streak freezes 🧊, a daily XP goal ring, 11 badges, quests from your plan, confetti and haptics |
| **Reminders** | Optional daily local notification from Pip (works in Expo Go) |
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
This applies the files in [supabase/migrations/](supabase/migrations/): tables, row-level security, the sign-up trigger, the usage counter, and the game layer (XP, streaks, badges and daily cards, all awarded through the `award_xp` database function so XP can't be farmed).
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
npx supabase functions deploy daily-card --no-verify-jwt
npx supabase functions deploy billing --no-verify-jwt
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
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
   npx expo start --go
   ```
   (`--go` is needed because the project also supports development builds.)
3. Either:
   - **Same Wi-Fi:** scan the QR code with Expo Go, or
   - **USB:** with USB debugging on and the phone authorized (`adb devices` shows `device`), run `adb reverse tcp:8081 tcp:8081`, then press **`a`** in the Expo terminal.
4. After you edit `.env`, restart with `npx expo start --go --clear`.

Purchases don't work in Expo Go. Use the development build below for that.

### Useful commands
```bash
npx tsc --noEmit      # typecheck
npx expo lint         # lint
npx expo-doctor       # dependency / config health
```

### Giving yourself Plus for testing
In **SQL Editor**, run:
```sql
select public.set_plan((select id from auth.users where email = 'you@example.com'), now() + interval '30 days');
```
A database trigger stops users from changing their own plan from the app. A real billing sync will later overwrite this with whatever Google Play says.

---

## PARALLEL Plus: Google Play subscriptions

The Plus insights ("What it takes", "Things that could go wrong", "What could change this") are visible to everyone, but blurred behind a 🔒 for free users. Payments use **Google Play Billing** through **RevenueCat**, because Google's policy requires Play Billing for in-app subscriptions.

How it fits together:
- The app logs each user into RevenueCat with their Supabase user id.
- After a purchase or restore, the app calls the `billing` function. It asks RevenueCat's REST API for the `plus` entitlement and sets `profiles.plan` / `plus_until` via `set_plan()`.
- RevenueCat's webhook (`revenuecat-webhook`) does the same for renewals, cancellations, expirations and refunds.
- Users can never change their own plan (the `protect_profile_plan` trigger).

### 1. Development build (EAS)
In-app purchases need a real build, not Expo Go:
```bash
npx eas-cli@latest login                     # free Expo account
npx eas-cli@latest init                      # links this project to EAS
npx eas-cli@latest build --profile development --platform android
```
Install the APK it gives you, then run `npx expo start --dev-client`. The `.easignore` file makes sure your `.env` is included in cloud builds.

### 2. Google Play Console
1. Create a developer account at <https://play.google.com/console>. It costs a one-time US$25 fee and needs identity verification.
2. **Create app**: name it PARALLEL, choose App, Free (free to download, with in-app purchases).
3. Build for the store with `npx eas-cli@latest build --profile production --platform android`, then upload the `.aab` to **Testing → Internal testing**. Add your Gmail as a tester.
4. **Settings → License testing**: add your Gmail, so test purchases are free.
5. **Monetize → Products → Subscriptions → Create subscription**: product ID `parallel_plus`. Add a base plan `monthly` that auto-renews every month at ₹299. Activate it.

### 3. RevenueCat
1. Sign up at <https://www.revenuecat.com>, create a project, then **Add app → Google Play Store** with package `com.jai571771.parallel`.
2. Follow RevenueCat's guide to upload a **Google service account JSON**. This lets RevenueCat check purchases with Google.
3. **Product catalog → Entitlements → New**: create `plus` and attach the product `parallel_plus:monthly`.
4. **Offerings**: make sure the default offering has a **Monthly** package with that product.
5. **API keys**:
   - Copy the **Android public SDK key** into `.env` as `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...`
   - Create a **secret key** and store it on the server: `npx supabase secrets set REVENUECAT_SECRET_KEY=sk_...`
6. **Integrations → Webhooks → Add**: set the URL to `https://YOUR-PROJECT-REF.supabase.co/functions/v1/revenuecat-webhook`. Set an **Authorization header value** (any long random string), then store the same value: `npx supabase secrets set REVENUECAT_WEBHOOK_AUTH=that-value`
7. Rebuild the development build so it includes the new key.

To test: on a license-tester account, open Premium → **Get Plus**. Buy through Google Play's sheet (no real charge), and the locks open.

---

## Roadmap (from the concept doc)
- Multiple-horizon comparisons, scenario version history, richer share themes
- PostHog analytics for activation, retention and conversion
