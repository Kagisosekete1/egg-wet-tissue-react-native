import {setInboxUser} from '../lib/inbox';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OneSignal } from 'react-native-onesignal';
import { initializeNotifications } from '../lib/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Let getSession() finish reading AsyncStorage before treating an empty
      // initial event as a signed-out account. This avoids a cold-start race
      // briefly sending returning players to the sign-in screen.
      if (_event === 'INITIAL_SESSION' && !nextSession) return;
      authEventReceived = true;
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (!authEventReceived) {
        if (error) console.warn('Could not restore the saved sign-in session:', error.message);
        setSession(error ? null : data.session);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        if (!authEventReceived) {
          setSession(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      // Initialize before calling login/logout: provider effects can run before
      // the root layout's notification effect on a cold launch.
      setInboxUser(session?.user?.id);
      initializeNotifications();
      if (session?.user?.id) OneSignal.login(session.user.id);
      else OneSignal.logout();
    } catch (error) {
      // Push identity is optional and must not prevent sign-in or gameplay.
      console.warn('Could not sync the OneSignal user; continuing without push identity.', error);
    }
  }, [session?.user?.id]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signOut: () => supabase.auth.signOut(),
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
