'use client';
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  IconFlask, 
  IconAlertCircle, 
  IconChartLine,
  IconCalendar,
  IconLoader,
  IconTrendingUp,
  IconTrendingDown,
  IconCheck
} from '@tabler/icons-react';
import moment from 'moment';

type LabReport = {
  id: string;
  name: string;
  uploadedAt: string;
  analysis: {
    reportType: string;
    reportDate: string;
    testResults: Array<{
      testName: string;
      value: string;
      referenceRange: string;
      unit: string;
      riskLevel: 'low' | 'moderate' | 'high';
      explanation: string;
    }>;
    overallRiskLevel: 'low' | 'moderate' | 'high';
    doctorExplanation: string;
    keyFindings: string[];
    recommendations: string[];
    warningSignsToWatch: string[];
  };
};

type ViewLabReportsDialogProps = {
  sessionId: string;
  triggerRefresh?: number;
};

export default function ViewLabReportsDialog({ sessionId, triggerRefresh }: ViewLabReportsDialogProps) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareReport, setCompareReport] = useState<LabReport | null>(null);

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open, triggerRefresh]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/upload-lab-report?sessionId=${sessionId}`);
      if (response.data.success) {
        setReports(response.data.reports || []);
        if (response.data.reports?.length > 0) {
          setSelectedReport(response.data.reports[response.data.reports.length - 1]);
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getRiskBadgeColor = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
    }
  };

  const getRiskIcon = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low': return <IconCheck size={16} />;
      case 'moderate': return <IconAlertCircle size={16} />;
      case 'high': return <IconAlertCircle size={16} className="animate-pulse" />;
    }
  };

  const getTrendComparison = (testName: string) => {
    if (!compareReport || !selectedReport) return null;
    
    const currentTest = selectedReport.analysis.testResults.find(t => t.testName === testName);
    const previousTest = compareReport.analysis.testResults.find(t => t.testName === testName);
    
    if (!currentTest || !previousTest) return null;

    const currentVal = parseFloat(currentTest.value);
    const previousVal = parseFloat(previousTest.value);

    if (isNaN(currentVal) || isNaN(previousVal)) return null;

    const change = currentVal - previousVal;
    const percentChange = ((change / previousVal) * 100).toFixed(1);

    return {
      change,
      percentChange,
      improving: currentTest.riskLevel === 'low' || 
                (currentTest.riskLevel === 'moderate' && previousTest.riskLevel === 'high')
    };
  };

  if (!reports || reports.length === 0) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <IconFlask size={18} />
            View Lab Reports
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laboratory Reports</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <IconFlask className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground">No lab reports uploaded yet</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <IconFlask size={18} />
          View Lab Reports ({reports.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <IconFlask className="text-primary" />
            Laboratory Test Results
          </DialogTitle>
          <DialogDescription>
            AI-analyzed lab reports with risk assessment and trend tracking
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <IconLoader className="animate-spin text-primary" size={48} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Report Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Report to View</h3>
                {reports.length > 1 && (
                  <Button
                    size="sm"
                    variant={compareMode ? "default" : "outline"}
                    onClick={() => setCompareMode(!compareMode)}
                    className="gap-2"
                  >
                    <IconChartLine size={16} />
                    {compareMode ? 'Exit Compare' : 'Compare Reports'}
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      selectedReport?.id === report.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <IconCalendar size={12} />
                          {moment(report.uploadedAt).format('MMM DD, YYYY')}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRiskBadgeColor(report.analysis.overallRiskLevel)} text-white`}>
                        {report.analysis.overallRiskLevel}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Compare Report Selector */}
              {compareMode && reports.length > 1 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <label className="mb-2 block text-sm font-medium">
                    Compare with (select older report):
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {reports
                      .filter(r => r.id !== selectedReport?.id)
                      .map((report) => (
                        <button
                          key={report.id}
                          onClick={() => setCompareReport(compareReport?.id === report.id ? null : report)}
                          className={`rounded-lg border p-2 text-left text-sm transition-all ${
                            compareReport?.id === report.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-border hover:border-blue-300'
                          }`}
                        >
                          <p className="font-medium text-xs">{report.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {moment(report.uploadedAt).format('MMM DD, YYYY')}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {selectedReport && (
              <>
                {/* Overall Risk Assessment */}
                <div className={`rounded-xl border-2 p-6 ${getRiskColor(selectedReport.analysis.overallRiskLevel)}`}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-2 bg-white/50">
                      {getRiskIcon(selectedReport.analysis.overallRiskLevel)}
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 text-lg font-bold capitalize">
                        Overall Risk: {selectedReport.analysis.overallRiskLevel}
                      </h3>
                      <p className="text-sm leading-relaxed opacity-90">
                        {selectedReport.analysis.doctorExplanation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Findings */}
                {selectedReport.analysis.keyFindings?.length > 0 && (
                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="mb-3 font-semibold text-lg flex items-center gap-2">
                      <IconAlertCircle className="text-primary" />
                      Key Findings
                    </h3>
                    <ul className="space-y-2">
                      {selectedReport.analysis.keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-sm">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Test Results with Risk Levels */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="mb-4 font-semibold text-lg flex items-center gap-2">
                    <IconFlask className="text-primary" />
                    Detailed Test Results
                    {compareReport && <span className="text-sm font-normal text-muted-foreground ml-2">(with trend comparison)</span>}
                  </h3>
                  <div className="space-y-3">
                    {selectedReport.analysis.testResults.map((test, idx) => {
                      const trend = compareMode && compareReport ? getTrendComparison(test.testName) : null;
                      
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border-l-4 p-4 ${
                            test.riskLevel === 'low' ? 'border-l-green-500 bg-green-50/50' :
                            test.riskLevel === 'moderate' ? 'border-l-yellow-500 bg-yellow-50/50' :
                            'border-l-red-500 bg-red-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{test.testName}</h4>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRiskBadgeColor(test.riskLevel)} text-white`}>
                                  {test.riskLevel}
                                </span>
                                {trend && (
                                  <span className={`flex items-center gap-1 text-xs font-medium ${trend.improving ? 'text-green-600' : 'text-red-600'}`}>
                                    {trend.change > 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                                    {Math.abs(parseFloat(trend.percentChange))}%
                                  </span>
                                )}
                              </div>
                              <div className="mb-2 text-sm">
                                <span className="font-medium">Result: </span>
                                <span className="font-mono">{test.value} {test.unit}</span>
                                <span className="text-muted-foreground"> (Normal: {test.referenceRange} {test.unit})</span>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                <strong>Doctor's Explanation:</strong> {test.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommendations */}
                {selectedReport.analysis.recommendations?.length > 0 && (
                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="mb-3 font-semibold text-lg">Recommendations</h3>
                    <ul className="space-y-2">
                      {selectedReport.analysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warning Signs */}
                {selectedReport.analysis.warningSignsToWatch?.length > 0 && (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
                    <h3 className="mb-3 font-semibold text-lg text-red-700 flex items-center gap-2">
                      <IconAlertCircle />
                      Warning Signs to Watch
                    </h3>
                    <p className="mb-3 text-sm text-red-600">
                      Seek immediate medical attention if you experience:
                    </p>
                    <ul className="space-y-2">
                      {selectedReport.analysis.warningSignsToWatch.map((sign, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-600 flex-shrink-0" />
                          <span>{sign}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
