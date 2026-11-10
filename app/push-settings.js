import React from 'react';
import {Header,Screen,Card,Title,s} from '../src/components/ui';
import {Text} from 'react-native';
import {NotificationSettings} from '../src/components/NotificationSettings';
export default function PushSettings(){return <Screen><Header title="Phone notifications"/><Card><Title small>Your egg, your choice</Title><Text style={s.muted}>Enable challenge and game notifications on this phone.</Text></Card><NotificationSettings/></Screen>;}
