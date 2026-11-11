import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {serve,json,sendPush} from '../_shared/http.ts';

serve(async (request: Request) => {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const auth = request.headers.get('Authorization') ?? '';
  if (!url || !anon) return json({ error: 'Server configuration is missing.' }, 500);
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);
  const { event, challenge_id, battle_id } = await request.json();
  let recipientId: string | null = null;
  let title = 'Egg & Tissue battle';
  let message = '';
  let destinationBattleId = battle_id;

  if (event === 'accepted' && challenge_id) {
    const { data: challenge, error } = await client.from('game_challenges').select('id,challenger_id,challenged_id,status,battle_id').eq('id', challenge_id).single();
    if (error || !challenge || challenge.challenged_id !== user.id || challenge.status !== 'accepted' || !challenge.battle_id) return json({ error: 'Battle acceptance not found.' }, 404);
    recipientId = challenge.challenger_id;
    destinationBattleId = challenge.battle_id;
    message = 'Your opponent accepted. The point-stake battle is ready.';
  } else if (event === 'battle' && battle_id) {
    const { data: battle, error } = await client.from('game_battles').select('id,player_one,player_two,current_player,phase,winner_id').eq('id', battle_id).single();
    if (error || !battle || ![battle.player_one, battle.player_two].includes(user.id)) return json({ error: 'Battle not found.' }, 404);
    recipientId = user.id === battle.player_one ? battle.player_two : battle.player_one;
    if (battle.phase === 'over') {
      title = 'Battle finished';
      message = 'Your point-stake battle has ended. Tap to see the result.';
    } else {
      if (battle.current_player === user.id || battle.phase !== 'ready') return json({ skipped: true,delivered:false });
      title = 'Your turn!';
      message = 'Your opponent finished their move. Tap to continue the battle.';
    }
  } else {
    return json({ error: 'Unsupported battle update.' }, 400);
  }

  return sendPush(recipientId!,title,message,{type:'egg_battle_turn',battle_id:destinationBattleId});
});
