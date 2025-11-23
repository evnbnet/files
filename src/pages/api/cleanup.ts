import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async () => {
  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get old videos
    const { data: oldVideos, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Fetch failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!oldVideos || oldVideos.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No videos to delete',
        deleted: 0 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let deletedCount = 0;
    const errors: any[] = [];

    // Delete each video
    for (const video of oldVideos) {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('video')
          .remove([video.file_name]);

        if (storageError) {
          console.error(`Storage error for ${video.id}:`, storageError);
          errors.push({ id: video.id, error: storageError });
          continue;
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from('videos')
          .delete()
          .eq('id', video.id);

        if (dbError) {
          console.error(`Database error for ${video.id}:`, dbError);
          errors.push({ id: video.id, error: dbError });
          continue;
        }

        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${video.id}:`, error);
        errors.push({ id: video.id, error });
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Cleanup completed',
      deleted: deletedCount,
      total: oldVideos.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
