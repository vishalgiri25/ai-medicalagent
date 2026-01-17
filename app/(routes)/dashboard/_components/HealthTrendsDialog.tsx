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
  IconChartLine, 
  IconTrendingUp,
  IconTrendingDown,
  IconLoader,
  IconCalendar,
  IconPill,
  IconActivity
} from '@tabler/icons-react';
import { useUser } from '@clerk/nextjs';
import moment from 'moment';

type TrendSession = {
  sessionId: string;
  date: string;
  specialist: string;
  chiefComplaint: string;
  severity: string;
  riskLevel: 'low' | 'moderate' | 'high';
  symptoms: string[];
  medications: string[];
};

type TrendsAnalysis = {
  totalConsultations: number;
  symptomFrequency: Array<{ symptom: string; count: number }>;
  riskTrend: Array<{ date: string; riskLevel: string }>;
  severityTrend: Array<{ date: string; severity: string }>;
  commonMedications: Array<{ medication: string; count: number }>;
  specialistVisits: Array<{ specialist: string; count: number }>;
};

export default function HealthTrendsDialog() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<TrendSession[]>([]);
  const [analysis, setAnalysis] = useState<TrendsAnalysis | null>(null);

  useEffect(() => {
    if (open && user?.primaryEmailAddress?.emailAddress) {
      fetchTrends();
    }
  }, [open, user]);

  const fetchTrends = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/health-trends?userEmail=${user.primaryEmailAddress.emailAddress}`);
      if (response.data.success) {
        setTrends(response.data.trends);
        setAnalysis(response.data.analysis);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast.error('Failed to load health trends');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const calculateRiskImprovement = () => {
    if (!analysis || analysis.riskTrend.length < 2) return null;
    
    const recent = analysis.riskTrend.slice(-3);
    const highCount = recent.filter(r => r.riskLevel === 'high').length;
    const lowCount = recent.filter(r => r.riskLevel === 'low').length;
    
    if (lowCount > highCount) return 'improving';
    if (highCount > lowCount) return 'worsening';
    return 'stable';
  };

  const riskImprovement = calculateRiskImprovement();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <IconChartLine size={18} />
          Health Trends
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <IconChartLine className="text-primary" />
            Health Trends & History
          </DialogTitle>
          <DialogDescription>
            Track your health journey and compare reports over time
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <IconLoader className="animate-spin text-primary" size={48} />
          </div>
        ) : !analysis || trends.length === 0 ? (
          <div className="py-8 text-center">
            <IconChartLine className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground">No consultation history available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete consultations to start tracking your health trends
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                <p className="text-sm text-blue-600 font-medium">Total Consultations</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {analysis.totalConsultations}
                </p>
              </div>
              
              <div className="rounded-xl border bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                <p className="text-sm text-purple-600 font-medium">Specialists Visited</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {analysis.specialistVisits.length}
                </p>
              </div>
              
              <div className="rounded-xl border bg-gradient-to-br from-orange-50 to-orange-100 p-4">
                <p className="text-sm text-orange-600 font-medium">Health Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {riskImprovement === 'improving' && (
                    <>
                      <IconTrendingUp className="text-green-600" size={24} />
                      <span className="text-xl font-bold text-green-600">Improving</span>
                    </>
                  )}
                  {riskImprovement === 'worsening' && (
                    <>
                      <IconTrendingDown className="text-red-600" size={24} />
                      <span className="text-xl font-bold text-red-600">Needs Attention</span>
                    </>
                  )}
                  {riskImprovement === 'stable' && (
                    <span className="text-xl font-bold text-blue-600">Stable</span>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Level Timeline */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-lg flex items-center gap-2">
                <IconActivity className="text-primary" />
                Risk Level Timeline
              </h3>
              <div className="space-y-2">
                {analysis.riskTrend.slice(-10).reverse().map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex-shrink-0 w-32">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <IconCalendar size={12} />
                        {moment(item.date).format('MMM DD, YYYY')}
                      </p>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getRiskColor(item.riskLevel)}`}
                          style={{ 
                            width: item.riskLevel === 'high' ? '100%' : 
                                   item.riskLevel === 'moderate' ? '60%' : '30%' 
                          }}
                        />
                      </div>
                      <span className={`text-sm font-medium capitalize ${getRiskTextColor(item.riskLevel)} w-20`}>
                        {item.riskLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Symptoms */}
            {analysis.symptomFrequency.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="mb-4 font-semibold text-lg">Most Common Symptoms</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.symptomFrequency.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm">{item.symptom}</span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {item.count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medications Mentioned */}
            {analysis.commonMedications.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="mb-4 font-semibold text-lg flex items-center gap-2">
                  <IconPill className="text-primary" />
                  Medications Mentioned
                </h3>
                <div className="space-y-2">
                  {analysis.commonMedications.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm font-medium">{item.medication}</span>
                      <span className="text-xs text-muted-foreground">
                        Mentioned {item.count} time{item.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialist Visits */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-lg">Specialist Consultations</h3>
              <div className="space-y-2">
                {analysis.specialistVisits.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm font-medium">{item.specialist}</span>
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                      {item.count} visit{item.count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Consultations */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-lg">Recent Consultations</h3>
              <div className="space-y-3">
                {trends.slice(-5).reverse().map((session, idx) => (
                  <div key={idx} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{session.specialist}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRiskColor(session.riskLevel)} text-white`}>
                            {session.riskLevel}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {session.chiefComplaint}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <IconCalendar size={12} />
                          {moment(session.date).format('MMMM DD, YYYY')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
