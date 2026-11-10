import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { C } from '../src/components/ui';

export default function Index(){ const {loading}=useAuth(); if(!loading)return <Redirect href="/(tabs)"/>; return <View style={{flex:1,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',gap:18}}><Image source={require('../assets/app-logo.png')} style={{width:170,height:170,borderRadius:38}}/><Text style={{fontSize:26,fontWeight:'900',color:'white'}}>Egg & Wet Tissue</Text><ActivityIndicator color="white" size="large"/></View>; }
