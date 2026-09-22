import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.ADMIN_PASSWORD || 'nexca2026';

    if (password === correctPassword) {
      const cookieStore = await cookies();
      cookieStore.set('nexca_admin_session', 'authenticated', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid admin password. Please try again.' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
