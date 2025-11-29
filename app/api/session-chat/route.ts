import { db } from "@/config/db";
import { SessionChatTable, usersTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const { notes, selectedDoctor } = await req.json();
  const user = await currentUser();

  if (!user?.primaryEmailAddress?.emailAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userEmail = user.primaryEmailAddress.emailAddress;
    
    // Get user details
    const userDetails = await db.select().from(usersTable)
      .where(eq(usersTable.email, userEmail))
      .limit(1);
    
    const currentUser = userDetails[0];
    
    // Check if user is premium
    if (!currentUser?.isPremium) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const resetDate = currentUser?.consultationsResetDate ? new Date(currentUser.consultationsResetDate) : null;
      
      // Reset counter if new month
      if (!resetDate || resetDate.getMonth() !== currentMonth || resetDate.getFullYear() !== currentYear) {
        await db.update(usersTable)
          .set({ 
            monthlyConsultations: 0,
            consultationsResetDate: now.toISOString()
          })
          .where(eq(usersTable.email, userEmail));
      }
      
      // Get updated consultation count
      const updatedUser = await db.select().from(usersTable)
        .where(eq(usersTable.email, userEmail))
        .limit(1);
      
      const consultationCount = updatedUser[0]?.monthlyConsultations || 0;
      
      // Check limit (5 consultations for free users)
      if (consultationCount >= 5) {
        return NextResponse.json({ 
          error: 'LIMIT_REACHED',
          message: 'You have reached your monthly limit of 5 consultations. Upgrade to Premium for unlimited access!',
          limit: 5,
          used: consultationCount
        }, { status: 403 });
      }
      
      // Increment consultation count
      await db.update(usersTable)
        .set({ monthlyConsultations: consultationCount + 1 })
        .where(eq(usersTable.email, userEmail));
    }
    
    const sessionId = uuidv4();

    const result = await db.insert(SessionChatTable).values({
      sessionId,
      createdBy: userEmail,
      notes,
      selectedDoctor,
      createdOn: new Date().toString()
    }).returning(); 

    console.log("Inserted session:", result); 

    return NextResponse.json(result[0]); 
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMessage });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const user = await currentUser();
  
  if (!user?.primaryEmailAddress?.emailAddress) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const userEmail = user.primaryEmailAddress.emailAddress;

    if (sessionId === 'all' || !sessionId) {
      const result = await db.select().from(SessionChatTable)
        .where(eq(SessionChatTable.createdBy, userEmail))
        .orderBy(desc(SessionChatTable.id));

      return NextResponse.json(result);
    } else {
      const result = await db.select().from(SessionChatTable)
        .where(eq(SessionChatTable.sessionId, sessionId));

      return NextResponse.json(result[0] || null);
    }
  } catch (e) {
    console.error('Error in GET /api/session-chat:', e);
    return NextResponse.json(
      { error: 'Failed to fetch session data' },
      { status: 500 }
    );
  }
}