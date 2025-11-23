import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  // Check authentication
  const session = cookies.get('admin-session');
  if (!session || session.value !== 'authenticated') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get video info
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('file_name')
      .eq('id', id)
      .single();

    if (fetchError || !video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('video')
      .remove([video.file_name]);

    if (storageError) {
      console.error('Storage error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Delete failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
