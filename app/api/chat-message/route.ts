import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/config/OpenAiModel";
import { SessionChatTable } from "@/config/schema";
import { db } from "@/config/db";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user?.primaryEmailAddress?.emailAddress) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId, message, messages = [], systemPrompt } = await req.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session details to verify ownership
    const sessionData = await db
      .select()
      .from(SessionChatTable)
      .where(eq(SessionChatTable.sessionId, sessionId))
      .limit(1);

    if (!sessionData.length) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const session = sessionData[0];

    // Verify user owns this session
    if (session.createdBy !== user.primaryEmailAddress.emailAddress) {
      return NextResponse.json(
        { error: 'Unauthorized access to session' },
        { status: 403 }
      );
    }

    // Get doctor information
    const doctorInfo = session.selectedDoctor as any;
    const doctorName = doctorInfo?.specialist || 'Medical AI Assistant';

    // Build conversation history for context
    const conversationHistory = messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Default system prompt if not provided
    const defaultSystemPrompt = `You are ${doctorName}, an AI medical assistant. You provide helpful, accurate, and empathetic medical information and guidance. 

Key guidelines:
- Be professional and compassionate
- Ask clarifying questions when needed
- Provide clear, understandable explanations
- Recommend seeing a healthcare provider for serious concerns
- Never provide diagnoses, only general medical information
- Be culturally sensitive and respectful
- Focus on patient education and wellness

Patient notes: ${session.notes || 'No specific notes provided'}

Always maintain a supportive and informative tone.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt || defaultSystemPrompt,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = completion.choices[0].message.content;

    // Update session with new conversation
    const updatedConversation = [
      ...(Array.isArray(session.conversation) ? session.conversation : []),
      {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      },
    ];

    await db
      .update(SessionChatTable)
      .set({
        conversation: updatedConversation,
      })
      .where(eq(SessionChatTable.sessionId, sessionId));

    return NextResponse.json({
      message: assistantMessage,
      success: true,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve conversation history
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user?.primaryEmailAddress?.emailAddress) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const sessionData = await db
      .select()
      .from(SessionChatTable)
      .where(eq(SessionChatTable.sessionId, sessionId))
      .limit(1);

    if (!sessionData.length) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const session = sessionData[0];

    // Verify user owns this session
    if (session.createdBy !== user.primaryEmailAddress.emailAddress) {
      return NextResponse.json(
        { error: 'Unauthorized access to session' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      conversation: session.conversation || [],
      success: true,
    });
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
