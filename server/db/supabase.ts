import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xbagfykmyyqvovcktczv.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWdmeWtteXlxdm92Y2t0Y3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTc5ODYsImV4cCI6MjEwNzk5Mzk4Nn0.pcBbx6dJvIyOXnxsnQSbzORN1z0V_L1HNFqDoLRqICE';

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
