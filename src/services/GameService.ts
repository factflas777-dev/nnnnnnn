import { supabase } from '../lib/supabase';
import { PlayerStats } from '../types/game';

export async function savePlayerProgress(
  username: string,
  stats: PlayerStats,
  xpGained: number
) {
  const { data: existingPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (existingPlayer) {
    const newXP = existingPlayer.total_xp + xpGained;
    const newLevel = Math.floor(newXP / 1000) + 1;

    await supabase
      .from('players')
      .update({
        total_xp: newXP,
        level: newLevel,
        high_score: Math.max(existingPlayer.high_score, stats.score),
        total_kills: existingPlayer.total_kills + stats.kills,
        total_deaths: existingPlayer.total_deaths + 1,
        total_mass_eaten: existingPlayer.total_mass_eaten + stats.mass,
        last_login: new Date().toISOString()
      })
      .eq('id', existingPlayer.id);
  } else {
    const newLevel = Math.floor(xpGained / 1000) + 1;

    await supabase
      .from('players')
      .insert({
        username,
        total_xp: xpGained,
        level: newLevel,
        high_score: stats.score,
        total_kills: stats.kills,
        total_deaths: 1,
        total_mass_eaten: stats.mass
      });
  }

  await supabase
    .from('leaderboard')
    .insert({
      username,
      score: stats.score,
      mass: stats.mass,
      kills: stats.kills,
      time_alive: stats.timeAlive
    });
}

export async function getPlayerData(username: string) {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  return data;
}

export async function getTopScores(limit: number = 100) {
  const { data } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function checkDailyReward(username: string) {
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (!player) return null;

  const { data: reward } = await supabase
    .from('daily_rewards')
    .select('*')
    .eq('player_id', player.id)
    .maybeSingle();

  if (!reward) return null;

  const lastClaimed = new Date(reward.last_claimed);
  const now = new Date();
  const hoursSince = (now.getTime() - lastClaimed.getTime()) / (1000 * 60 * 60);

  if (hoursSince >= 24) {
    return {
      canClaim: true,
      streak: hoursSince < 48 ? reward.streak + 1 : 1
    };
  }

  return { canClaim: false, streak: reward.streak };
}

export async function claimDailyReward(username: string) {
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (!player) return;

  const rewardCheck = await checkDailyReward(username);
  if (!rewardCheck?.canClaim) return;

  await supabase
    .from('daily_rewards')
    .upsert({
      player_id: player.id,
      last_claimed: new Date().toISOString(),
      streak: rewardCheck.streak
    });

  const xpReward = 100 * rewardCheck.streak;

  await supabase
    .from('players')
    .update({
      total_xp: player.id
    })
    .eq('id', player.id);

  return { xp: xpReward, streak: rewardCheck.streak };
}
