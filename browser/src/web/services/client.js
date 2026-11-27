import {createClient} from '@supabase/supabase-js';
export const SUPABASE_URL='https://glnkdakwkhaeywpvqvae.supabase.co';
export const SUPABASE_PUBLIC_KEY='sb_publishable_6IcnwRXnNlUMWupWrRDzag_5d5JJ0RJ';
export const WEB_REDIRECT_URL='https://egg-tissue-cartoon-play.seketefilmstv.chatgpt.site/online#/settings';
export const IS_NATIVE_APP=Boolean(window.ReactNativeWebView)||new URLSearchParams(location.search).get('native')==='1';
// The native app passes its SecureStore session through the bridge. Avoid a
// second WebView-local session that could silently reopen another account.
// In the Android WebView the React Native Supabase client owns refresh-token
// rotation. A second client refreshing the same rotating token can invalidate
// the native session and make the game appear to log the player out.
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{autoRefreshToken:!IS_NATIVE_APP,persistSession:!IS_NATIVE_APP,detectSessionInUrl:!IS_NATIVE_APP}});
export const nativeAction=(type,extra={})=>window.ReactNativeWebView?.postMessage(JSON.stringify({type,...extra}));
