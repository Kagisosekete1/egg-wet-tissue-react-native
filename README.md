# Egg & Wet Tissue — Native React Native

Android package: `com.semogrouptech.eggtissue`. Screens use native React Native views; the game uses React Three Fiber and Expo GL.

## Restored game

The hand, pink sprayer, water particles, wet tissue, sagging and tearing, egg expressions, shell fragments, splat, and confetti are ported directly from the supplied original HTML. `tools/restore-original-scene.cjs` retains that source. `tools/restore-original-audio.py` renders its original Web Audio effects to native WAV assets. No WebView is used.

Home, play, leaderboard, profile, authentication, and settings are separate screens. Opponent, difficulty, and game style are configured in Settings. The supplied logo remains the app icon and splash image. Screens respect the phone status bar.

Profiles support a square photo, username, and searchable country selection. Profile changes are shared across Home, the game, profiles, and the leaderboard. Existing Supabase accounts, photos, and category win totals are retained.

## Scoring and data

The complete schema is `supabase/all-tables.sql`; SQL is not a page inside the app. Migrations 001–003, 005–008, and 012 are included. Migration 003 was applied to the connected project and imports legacy wins without overwriting subsequent native results. Migration 012 must be applied before using point-staked battles.

A completed round awards:

`floor((min(60, safe sprays × 2) + min(20, completed rounds × 2) + (win ? 20 : 0)) × difficulty)`

Difficulty multipliers: Easy 1, Normal 1.5, Hard 2. The server records each game ID once. Unsynced results are queued on the device. Earlier legacy wins retain their prior 10-point value.

## Reward adverts

The game screen always includes the reward control. A completed rewarded advert repairs up to the last four sprays, retaining the current turn. Another advert can be watched after further sprays. No reward is granted when an advert is skipped or fails.

The Android AdMob App ID is `ca-app-pub-3333777272750017~7598669780` and the production rewarded unit is `ca-app-pub-3333777272750017/5128419119`, both supplied by the owner. Google test ads were used to check the earned-reward flow; `EXPO_PUBLIC_ADMOB_TEST_ADS=1` selects that diagnostic mode and suppresses score submissions. The delivered main build uses the supplied production App ID and rewarded unit. Ad availability depends on AdMob's response.

## Build

Install dependencies with `npm ci`, then run `.\build-native-release.ps1` from this project directory. The script applies the Android native-build workaround and produces both APK and AAB files in the sibling `artifacts` folder by default. Set `EGGTISSUE_OUTPUT_DIR` to choose another output directory.

Release signing requires the Play upload keystore and the four `EGGTISSUE_UPLOAD_*` environment variables used by the build script. Keep the keystore and passwords outside this repository. An APK can update an installed Play build only when it is signed with the matching certificate; never uninstall an app merely to bypass a signature mismatch, since that can remove local app data.

### Point-staked online battles

Migrate the database with `supabase/migrations/012_point_staked_online_battles.sql` before using the Challenges flow. Stakes use 50-point increments (50–5,000), are held server-side, and the winner receives both stakes after the server resolves the fall or a player forfeits. Invites expire after 24 hours and are refunded when the expiry cleanup RPC runs. Battle state and point settlement are validated by authenticated database functions; `supabase/all-tables.sql` includes this migration. Deploy the `send-battle-update` Supabase Edge Function to notify the other player when a battle is accepted, their turn starts, or a battle ends.

## Play the 2D browser edition

Play: https://egg-tissue-cartoon-play.seketefilmstv.chatgpt.site.

The `browser/` directory contains the offline browser game with the original rule module and 2D cartoon renderer. It restores Classic, Sudden Death, Chaos Cards and first-to-two Tournament modes; computer and pass-and-play; original boost/shield item rules and prices; and the high-tension countdown. New features include a home/menu flow, 12 unlockable levels, star ratings, daily XP missions, local shop/inventory, local player name and match history.

Everything stays in the browser as requested: device points and inventory are separate from original game accounts. No existing accounts, online invitations, global leaderboard, adverts or payments are connected.

Inside `browser/`, run `npm ci`, `npm run build`, and `npm test`. The native Android app remains in the root. The browser adaptation uses hash routes and does not change the native application's navigation or production backend.

The browser now includes the native game’s original sound effects and three music tracks, with pause/mute and separate music control. The shared 2D scene places the sprayer above-right beside the tree, with a directed water stream, persistent wet patches and drips.

Browser control update: turns now strictly alternate with one roll per player, manual sprays have no countdown interruption, Back exits directly, and pause menus remain visible and dismissible. Added earlier egg reactions, persistent tissue warnings, moving clouds/helicopter and the nine uploaded songs in a continuous 12-track shuffle at the existing volume. See `browser/README.md` for behavior and validation.

PWA update: the browser edition can be installed from its home screen or the phone browser’s install menu. It caches the game and effects for offline play, with optional offline download of the full playlist. The trail now generates endless six-level worlds across eight environment themes, preserving all existing level progress. See `browser/README.md`.


### Mobile controls, install and online tools update

The browser game now has a visible tools tray, shields for both pass-and-play players, defensive boosts during spraying, Settings → Install & share, saved vibration preferences, a custom photo picker, joined legacy profile photos, live rankings, and browser-based invite/accept/battle screens. Adventure items use device coins; original account items use ranking points and are shown under Online gear. Ranked balances and inventory are always changed by authenticated database functions. No signed APK release is published yet; the download checker only offers real GitHub release assets.

Backend deployment is still required on the existing Supabase project `glnkdakwkhaeywpvqvae` (do not create another database):

1. Apply `013_notification_inbox.sql`, then `014_online_battle_tools.sql`, after the already existing migrations. These add a private durable notification inbox, realtime subscriptions, and atomic battle tools with ownership, turn and inventory checks. Existing profiles and battle IDs are retained.
2. Deploy both `send-challenge` and `send-battle-update` Edge Functions along with their `_shared/http.ts` module. Set `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` in Supabase secrets using the OneSignal application's existing values. Never put the REST API key in the browser or app bundle. Functions validate Supabase sessions themselves and include browser CORS support. If the gateway does not accept the project's publishable-key access tokens, deploy with gateway JWT verification disabled; the function's `auth.getUser()` validation must remain enabled.
3. With two test accounts, send/accept an invite, finish a turn, and check the private inbox, points, avatar and push delivery on the receiving phone. Online tools remain disabled until the battle record exposes the deployed tools version; no item is consumed by a missing RPC.
4. Build a new signed Android APK/AAB to include the native notification-history and vibration bridge. Android messages received in the foreground or opened by tapping are stored per account and shown in the bell inbox. Old background messages cannot be recovered from OneSignal's native SDK history.

The normal PWA is online-first: `app-sw.js` supports installation without caching a stale game shell or songs. Offline work is deferred. Native notification and rewarded-ad SDK changes require a new Android binary; publishing the web game alone cannot update those SDKs.

Validation for this update: browser gameplay and signed-in UI fixtures pass; the online migration tests use embedded PostgreSQL to exercise ownership, private inbox RLS, stakes, counters, shield durability, idempotency and a single winner payout. Run `npm ci` and `npm test` in `browser/`; run `npm ci` in `tools/sql-tests/`, then `npm run test:online-db` and `npm run test:inbox` from the root. Android JavaScript export passes. The existing native project still has 52 TypeScript errors and one GameScreen lint error; this update introduces no additional native errors. Physical Samsung A05 and two-device push checks remain necessary after backend deployment/new signed Android build.
