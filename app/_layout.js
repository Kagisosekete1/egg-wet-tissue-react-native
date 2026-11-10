import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { GameSettingsProvider } from '../src/context/GameSettingsContext';
import { ProfileProvider } from '../src/context/ProfileContext';
import { StatusBar } from 'expo-status-bar';
import { initializeNotifications } from '../src/lib/notifications';

export default function Layout(){ useEffect(()=>{initializeNotifications();},[]); return <AuthProvider><ProfileProvider><GameSettingsProvider><StatusBar style="dark"/><Stack id="root-stack" screenOptions={{headerShown:false,animation:'fade'}}/></GameSettingsProvider></ProfileProvider></AuthProvider>; }
