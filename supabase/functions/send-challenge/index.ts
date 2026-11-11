import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {serve,json,sendPush} from '../_shared/http.ts';

serve(async (request: Request) => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth = request.headers.get('Authorization') ?? '';
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);
  const { challenge_id } = await request.json();
  const { data: challenge, error } = await client.from('game_challenges').select('id,challenger_id,challenged_id,status,stake_points').eq('id', challenge_id).single();
  if (error || !challenge || challenge.challenger_id !== user.id || challenge.status !== 'pending') return json({ error: 'Challenge not found' }, 404);
  const { data: sender } = await client.from('game_profiles').select('username').eq('id', user.id).maybeSingle();
  return sendPush(challenge.challenged_id,'Egg challenge!',`${sender?.username || 'A player'} challenged you for ${challenge.stake_points} points. Match the stake to accept.`,{type:'egg_challenge',challenge_id:challenge.id});
});
