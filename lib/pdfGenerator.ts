import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sessionDetail } from '@/app/(routes)/dashboard/medical-agent/[sessionId]/page';
import moment from 'moment';

export const generatePDFReport = (sessionDetail: sessionDetail) => {
  const doc = new jsPDF();
  const reportData = sessionDetail.report as any;
  
  // Header with logo placeholder
  doc.setFillColor(79, 70, 229); // Primary color
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('EchoDoc AI', 20, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Medical Consultation Report', 20, 30);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Consultation Details
  let yPosition = 50;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Consultation Information', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const consultationInfo = [
    ['Specialist', sessionDetail.selectedDoctor.specialist],
    ['Date & Time', moment(new Date(sessionDetail.createdOn)).format('MMM DD, YYYY [at] h:mm A')],
    ['Session ID', sessionDetail.sessionId],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: consultationInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Chief Complaint
  if (reportData?.chiefComplaint || sessionDetail.notes) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Chief Complaint', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const complaint = doc.splitTextToSize(
      reportData?.chiefComplaint || sessionDetail.notes || 'No details provided',
      170
    );
    doc.text(complaint, 20, yPosition);
    yPosition += (complaint.length * 5) + 10;
  }
  
  // Summary
  if (reportData?.summary) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summary = doc.splitTextToSize(reportData.summary, 170);
    doc.text(summary, 20, yPosition);
    yPosition += (summary.length * 5) + 10;
  }
  
  // Symptoms
  if (reportData?.symptoms && reportData.symptoms.length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Symptoms', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    reportData.symptoms.forEach((symptom: string, idx: number) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`• ${symptom}`, 25, yPosition);
      yPosition += 6;
    });
    yPosition += 5;
  }
  
  // Duration & Severity
  if (reportData?.duration || reportData?.severity) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    const details = [];
    if (reportData?.duration) details.push(['Duration', reportData.duration]);
    if (reportData?.severity) details.push(['Severity', reportData.severity]);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Details', 20, yPosition);
    yPosition += 5;
    
    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: details,
      theme: 'striped',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Recommendations
  if (reportData?.recommendations && reportData.recommendations.length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    reportData.recommendations.forEach((rec: string, idx: number) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      const lines = doc.splitTextToSize(`• ${rec}`, 165);
      doc.text(lines, 25, yPosition);
      yPosition += (lines.length * 5) + 2;
    });
    yPosition += 5;
  }
  
  // Medications
  if (reportData?.medicationsMentioned && reportData.medicationsMentioned.length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Medications Mentioned', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    reportData.medicationsMentioned.forEach((med: string) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`• ${med}`, 25, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }
  
  // Disclaimer
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFillColor(255, 243, 205);
  doc.rect(15, yPosition - 5, 180, 30, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('⚠️ MEDICAL DISCLAIMER', 20, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  const disclaimer = doc.splitTextToSize(
    'This is an AI-generated report for informational purposes only. Always consult with a qualified healthcare professional for medical advice, diagnosis, and treatment. This report should not be used as a substitute for professional medical care.',
    170
  );
  doc.text(disclaimer, 20, yPosition);
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by EchoDoc AI',
      20,
      doc.internal.pageSize.getHeight() - 10
    );
  }
  
  // Generate filename
  const filename = `EchoDocAI_Report_${sessionDetail.selectedDoctor.specialist.replace(/\s+/g, '_')}_${moment(sessionDetail.createdOn).format('YYYY-MM-DD')}.pdf`;
  
  // Save PDF
  doc.save(filename);
};
