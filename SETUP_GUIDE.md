# Quick Setup Guide - New Features

## Step 1: Apply Database Migration

Run the following command in your terminal to update the database schema:

```bash
cd ai-medicalagent
npx drizzle-kit push
```

Or manually run the SQL migration:

```bash
# Connect to your database and run:
# migrations/add_uploaded_reports.sql
```

## Step 2: Verify Installation

All components and APIs are already integrated. The new features will be available immediately after the database migration:

### On Dashboard:

✅ "Health Trends" button - View comprehensive health analytics

### On Consultation Session Page:

✅ "Upload Lab Report" button - Upload and analyze lab reports
✅ "View Lab Reports" button - View uploaded reports with risk highlighting

### In Medical Reports:

✅ Risk assessment with color coding (green/yellow/red)
✅ Doctor-style explanations
✅ Warning signs section

## Step 3: Test the Features

### Test Lab Report Upload:

1. Start or view a consultation session
2. Click "Upload Lab Report"
3. Paste sample lab report text:

```
Complete Blood Count
Test Date: December 28, 2025

Hemoglobin: 13.5 g/dL (Normal: 12-16 g/dL)
WBC Count: 8.5 x10^3/uL (Normal: 4-11 x10^3/uL)
Platelet Count: 250 x10^3/uL (Normal: 150-400 x10^3/uL)
RBC Count: 4.8 million/uL (Normal: 4.5-5.5 million/uL)
```

4. Click "Analyze Report"
5. View the AI-generated analysis with risk levels

### Test Report Comparison:

1. Upload at least 2 lab reports (different dates)
2. Click "View Lab Reports"
3. Enable "Compare Reports"
4. Select an older report to compare
5. View trend indicators (↑/↓) showing improvement/decline

### Test Health Trends:

1. Complete at least 2-3 consultations
2. Go to Dashboard
3. Click "Health Trends"
4. View risk timeline, symptom patterns, and analytics

## What's New

### 🎨 Risk Highlighting

- **Green**: Low risk, normal values
- **Yellow**: Moderate risk, needs monitoring
- **Red**: High risk, needs immediate attention

### 👨‍⚕️ Doctor-Style Explanations

Every report now includes plain-language medical explanations like:

> "Your hemoglobin level of 13.5 g/dL is within the normal range, indicating healthy oxygen-carrying capacity in your blood. This is a good sign of adequate iron levels and normal red blood cell production."

### 📊 Trend Tracking

Compare lab reports over time with:

- Percentage change calculations
- Visual trend indicators
- Risk level progression tracking

### 📈 Health Analytics

Comprehensive dashboard showing:

- Total consultations
- Risk level timeline
- Most common symptoms
- Medication frequency
- Specialist visit breakdown

## Features Summary

| Feature             | Location          | Description                                |
| ------------------- | ----------------- | ------------------------------------------ |
| Lab Report Upload   | Session Page      | Upload and analyze lab reports with AI     |
| Lab Report Viewer   | Session Page      | View reports with risk highlighting        |
| Report Comparison   | Lab Report Viewer | Compare current vs. previous reports       |
| Health Trends       | Dashboard         | Comprehensive health analytics             |
| Risk Assessment     | All Reports       | Color-coded risk levels (green/yellow/red) |
| Doctor Explanations | All Reports       | Plain-language medical interpretations     |
| Warning Signs       | Reports           | Critical symptoms requiring attention      |

## Tips for Best Results

1. **Lab Report Upload**: Include test names, values, and reference ranges for accurate analysis
2. **Trend Tracking**: Upload reports regularly to see meaningful patterns
3. **Comparison**: Use reports from the same test type for accurate comparisons
4. **Health Trends**: Complete multiple consultations to build comprehensive analytics

## Troubleshooting

### "No reports found"

- Ensure you've uploaded at least one lab report in the session
- Check that the report upload was successful (look for success toast)

### "Unable to compare"

- Need at least 2 uploaded reports to enable comparison
- Reports should have matching test parameters for comparison

### "No consultation history"

- Complete at least one consultation with a report to see trends
- Ensure consultations are completed (not just started)

## Need Help?

- All features use existing AI models and APIs
- No additional API keys required
- Check [FEATURES_DOCUMENTATION.md](./FEATURES_DOCUMENTATION.md) for detailed technical documentation

Enjoy your enhanced AI Medical Agent! 🚀
