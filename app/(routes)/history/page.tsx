'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import axios from 'axios';
import { sessionDetail } from '../dashboard/medical-agent/[sessionId]/page';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { IconCalendar, IconFileText, IconDownload, IconAlertCircle } from '@tabler/icons-react';
import Image from 'next/image';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import ViewReportDailog from '../dashboard/_components/ViewReportDailog';

export default function HistoryPage() {
  const [historyList, setHistoryList] = useState<sessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    GetHistoryList();
  }, []);

  const GetHistoryList = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await axios.get('/api/session-chat');
      setHistoryList(result.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load consultation history');
      toast.error('Failed to load consultation history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading consultation history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-4">
        <IconAlertCircle size={48} className="text-muted-foreground" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={GetHistoryList}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <IconFileText size={16} />
            Medical Records
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl">
            Consultation
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"> History</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            View all your past consultations and download reports
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="rounded-2xl border bg-card p-6">
            <p className="mb-1 text-sm text-muted-foreground">Total Consultations</p>
            <p className="text-3xl font-bold">{historyList.length}</p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <p className="mb-1 text-sm text-muted-foreground">This Month</p>
            <p className="text-3xl font-bold">
              {historyList.filter(h => moment(h.createdOn).isAfter(moment().startOf('month'))).length}
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 sm:col-span-2 lg:col-span-1">
            <p className="mb-1 text-sm text-muted-foreground">Last Consultation</p>
            <p className="text-3xl font-bold">
              {historyList.length > 0 ? moment(historyList[0].createdOn).fromNow() : 'None'}
            </p>
          </div>
        </motion.div>

        {/* Consultation Cards */}
        {historyList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center justify-center rounded-3xl border bg-card py-20"
          >
            <IconFileText size={64} className="mb-4 text-muted-foreground/50" />
            <h2 className="mb-2 text-2xl font-bold">No Consultations Yet</h2>
            <p className="mb-6 text-muted-foreground">Start your first consultation to see it here</p>
            <Button asChild>
              <a href="/dashboard">Start Consultation</a>
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="space-y-4" style={{ minHeight: '800px' }}>
              {historyList
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                    className="group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-lg"
                  >
                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                      {/* Doctor Image */}
                      <div className="relative">
                        <Image
                          src={record.selectedDoctor.image}
                          alt={record.selectedDoctor.specialist}
                          width={80}
                          height={80}
                          className="rounded-2xl border-2 border-primary/20 object-cover shadow-md"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <h3 className="mb-1 text-xl font-bold">{record.selectedDoctor.specialist}</h3>
                        <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                          {record.notes || 'No description provided'}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <IconCalendar size={14} />
                            {moment(new Date(record.createdOn)).format('MMM DD, YYYY')}
                          </div>
                          <div className="flex items-center gap-1">
                            <IconFileText size={14} />
                            Medical Report Available
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="sm:ml-auto">
                        <ViewReportDailog record={record} />
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>

            {/* Pagination */}
            {historyList.length > itemsPerPage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 flex flex-col items-center gap-4"
              >
                <p className="text-sm text-muted-foreground">
                  Previous Consultation reports.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: Math.ceil(historyList.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(historyList.length / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(historyList.length / itemsPerPage)}
                    className="gap-1"
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
