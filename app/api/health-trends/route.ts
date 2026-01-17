import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { SessionChatTable } from "@/config/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userEmail = searchParams.get('userEmail');

        if (!userEmail) {
            return NextResponse.json(
                { error: 'userEmail is required' },
                { status: 400 }
            );
        }

        // Fetch all sessions for the user with reports
        const sessions = await db.select()
            .from(SessionChatTable)
            .where(eq(SessionChatTable.createdBy, userEmail))
            .orderBy(SessionChatTable.createdOn);

        // Filter sessions that have reports
        const sessionsWithReports = sessions.filter(session => session.report);

        // Extract trends data
        const trendsData = sessionsWithReports.map(session => {
            const report = session.report as any;
            return {
                sessionId: session.sessionId,
                date: session.createdOn,
                specialist: (session.selectedDoctor as any)?.specialist || 'Unknown',
                chiefComplaint: report?.chiefComplaint || session.notes,
                severity: report?.severity,
                riskLevel: report?.riskLevel,
                symptoms: report?.symptoms || [],
                medications: report?.medicationsMentioned || [],
            };
        });

        // Analyze trends
        const analysis = {
            totalConsultations: trendsData.length,
            symptomFrequency: getSymptomFrequency(trendsData),
            riskTrend: getRiskTrend(trendsData),
            severityTrend: getSeverityTrend(trendsData),
            commonMedications: getMedicationFrequency(trendsData),
            specialistVisits: getSpecialistFrequency(trendsData),
        };

        return NextResponse.json({
            success: true,
            trends: trendsData,
            analysis
        });

    } catch (e) {
        console.error('Error fetching health trends:', e);
        return NextResponse.json(
            { error: 'Failed to fetch health trends' },
            { status: 500 }
        );
    }
}

function getSymptomFrequency(data: any[]) {
    const frequency: Record<string, number> = {};
    data.forEach(session => {
        session.symptoms?.forEach((symptom: string) => {
            frequency[symptom] = (frequency[symptom] || 0) + 1;
        });
    });
    return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([symptom, count]) => ({ symptom, count }));
}

function getRiskTrend(data: any[]) {
    return data.map(session => ({
        date: session.date,
        riskLevel: session.riskLevel || 'unknown'
    }));
}

function getSeverityTrend(data: any[]) {
    return data.map(session => ({
        date: session.date,
        severity: session.severity || 'unknown'
    }));
}

function getMedicationFrequency(data: any[]) {
    const frequency: Record<string, number> = {};
    data.forEach(session => {
        session.medications?.forEach((med: string) => {
            frequency[med] = (frequency[med] || 0) + 1;
        });
    });
    return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([medication, count]) => ({ medication, count }));
}

function getSpecialistFrequency(data: any[]) {
    const frequency: Record<string, number> = {};
    data.forEach(session => {
        frequency[session.specialist] = (frequency[session.specialist] || 0) + 1;
    });
    return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .map(([specialist, count]) => ({ specialist, count }));
}
