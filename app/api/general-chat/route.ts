import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/config/OpenAiModel";
import { currentUser } from "@clerk/nextjs/server";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const GENERAL_MEDICAL_ASSISTANT_PROMPT = `You are a helpful AI medical assistant providing general health and wellness information.

Guidelines:
- Provide accurate, evidence-based health information
- Be empathetic and supportive
- Use clear, simple language
- Ask clarifying questions when needed
- ALWAYS recommend consulting healthcare professionals for:
  * Diagnoses
  * Treatment plans
  * Prescription medications
  * Emergency symptoms
  * Serious health concerns
- Provide general wellness tips and preventive care advice
- Educate about common health conditions
- Be culturally sensitive and inclusive
- Never make definitive medical diagnoses
- Focus on health education and guidance

For urgent symptoms (chest pain, difficulty breathing, severe bleeding, etc.):
- Immediately advise seeking emergency medical care
- Provide basic first aid information if appropriate

Remember: You're an educational resource, not a replacement for professional medical care.`;

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user?.primaryEmailAddress?.emailAddress) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { message, messages = [] } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build conversation history
    const conversationHistory = messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: GENERAL_MEDICAL_ASSISTANT_PROMPT,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const assistantMessage = completion.choices[0].message.content;

    return NextResponse.json({
      message: assistantMessage,
      success: true,
    });
  } catch (error) {
    console.error('Error in general chat API:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
