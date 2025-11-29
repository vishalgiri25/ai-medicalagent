import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { PaymentTable, usersTable } from '@/config/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const clerkUser = await currentUser();

    if (!userId || !clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId, amount } = await req.json();

    if (!transactionId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user email from Clerk
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }

    // Check if user exists in database
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, userEmail))
      .limit(1);

    if (!user || user.length === 0) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Check if transaction ID already exists
    const existingPayment = await db
      .select()
      .from(PaymentTable)
      .where(eq(PaymentTable.transactionId, transactionId))
      .limit(1);

    if (existingPayment && existingPayment.length > 0) {
      return NextResponse.json(
        { error: 'This transaction ID has already been submitted' },
        { status: 400 }
      );
    }

    // Insert payment record
    const result = await db.insert(PaymentTable).values({
      transactionId,
      userEmail,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Payment submitted successfully',
      paymentId: result[0].id,
    });
  } catch (error) {
    console.error('Error submitting payment:', error);
    return NextResponse.json(
      { error: 'Failed to submit payment' },
      { status: 500 }
    );
  }
}
