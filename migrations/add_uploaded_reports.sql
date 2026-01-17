-- Migration: Add uploadedReports column to SessionChatTable
-- This column stores uploaded lab reports with AI analysis and risk assessments

ALTER TABLE "sessionChatTable"
ADD COLUMN IF NOT EXISTS "uploadedReports" json;

-- Add comment explaining the column
COMMENT ON COLUMN "sessionChatTable"."uploadedReports" IS 'Stores uploaded laboratory reports with AI analysis, risk levels, and doctor-style explanations';