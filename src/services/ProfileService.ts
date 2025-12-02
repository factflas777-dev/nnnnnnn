import { supabase } from '../lib/supabase';

export interface FaceMeta {
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export interface Profile {
  id: string;
  user_id: string;
  face_url: string | null;
  face_version: number;
  face_state: string;
  face_meta: FaceMeta;
  upload_count_today: number;
  last_upload_reset: string;
}

export async function getOrCreateProfile(username: string): Promise<Profile | null> {
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (!player) {
    const { data: newPlayer } = await supabase
      .from('players')
      .insert({ username })
      .select()
      .single();

    if (!newPlayer) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', newPlayer.id)
      .maybeSingle();

    return profile;
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', player.id)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ user_id: player.id })
      .select()
      .single();

    profile = newProfile;
  }

  return profile;
}

export async function checkUploadLimit(userId: string): Promise<{ canUpload: boolean; remaining: number }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('upload_count_today, last_upload_reset')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    return { canUpload: true, remaining: 3 };
  }

  const lastReset = new Date(profile.last_upload_reset);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    await supabase
      .from('profiles')
      .update({
        upload_count_today: 0,
        last_upload_reset: now.toISOString(),
      })
      .eq('user_id', userId);

    return { canUpload: true, remaining: 3 };
  }

  const remaining = Math.max(0, 3 - profile.upload_count_today);
  return {
    canUpload: profile.upload_count_today < 3,
    remaining,
  };
}

export async function uploadFaceImage(
  userId: string,
  file: File,
  faceMeta: FaceMeta
): Promise<{ success: boolean; error?: string; face_url?: string }> {
  try {
    const uploadLimit = await checkUploadLimit(userId);
    if (!uploadLimit.canUpload) {
      return {
        success: false,
        error: `Upload limit reached. ${uploadLimit.remaining} uploads remaining. Try again in 24 hours.`,
      };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds 5MB limit' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only JPG, PNG, and WebP allowed.' };
    }

    const uploadId = crypto.randomUUID();
    const rawPath = `user-uploads/raw/${userId}/${uploadId}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('user-faces')
      .upload(rawPath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    await supabase.from('face_upload_logs').insert({
      user_id: userId,
      upload_id: uploadId,
      raw_path: rawPath,
      outcome: 'pending',
      file_size: file.size,
      mime_type: file.type,
    });

    await supabase
      .from('profiles')
      .update({
        upload_count_today: supabase.rpc('increment', { x: 1 }),
        face_state: 'pending',
      })
      .eq('user_id', userId);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-face`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        raw_path: rawPath,
        upload_id: uploadId,
        face_meta: faceMeta,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return { success: false, error: result.error || 'Processing failed' };
    }

    return { success: true, face_url: result.face_url };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Upload failed. Please try again.' };
  }
}

export async function removeFaceImage(userId: string): Promise<boolean> {
  try {
    await supabase
      .from('profiles')
      .update({
        face_url: null,
        face_path: null,
        face_state: 'none',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return true;
  } catch (error) {
    console.error('Remove face error:', error);
    return false;
  }
}
