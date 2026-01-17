import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/config/OpenAiModel";

const CHAT_PROMPT = `You are a medical AI assistant helping patients understand their laboratory test results. 

You have access to the patient's lab report analysis which includes:
- Test results with values and reference ranges
- Risk levels (low/moderate/high) for each parameter
- Overall health assessment
- Clinical findings

Your role:
1. Answer questions about the lab results in clear, simple language
2. Explain what abnormal values mean and their potential implications
3. Provide reassurance when results are normal
4. Suggest when to seek medical attention
5. Be empathetic and supportive

Always maintain a professional yet caring tone. If asked about serious concerns, recommend consulting with a healthcare provider.`;

export async function POST(req: NextRequest) {
    try {
        const { reportAnalysis, messages, question } = await req.json();

        if (!reportAnalysis || !question) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Build context from report analysis
        const reportContext = `
Lab Report Analysis:
- Report Type: ${reportAnalysis.reportType || 'Medical Report'}
- Overall Risk Level: ${reportAnalysis.overallRiskLevel}
- Doctor's Explanation: ${reportAnalysis.doctorExplanation}

Test Results:
${reportAnalysis.testResults?.map((test: any) => 
    `${test.testName}: ${test.value} ${test.unit} (Normal: ${test.referenceRange}) - Risk: ${test.riskLevel}
     Explanation: ${test.explanation}`
).join('\n\n')}

Key Findings:
${reportAnalysis.keyFindings?.join('\n- ') || 'None'}

Recommendations:
${reportAnalysis.recommendations?.join('\n- ') || 'None'}
`;

        // Create chat completion
        const completion = await openai.chat.completions.create({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
                { role: 'system', content: CHAT_PROMPT },
                { role: 'system', content: `Here is the patient's lab report:\n${reportContext}` },
                ...messages.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: 'user', content: question }
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const answer = completion.choices[0].message.content;

        return NextResponse.json({
            success: true,
            answer: answer || 'I apologize, but I could not generate a response. Please try again.'
        });

    } catch (e) {
        console.error('Error in chat:', e);
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500 }
        );
    }
}
