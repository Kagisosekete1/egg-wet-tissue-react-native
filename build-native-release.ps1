$ErrorActionPreference = 'Stop'
$ProjectRoot = $PSScriptRoot
$AndroidRoot = Join-Path $ProjectRoot 'android'
$AppConfig = Get-Content -LiteralPath (Join-Path $ProjectRoot 'app.json') -Raw | ConvertFrom-Json
$AppVersion = $AppConfig.expo.version
$AppVersionCode = [int]$AppConfig.expo.android.versionCode
$AppGradleFile = Join-Path $AndroidRoot 'app/build.gradle'
$AppGradleText = Get-Content -LiteralPath $AppGradleFile -Raw
$AppGradleUpdated = [regex]::Replace($AppGradleText, '(?m)^\s*versionCode\s+\d+\s*$', "        versionCode $AppVersionCode", 1)
$AppGradleUpdated = [regex]::Replace($AppGradleUpdated, '(?m)^\s*versionName\s+"[^"]*"\s*$', "        versionName `"$AppVersion`"", 1)
if ($AppGradleUpdated -eq $AppGradleText) {
  if ($AppGradleText -notmatch "versionCode\s+$AppVersionCode" -or $AppGradleText -notmatch "versionName\s+`"$([regex]::Escape($AppVersion))`"") {
    throw 'Could not sync Android versionCode/versionName from app.json.'
  }
} else {
  Set-Content -LiteralPath $AppGradleFile -Value $AppGradleUpdated -NoNewline
}
$VerifiedGradleText = Get-Content -LiteralPath $AppGradleFile -Raw
if ($VerifiedGradleText -notmatch "versionCode\s+$AppVersionCode" -or $VerifiedGradleText -notmatch "versionName\s+`"$([regex]::Escape($AppVersion))`"") {
  throw 'Android versionCode/versionName do not match app.json.'
}
$SigningVariables = @('EGGTISSUE_UPLOAD_KEYSTORE', 'EGGTISSUE_UPLOAD_STORE_PASSWORD', 'EGGTISSUE_UPLOAD_KEY_ALIAS', 'EGGTISSUE_UPLOAD_KEY_PASSWORD')
$MissingSigningVariables = $SigningVariables | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
if ($MissingSigningVariables) { throw "Missing Play upload signing environment variables: $($MissingSigningVariables -join ', ')" }
if (-not (Test-Path -LiteralPath $env:EGGTISSUE_UPLOAD_KEYSTORE)) { throw 'The configured Play upload keystore file is missing.' }
$ExpoCoreCxxRoot = Join-Path $ProjectRoot 'node_modules/expo-modules-core/android/.cxx/RelWithDebInfo'
$ExpoCoreGradle = Join-Path $ProjectRoot 'node_modules/expo-modules-core/android/build.gradle'

# Expo's SDK 58 Windows CMake source sync keeps refreshing its Ninja inputs. Patch
# the dependency task so it prepares the sources once and leaves them stable.
$ExpoGradleText = Get-Content -LiteralPath $ExpoCoreGradle -Raw
if (-not $ExpoGradleText.Contains('it.onlyIf { !expoModulesV2CppDir.exists() }')) {
  $Pattern = '(?s)(def unpackExpoModulesV2Cpp = tasks\.register\("unpackExpoModulesV2Cpp", Sync\) \{\r?\n\s*it\.from\(project\.provider \{ zipTree\(configurations\.expoModulesV2Cpp\.singleFile\) \}\)\r?\n\s*it\.into\(expoModulesV2CppDir\)\r?\n)\}'
  $Replacement = @'
$1  it.onlyIf { !expoModulesV2CppDir.exists() }
  it.doLast {
    [new File(expoModulesV2CppDir, "CMakeLists.txt"), new File(expoModulesV2CppDir, "expo-jsi/CMakeLists.txt")].each { cmakeFile ->
      if (cmakeFile.exists()) cmakeFile.text = cmakeFile.getText("UTF-8").replace(" CONFIGURE_DEPENDS", "")
    }
  }
}
'@
  $UpdatedExpoGradleText = [regex]::Replace($ExpoGradleText, $Pattern, $Replacement, 1)
  if ($UpdatedExpoGradleText -eq $ExpoGradleText) { throw 'Could not apply the Expo CMake source stability patch.' }
  Set-Content -LiteralPath $ExpoCoreGradle -Value $UpdatedExpoGradleText -NoNewline
}

Push-Location $AndroidRoot
try {
  # Expo Modules Core ships prebuilt native libraries for Android. Building its
  # source target separately on Windows causes an endless Ninja CMake rerun
  # because the generated ReactAndroid prefab config is a phony missing input.
  # The Gradle init script below disables only that redundant source build.
  # Build a compact ARM64 APK for modern Android phones. Build the Play Store
  # bundle separately with the default architecture list so Google Play can
  # deliver the correct native libraries to each supported device.
  & .\gradlew.bat --no-daemon --max-workers=2 -I (Join-Path $ProjectRoot 'skip-expo-native.gradle') -PreactNativeArchitectures=arm64-v8a app:assembleRelease
  if ($LASTEXITCODE -ne 0) { throw "ARM64 APK packaging failed with exit code $LASTEXITCODE" }
  $Arm64Apk = Join-Path $AndroidRoot 'app/build/outputs/apk/release/app-release.apk'
  & .\gradlew.bat --no-daemon --max-workers=2 -I (Join-Path $ProjectRoot 'skip-expo-native.gradle') app:bundleRelease
  if ($LASTEXITCODE -ne 0) { throw "Android App Bundle packaging failed with exit code $LASTEXITCODE" }
}
finally {
  Pop-Location
}

$Artifacts = if ($env:EGGTISSUE_OUTPUT_DIR) { $env:EGGTISSUE_OUTPUT_DIR } else { Join-Path $ProjectRoot 'artifacts/phone-update' }
New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null
Copy-Item $Arm64Apk (Join-Path $Artifacts 'Egg-Wet-Tissue-Challenge-Native-React-arm64.apk') -Force
Copy-Item (Join-Path $AndroidRoot 'app/build/outputs/bundle/release/app-release.aab') (Join-Path $Artifacts 'Egg-Wet-Tissue-Challenge-Native-React.aab') -Force
Write-Host "Release artifacts saved in $Artifacts"
