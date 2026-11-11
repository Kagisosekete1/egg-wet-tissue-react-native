import {createClient} from '@supabase/supabase-js';
export const SUPABASE_URL='https://glnkdakwkhaeywpvqvae.supabase.co';
export const SUPABASE_PUBLIC_KEY='sb_publishable_6IcnwRXnNlUMWupWrRDzag_5d5JJ0RJ';
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
export const nativeAction=(type,extra={})=>window.ReactNativeWebView?.postMessage(JSON.stringify({type,...extra}));
