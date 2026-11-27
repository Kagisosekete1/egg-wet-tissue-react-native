// Production builds use the configured AdMob unit by default. Set
// EXPO_PUBLIC_ADMOB_TEST_ADS=1 only for a diagnostic/test build.
export const USE_TEST_ADS = process.env.EXPO_PUBLIC_ADMOB_TEST_ADS === '1';
export const REAL_MONEY_PURCHASES_ENABLED = false;
export const SHOW_REAL_MONEY_SHOP = false;
export const SHOW_PAID_REWARD_CARDS = true;

// Planning only. These products are intentionally not imported by the UI and
// no billing SDK is initialized in this version.
export const FUTURE_SHIELD_PRODUCTS = Object.freeze([
  { id: 'shield_basic_pack', name: 'Bubble Shield Pack', suggestedUsd: 0.49 },
  { id: 'shield_golden_pack', name: 'Golden Shield Pack', suggestedUsd: 0.99 },
  { id: 'shield_super_pack', name: 'Rainbow Shield Pack', suggestedUsd: 1.99 },
  { id: 'shield_bundle', name: 'Shield Bundle', suggestedUsd: 2.99 },
]);
