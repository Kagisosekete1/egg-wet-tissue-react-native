# Egg & Wet Tissue 1.1.0

The canonical project is https://github.com/Kagisosekete1/egg-wet-tissue-react-native.
The redesign history from Egg-Tissue-Update has been brought forward without resetting the original history or replacing its backend.

## App and browser

- `browser/` contains the cartoon game source. Run `npm ci`, `npm run build`, `npm test` inside it.
- `docs/` contains the matching static deployment for GitHub Pages or another static host.
- Production browser URL: https://egg-tissue-cartoon-play.seketefilmstv.chatgpt.site/online?repair=1
- The Android home opens the same online cartoon app through a WebView. An internet connection is required. This is deliberate while offline support is paused.
- Native Supabase sessions are passed into the trusted game origin through the WebView bridge, never URL parameters. Browser sign-in is mirrored back to native secure storage. External origins cannot invoke native app actions.
- Existing Supabase project, profiles, public leaderboard, account score RPC and OneSignal identity are retained. Gifts and adventure coins remain device-local and never overwrite online scores.
- The profile editor supports country and photos. Existing privacy, terms and deletion-by-email content is available under Settings. Deletion requests are not represented as immediate automatic deletion.
- The current unlocked level is highlighted and brought into view; level progression still requires wins.

## Android release

App ID remains `com.semogrouptech.eggtissue`. Version is 1.1.0 / code 9. Launcher/adaptive and splash assets use the supplied egg artwork.

For original-key APK and AAB builds, supply these existing signing environment settings securely, then run `bash tools/build-android-release.sh`:

- `EGGTISSUE_UPLOAD_KEYSTORE` (absolute path to the original keystore)
- `EGGTISSUE_UPLOAD_STORE_PASSWORD`
- `EGGTISSUE_UPLOAD_KEY_ALIAS`
- `EGGTISSUE_UPLOAD_KEY_PASSWORD`

The script refuses to substitute a debug key. Signing keys and passwords must not be committed to Git.

Alternatively, `eas.json` provides preview APK and production AAB profiles for an authenticated Expo account with the correct existing Android credentials. Do not generate replacement production credentials for the existing Play app.

Publishing source does not update existing installed APKs by itself: distribute the correctly signed app update through the existing store/channel. No Play submission is performed automatically.
