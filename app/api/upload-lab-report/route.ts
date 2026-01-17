import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/config/OpenAiModel";
import { SessionChatTable } from "@/config/schema";
import { db } from "@/config/db";
import { eq } from "drizzle-orm";

const LAB_REPORT_ANALYSIS_PROMPT = `You are a medical AI assistant analyzing laboratory test results or medical reports from images/PDFs or text.

Extract and analyze ALL visible information including:
1. Report type (CBC, Lipid Panel, ECG, Ultrasound, X-Ray, Blood Sugar, Liver Function, Kidney Function, etc.)
2. All test parameters with values, units, and reference ranges
3. Patient information (if visible - name, age, date)
4. Report date
5. Any doctor's notes or observations

For EACH test parameter provide:
- Test Name
- Result Value
- Reference Range (Normal Range)
- Unit of Measurement
- Risk Level: "low" (green - within normal), "moderate" (yellow - slightly abnormal), "high" (red - significantly abnormal)
- Clinical Significance: Doctor-style explanation in 1-2 sentences

Provide comprehensive analysis with:
- Overall Risk Level (low/moderate/high)
- Doctor's Explanation: 3-4 sentences in plain, empathetic language
- Key Findings: Most important observations
- Recommendations: What patient should do next
- Warning Signs: Symptoms requiring immediate medical attention

For imaging reports (Echo, X-Ray, Ultrasound):
- Extract findings, impressions, and measurements
- Explain what structures were examined
- Note any abnormalities or concerns
- Provide context in simple terms

Return JSON format:
{
  "reportType": "string",
  "reportDate": "ISO Date string",
  "patientInfo": {
    "name": "string (if visible)",
    "age": "string (if visible)"
  },
  "testResults": [
    {
      "testName": "string",
      "value": "string",
      "referenceRange": "string",
      "unit": "string",
      "riskLevel": "low" | "moderate" | "high",
      "explanation": "doctor-style explanation"
    }
  ],
  "overallRiskLevel": "low" | "moderate" | "high",
  "doctorExplanation": "comprehensive explanation in plain language",
  "keyFindings": ["finding1", "finding2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "warningSignsToWatch": ["sign1", "sign2"]
}

Only return valid JSON, nothing else.`;

export async function POST(req: NextRequest) {
    try {
        const { sessionId, reportText, reportName, fileData, fileType } = await req.json();

        console.log('Upload Lab Report API called:', { sessionId, reportName, hasFileData: !!fileData, hasText: !!reportText, fileType });

        if (!sessionId || (!reportText && !fileData)) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        let analysisResult;

        // Handle file upload (image or PDF)
        if (fileData) {
            if (fileType.startsWith('image/')) {
                // Use Gemini 2.5 Flash for images
                console.log('Using Gemini 2.5 Flash for image analysis...');
                const completion = await openai.chat.completions.create({
                    model: 'google/gemini-2.5-flash-lite', // Gemini 2.5 Flash
                    messages: [
                        { 
                            role: 'system', 
                            content: LAB_REPORT_ANALYSIS_PROMPT 
                        },
                        {
                            role: 'user',
                            content: [
                                { 
                                    type: 'text', 
                                    text: 'Please analyze this medical report image and provide a comprehensive analysis:' 
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: fileData
                                    }
                                }
                            ]
                        }
                    ],
                });

                const rawResp = completion.choices[0].message.content;
                if (!rawResp) {
                    throw new Error('No content in AI response');
                }

                const cleanResp = rawResp.trim().replace(/```json/g, '').replace(/```/g, '');
                analysisResult = JSON.parse(cleanResp);
            } else if (fileType === 'application/pdf') {
                // For PDF files, suggest converting to image for best results
                console.log('PDF detected - using Gemini 2.0 Flash Exp...');
                try {
                    // Try using vision model on PDF (some models can handle it)
                    const completion = await openai.chat.completions.create({
                        model: 'google/gemini-2.0-flash-exp:free',
                        messages: [
                            { 
                                role: 'system', 
                                content: LAB_REPORT_ANALYSIS_PROMPT 
                            },
                            {
                                role: 'user',
                                content: [
                                    { 
                                        type: 'text', 
                                        text: 'Please analyze this medical report PDF and extract all information. Provide a comprehensive analysis:' 
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: fileData
                                        }
                                    }
                                ]
                            }
                        ],
                    });

                    const rawResp = completion.choices[0].message.content;
                    if (!rawResp) {
                        throw new Error('No content in AI response');
                    }

                    const cleanResp = rawResp.trim().replace(/```json/g, '').replace(/```/g, '');
                    analysisResult = JSON.parse(cleanResp);
                } catch (pdfError) {
                    console.error('PDF processing error:', pdfError);
                    return NextResponse.json(
                        { error: 'Unable to process PDF. Please convert to an image (JPEG/PNG) or take a screenshot for best results.' },
                        { status: 400 }
                    );
                }
            }
        } else {
            // Handle text input
            const completion = await openai.chat.completions.create({
                model: 'google/gemini-2.5-flash-lite',
                messages: [
                    { role: 'system', content: LAB_REPORT_ANALYSIS_PROMPT },
                    { role: 'user', content: `Analyze this laboratory report:\n\n${reportText}` },
                ],
            });

            const rawResp = completion.choices[0].message.content;
            if (!rawResp) {
                throw new Error('No content in AI response');
            }

            const cleanResp = rawResp.trim().replace(/```json/g, '').replace(/```/g, '');
            analysisResult = JSON.parse(cleanResp);
        }

        // Get existing session data
        let sessionData;
        
        // Handle special case for dashboard uploads (create temporary session or use general storage)
        if (sessionId === 'dashboard') {
            // For dashboard uploads, we'll create a general storage entry
            // You might want to link this to user ID in a production app
            sessionData = [{
                sessionId: 'dashboard',
                uploadedReports: []
            }];
        } else {
            sessionData = await db.select()
                .from(SessionChatTable)
                .where(eq(SessionChatTable.sessionId, sessionId))
                .limit(1);

            if (!sessionData || sessionData.length === 0) {
                return NextResponse.json(
                    { error: 'Session not found. Please start a consultation first.' },
                    { status: 404 }
                );
            }
        }

        // Get existing uploaded reports or initialize empty array
        const existingReports = sessionData[0].uploadedReports as any[] || [];

        // Add new report with timestamp
        const newReport = {
            id: Date.now().toString(),
            name: reportName || 'Medical Report',
            uploadedAt: new Date().toISOString(),
            analysis: analysisResult,
            rawText: reportText || 'Image-based report',
            fileType: fileType || 'text'
        };

        existingReports.push(newReport);

        // Update session with new report (skip for dashboard pseudo-sessions)
        if (sessionId !== 'dashboard') {
            await db.update(SessionChatTable)
                .set({ uploadedReports: existingReports })
                .where(eq(SessionChatTable.sessionId, sessionId));
        }

        console.log('Report analyzed successfully:', { reportId: newReport.id, reportType: analysisResult.reportType });

        return NextResponse.json({
            success: true,
            analysis: analysisResult,
            reportId: newReport.id
        });

    } catch (e) {
        console.error('Error analyzing lab report:', e);
        return NextResponse.json(
            { error: 'Failed to analyze lab report', details: e instanceof Error ? e.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve uploaded reports for a session
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'sessionId is required' },
                { status: 400 }
            );
        }

        const sessionData = await db.select()
            .from(SessionChatTable)
            .where(eq(SessionChatTable.sessionId, sessionId))
            .limit(1);

        if (!sessionData || sessionData.length === 0) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        const uploadedReports = sessionData[0].uploadedReports || [];

        return NextResponse.json({
            success: true,
            reports: uploadedReports
        });

    } catch (e) {
        console.error('Error fetching uploaded reports:', e);
        return NextResponse.json(
            { error: 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}
