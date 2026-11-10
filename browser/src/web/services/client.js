import {createClient} from '@supabase/supabase-js';
export const supabase=createClient('https://glnkdakwkhaeywpvqvae.supabase.co','sb_publishable_6IcnwRXnNlUMWupWrRDzag_5d5JJ0RJ',{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
export const nativeAction=(type,extra={})=>window.ReactNativeWebView?.postMessage(JSON.stringify({type,...extra}));
