import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const password = params.get('password');
    const adminPassword = import.meta.env.ADMIN_PASSWORD;

    console.log('Password received:', password);
    console.log('Admin password:', adminPassword);
    console.log('Match:', password === adminPassword);

    if (password && password === adminPassword) {
      // Set session cookie
      cookies.set('admin-session', 'authenticated', {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax'
      });
      
      return redirect('/');
    }

    return redirect('/login?error=invalid');
  } catch (error) {
    console.error('Login error:', error);
    return redirect('/login?error=invalid');
  }
};
