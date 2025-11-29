import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

// Hardcoded admin email - only this email can access admin panel
const ADMIN_EMAIL = 'shivanshuk186@gmail.com';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Check if user email matches admin email
    const isAdmin = userEmail === ADMIN_EMAIL;

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
