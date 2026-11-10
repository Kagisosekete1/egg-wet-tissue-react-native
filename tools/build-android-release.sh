#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for signing_name in EGGTISSUE_UPLOAD_KEYSTORE EGGTISSUE_UPLOAD_STORE_PASSWORD EGGTISSUE_UPLOAD_KEY_ALIAS EGGTISSUE_UPLOAD_KEY_PASSWORD; do
  if [ -z "${!signing_name:-}" ]; then
    printf 'Missing signing setting: %s\n' "$signing_name" >&2
    exit 1
  fi
done
if [ ! -f "$EGGTISSUE_UPLOAD_KEYSTORE" ]; then
  printf 'The configured original upload keystore file is missing.\n' >&2
  exit 1
fi
(cd android && bash ./gradlew --no-daemon --max-workers=2 app:assembleRelease app:bundleRelease)
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release.apk artifacts/Egg-Tissue-1.1.0.apk
cp android/app/build/outputs/bundle/release/app-release.aab artifacts/Egg-Tissue-1.1.0.aab
printf 'Signed APK and AAB are in artifacts/.\n'
