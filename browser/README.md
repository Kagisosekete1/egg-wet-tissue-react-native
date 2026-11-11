# Egg & Wet Tissue — offline browser edition

Play: https://egg-tissue-cartoon-play.seketefilmstv.chatgpt.site

This edition reuses the original mobile game's rule module and the copied project's 2D cartoon renderer. Original source: https://github.com/Kagisosekete1/egg-wet-tissue-react-native . Updated native and browser sources: https://github.com/Kagisosekete1/Egg-Tissue-Update .

## Play flow

- Home → game setup → Classic, Sudden Death, Chaos Cards or Tournament.
- Computer or pass-and-play; easy, normal or hard.
- Tournament is first to two wins. Each round uses the original rules.
- Levels: a new 12-level trail across two garden themes. Win against the computer to unlock the next level; tournament levels require winning the series. Stars reward safe sprays.
- Challenges: three daily local missions, with claim-once XP rewards; reset follows Africa/Johannesburg dates.
- Shop: the original boost/shield catalog and point prices, using a separate device wallet. Items must be bought before use; shields have limited hits. Boost/counter behavior is retained with the strict-turn adjustments described below.
- Results: actual local computer-round history and a personal best. No invented leaderboard players.
- Profile: local name, XP title, sound settings.

The browser connects the original Supabase accounts, public rankings, profile photos and battle invitations. Adventure coins, levels and local tools remain on this device; account ranking points and online inventory are separate. Android rewarded adverts use the app bridge and are unavailable in Chrome. The Site’s current sharing settings are preserved. Computer round points follow the original signed scoring formula. Pass-and-play rounds do not affect solo points, levels or daily missions. Device storage can be cleared by the browser; it is not a cloud backup.

## Build and checks

Run `npm ci`, `npm run build` and `npm test`. Deploy `dist/`. `build.cjs` adapts the original React Native SVG renderer for browsers. Hash routes support back/forward navigation without server route configuration.

Rules/progression tests cover signed scoring, level gates/stars, tournament completion, duplicate results, daily reward claims/reset and original game-style rules. DOM integration checks cover navigation, deep-link level locks, shop balance/inventory/equip, style selection, sudden-death state, pause/resume, a complete local match and restart. Interactive device/browser visual QA remains outstanding because the shared browser-control tool is unavailable in this environment.

This is a browser game, not a signed Android APK. The root native application remains separate. No dependency on the unfinished Lovable project.

## Original audio and water effects

The browser uses the native game's original roll, spray, crash, danger, heartbeat, reaction, fall, win/lose recordings and all three MP3 music tracks. Assets are copied unchanged under `assets/audio/` and copied into the deployment by the build. Music starts after interaction, loops at the original 0.13 volume, avoids consecutive repeated tracks, and pauses on pause/mute/background/game-over/exit. Settings includes a separate background-music switch. Effect voices are bounded and media errors never block gameplay.

The mirrored sprayer is beside the upper-right tree and points down-left toward the egg and tissue. `src/native/cartoon/layout.js` shares nozzle and tissue coordinates with the bounded spray particles. Clipped blue wet patches persist, spread with moisture, and produce visible dripping water; restarting clears the effects. The same scene change is included in the native project.

Checks: 16 copied audio files matched the original checksums and decoded with ffprobe; audio lifecycle/geometry unit tests passed; DOM integration checks passed for original audio triggers, pause/mute/resume/exit, spray visibility, persistent wetness and restart cleanup. Actual speaker output and device visual QA remain unverified.

## Turn, navigation, scenery and playlist fixes

The browser edition now enforces one roll per player and strict alternating turns, including Chaos. `turn-rules.js` wraps the retained original rules: extra-turn cards become first-spray shields; attacks retain the attacker's roll; counter responses return to the attacker; Lucky Roll is disabled without consuming owned stock. The AI always rolls and takes its required sprays instead of skipping its roll with an attack. Each manual tap applies exactly one spray immediately, without a high-tension countdown or mid-turn input lock. Only rolling, the completed-turn handoff and game-over sequence briefly lock actions.

Back leaves the match directly. Pause has an explicit close button, dismissible backdrop and Escape support. Pausing animations no longer freezes the modal's entrance at opacity zero. The instruction panel remains visible and updates with early loose/sagging/wobbly/tear warnings. The egg has five progressive expressions, including raised brows, a worried mouth, wide eyes and sweat. Clouds drift across the scene and an original cartoon helicopter flies past with a moving rotor; scenery pauses with the match and respects reduced motion.

Nine user-uploaded Suno M4A songs are included alongside the three existing tracks. Mobile AAC copies retain the full uploaded durations, with no volume processing; the player gain remains 0.13. A 12-track shuffle bag avoids repeats until the bag is exhausted. Play starts a song immediately, a single next song is preloaded, and the next song starts automatically on `ended`. Restart/new-round selects the next shuffled track immediately. Pause, mute, background, game-over and exit stop playback appropriately.

Validation includes 20 forced-extra-turn Chaos turns, exact spray counts, attack/counter turn ownership, five rapid-tap two-player turns with early expressions, two full computer/human cycles, all main navigation routes, menu close/Escape/direct Back, moving/pause-frozen scenery, full tournament completion, and the 12-track shuffle/end/pause lifecycle. Uploaded copies decode as AAC and match original durations. Browser/device visual and actual speaker-output QA remain unverified because browser-control tools are unavailable.

## Installable PWA and endless worlds

Open the published game in Android Chrome and tap **Install game**, or use Chrome’s menu → Install app / Add to Home screen. On iPhone, use Safari → Share → Add to Home Screen. Installation is always a browser/user action. The manifest supplies a standalone portrait window, original PNG/maskable icons, home-screen name and level/quick-game shortcuts.

After the first online visit finishes preparing the cache, the app shell and sound effects work offline. Songs already saved are available offline; **You → Save songs for offline play** saves the full 12-song library (about 30 MB). Music has a separate stable cache so it survives app-code updates. Offline audio supports HTTP byte-range requests. Updates wait for the user to select **Update game**; they never force a refresh during a match. Browser storage remains the source of local progress and can be cleared/evicted by the browser.

`public/` contains the canonical HTML, manifest and icons. `scripts/sw-template.js` is used by the build to generate a content-versioned worker. The build packages all web assets and precache declarations; `npm test` checks manifest/icon validity, offline navigation, audio ranges, music download and cache cleanup.

There is no level-12 endpoint anymore. `levelAt(id)` generates six stages per world without a fixed final world. Eight environment themes cycle through new expeditions: Garden Lab, Cloud Garden, Sunny Shores, Candy Valley, Frosty Peaks, Sunset Mesa, Starlight Grove and Crystal Cove. Each has its own palette and appropriate scenery. Only three worlds are rendered on the map at a time; more can be browsed with **More worlds**. The original 12 levels and existing save schema are retained. Difficulty stays within the playable easy/normal/hard rules rather than growing to impossible thresholds.

Checks: endless-level generation through level 99,999,999; level-13 unlock from an existing save; new-world artwork; map paging with bounded DOM; install-event/manual-install UI; offline shell/media/cache behavior and all previous gameplay tests. A physical-device install and interactive browser visual QA have not been performed in this environment.

## Full offline preparation

Home and You now both expose **Save full game offline**. One online preparation saves the app, both bundled font families, effects and all 12 songs; the panel confirms **Ready without internet** once everything is present. Installed players still see preparation until complete. The operation repairs missing core entries before saving songs and can be retried after a failed connection.

Saved navigation is cache-first: cold launch does not wait for a failed or stalled network request. Fonts no longer use Google’s servers; local WOFF2 files and OFL licenses are packaged under `public/fonts/`. Cache status checks verify every core asset instead of relying solely on service-worker registration. Player progress and infinite world generation remain entirely local.

Offline launch/media/cache tests and the install/save/download UI integration checks passed. Actual airplane-mode testing on a physical phone remains unverified in this environment.

## Mobile freeze/performance repair

Following a freeze report from a Samsung A05, the web renderer no longer rebuilds the complete SVG tree 30 times a second while idle. Ambient cloud, helicopter/rotor, egg and foliage movement uses CSS animation. The React animation clock runs via requestAnimationFrame only during short spray/fall effects, stops on completion, and suspends when paused or backgrounded. Static scenery, egg artwork and bottle components are memoized; spray particles are bounded to 16 normally / 8 with reduced motion.

Cached media byte-range replies now use Blob slices instead of materializing an entire song in a JavaScript ArrayBuffer per request. A partial network audio request no longer launches a duplicate full-song download during gameplay; full offline preparation still explicitly saves the playlist. Old audio sources/decoder buffers are released on track changes and exit.

Validation: a DOM integration test observed zero idle/home SVG mutations after settling, verified spray animation completion and persistent wetness, and checked responsive spray/pause/back controls. Two complete human/computer cycles passed. A 100-round media lifecycle test retains at most two music resources and releases all media on exit. Existing rules/worlds/playlist/offline tests passed. This establishes the removed work and regression behavior; it is not a physical Samsung A05 frame-rate or freeze-resolution verification.

## Startup recovery and phone fallback

After a report that the link showed an error on a Samsung A05, the published HTML/JS/service-worker responses were fetched and checked against the built files; all matched and a fresh published-bundle computer match test passed. The phone reported Chrome ERR_FAILED. This does not by itself establish whether its cause is browser storage, connectivity, or another device-specific failure.

Phones now default to Smooth mode, which keeps interactive egg/water/fall effects but disables continuous background CSS motion. Full animation remains an opt-in under You. The Home Play card appears before installation/offline preparation, and mobile scrolling has explicit flex sizing.

`launch.js` provides a startup/reload/recovery panel outside the React root, hiding it only when the game mounts. Refresh saved game checks an uncached network asset before unregistering the app worker and refreshing app-code caches; it preserves localStorage progress and the music cache. `?repair=1` is a network-first recovery entry. This repair worker activates promptly and navigates only windows explicitly opened with that recovery flag; ordinary in-progress game windows are not forcibly reloaded.

Checks cover phone Smooth defaults, startup panel removal, Play ordering, fresh load/roll/spray/back, animation preference persistence, recovery-worker activation/navigation scope, offline behavior and prior game rules. Physical-device recovery remains unverified pending a phone retest.

The worker now catches CacheStorage open/read/body errors and falls back to network responses instead of rejecting navigation (which can produce ERR_FAILED). Recovery activation no longer depends on successful cache creation. Simulated cache-database failures now return working online HTML/JS, accurate offline status and a readable offline message rather than a rejected response. Core-cache cleanup is best-effort and does not touch local progress or saved music.


### Shield, points and gift update

Shield display names are Bubble Shield (1 hit), Golden Shield (2 hits) and Rainbow Shield (3 hits). Stored IDs, prices and owned copies are preserved. Matching copies stack in the tools tray; partially used shields stay separate.

Home, Rankings and the round result show account ranking points separately from coins. Signed-in results are queued before submission and retry on refresh/focus, with per-account queues and server idempotency. No local point estimate is added to the leaderboard. Uploaded photo alternates are retained; migration 015 resolves legacy photos inside the public RPC without making private profiles readable.

Every manual gift/mission claim starts one shared 24-hour wait. Accounts require migration 016; guests use a device timer. Gift confirmation requests persist so a lost response can be retried without granting twice. Match win rewards remain automatic. Apply 006, 015 and 016 in the existing Supabase project's SQL Editor.

Watch Ad appears only on a human loss result. An earned Android advert repairs up to the last four sprays and resumes the existing die, once per round. The result stays provisional until the player ends the round, restarts or leaves; a successful revive cancels the provisional result. Chrome reports that the Android advert is unavailable.

AI answers remain pending at the owner's request. Automated gameplay, UI/outbox/cooldown and local SQL checks are available; physical-device/browser visual QA is still outstanding.


### Visible crash floor and ranking information

Active matches use a stable gameplay camera that fits the egg, tissue, sprayer and floor without cropping the landing. The sky, hills and floor extend beyond that camera so wider scene windows stay filled without stretching the characters. The lower controls reserve less height; their own scroll area handles overflow. Home artwork retains its decorative framing.

Level retries are labelled Retry Level and restart the same level. Unfinished cups also offer Continue Level, preserving round wins. The Account Ranking Points balance is a real button. Its information icon opens a rounded dialog with the account score and How ranking points grow; Escape, Got it and the close control restore focus.

The framing regression projects the mounted SVG's gameplay/landing coordinates into six window shapes, checks pause-aware impacts and verifies a real level retry. Representative idle/landed SVG renders were checked offline; a physical Samsung browser remains unverified.
