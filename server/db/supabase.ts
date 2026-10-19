import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xbagfykmyyqvovcktczv.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('organizations').select('id').limit(1);
    if (error) {
      console.warn('[Supabase] Warning reading organizations:', error.message);
      return false;
    }
    console.log('[Supabase] Successfully connected to live database!');
    return true;
  } catch (err) {
    console.warn('[Supabase] Connection error:', err);
    return false;
  }
}
