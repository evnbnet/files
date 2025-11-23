import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Check authentication
  const session = cookies.get('admin-session');
  if (!session || session.value !== 'authenticated') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const videoName = formData.get('videoName')?.toString();
    const videoFile = formData.get('videoFile') as File;

    if (!videoName || !videoFile) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique ID
    const videoId = crypto.randomUUID();
    const fileExt = videoFile.name.split('.').pop();
    const fileName = `${videoId}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('video')
      .upload(fileName, videoFile, {
        contentType: videoFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video')
      .getPublicUrl(fileName);

    // Save metadata to database
    const { error: dbError } = await supabase
      .from('videos')
      .insert({
        id: videoId,
        name: videoName,
        file_name: fileName,
        file_url: urlData.publicUrl,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to delete uploaded file
      await supabase.storage.from('video').remove([fileName]);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      id: videoId,
      url: `${new URL(request.url).origin}/v/${videoId}`
    }), {
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
