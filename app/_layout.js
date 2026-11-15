import React, { useEffect } from 'react';
import { AppState } from "react-native";
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { GameSettingsProvider } from '../src/context/GameSettingsContext';
import { ProfileProvider } from '../src/context/ProfileContext';
import { StatusBar } from 'expo-status-bar';
import { initializeNotifications, requestNotificationsIfNeeded } from '../src/lib/notifications';

export default function Layout(){ useEffect(()=>{initializeNotifications();let timer;const schedule=state=>{clearTimeout(timer);if(state==="active")timer=setTimeout(()=>void requestNotificationsIfNeeded().catch(()=>{}),1100);};const listener=AppState.addEventListener("change",schedule);schedule(AppState.currentState);return()=>{clearTimeout(timer);listener.remove();};},[]); return <AuthProvider><ProfileProvider><GameSettingsProvider><StatusBar style="dark"/><Stack id="root-stack" screenOptions={{headerShown:false,animation:'fade'}}/></GameSettingsProvider></ProfileProvider></AuthProvider>; }
