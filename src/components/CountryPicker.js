import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import countries from '../lib/countries.json';
import { C, Flag, s } from './ui';

export const countryName = code => countries.find(c=>c.code===code)?.name || code || 'Choose country';
export default function CountryPicker({value,onChange}) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState('');
  const matches=useMemo(()=>countries.filter(c=>c.name.toLowerCase().includes(query.trim().toLowerCase())||c.code.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>Number(b.code.toLowerCase()===query.toLowerCase())-Number(a.code.toLowerCase()===query.toLowerCase())||a.name.localeCompare(b.name)),[query]);
  return <><Text style={s.label}>Country</Text><Pressable accessibilityRole="button" accessibilityLabel="Choose country" onPress={()=>{setQuery('');setOpen(true)}} style={[s.headerRow,{backgroundColor:'#f5eafa',borderRadius:16,padding:14,borderWidth:1,borderColor:C.line}]}><Flag code={value}/><Text style={{flex:1,marginHorizontal:12,color:C.ink,fontWeight:'800'}}>{countryName(value)}</Text><Text style={{color:C.ink}}>⌄</Text></Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}><SafeAreaView style={{flex:1,backgroundColor:C.pale,padding:20}}><View style={s.headerRow}><Text style={s.title}>Choose country</Text><Pressable onPress={()=>setOpen(false)} accessibilityLabel="Close countries"><Text style={{fontSize:28,color:C.ink}}>×</Text></Pressable></View><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Country name or code, e.g. South Africa or ZA" placeholderTextColor={C.muted} style={[s.input,{marginVertical:16}]} autoCapitalize="none" autoCorrect={false}/><FlatList data={matches} keyExtractor={c=>c.code} keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={s.muted}>No matching country.</Text>} renderItem={({item})=><Pressable onPress={()=>{onChange(item.code);setOpen(false)}} style={[s.row,{padding:14,borderRadius:14,marginBottom:5,backgroundColor:value===item.code?'#eadcf8':'#fffaf0'}]}><Flag code={item.code}/><Text style={{flex:1,color:C.ink,fontWeight:'700'}}>{item.name}</Text><Text style={{color:C.ink,fontWeight:'800'}}>{value===item.code?'✓':item.code}</Text></Pressable>}/></SafeAreaView></Modal>
  </>;
}
