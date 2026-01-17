'use client';
import Vapi from '@vapi-ai/web';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { doctorAgent } from '../../_components/DoctorAgentCard';
import { Circle, Loader, PhoneCall, PhoneOff, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import UploadReportDialog from '../../_components/UploadReportDialog';
import ViewLabReportsDialog from '../../_components/ViewLabReportsDialog';
import { ChatBot } from '@/components/ChatBot';

export type sessionDetail = {
  id: number;
  notes: string;
  sessionId: string;
  report: JSON;
  selectedDoctor: doctorAgent;
  createdOn: string;
}

export type messages = {
  role: string;
  text: string;
}

function MedicalVoiceAgent() {
  const { sessionId } = useParams();
  const [sessionDetail, setSessionDetail] = useState<sessionDetail | null>(null);
  const [callStarted, setCallStarted] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<any>(null); 
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [messages, setMessages] = useState<messages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [chatMode, setChatMode] = useState<'voice' | 'text'>('voice');
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  useEffect(() => {
    if (sessionId) {
      GetSessionDetails();
    }
  }, [sessionId]);

  useEffect(() => {
    if (chatMode === 'text' && sessionDetail) {
      loadConversationHistory();
    }
  }, [chatMode, sessionDetail]);

  const loadConversationHistory = async () => {
    try {
      const response = await axios.get(`/api/chat-message?sessionId=${sessionId}`);
      if (response.data.conversation) {
        const formattedMessages = response.data.conversation.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }));
        setChatMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  useEffect(() => {
    if (!vapiInstance) return;

    const handleSpeechStart = () => {
      setCurrentRole('Assistant');
    };

    const handleSpeechEnd = () => {
      setCurrentRole('User');
    };

    const handleTranscript = (message: any) => {
      if (message.type === 'transcript') {
        const { role, transcriptType, transcript } = message;

        if (transcriptType === 'partial') {
          setLiveTranscript(transcript);
          setCurrentRole(role);
        } else if (transcriptType === 'final') {
          setMessages((prev) => [...prev, { role, text: transcript }]);
          setLiveTranscript("");
          setCurrentRole(null);
        }
      }
    };

    if (typeof vapiInstance.on === 'function') {
      vapiInstance.on('speech-start', handleSpeechStart);
      vapiInstance.on('speech-end', handleSpeechEnd);
      vapiInstance.on('message', handleTranscript);
    }

    return () => {
      if (typeof vapiInstance.off === 'function') {
        vapiInstance.off('speech-start', handleSpeechStart);
        vapiInstance.off('speech-end', handleSpeechEnd);
        vapiInstance.off('message', handleTranscript);
      }
    };
  }, [vapiInstance]);

  const GetSessionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await axios.get('/api/session-chat?sessionId=' + sessionId);
      
      if (!result.data) {
        throw new Error('Session not found');
      }
      
      setSessionDetail(result.data);
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError('Failed to load session details');
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  }

  const StartCall = () => {
    try {
      if (!process.env.NEXT_PUBLIC_VAPI_API_KEY) {
        toast.error('VAPI API key not configured');
        return;
      }

      if (!sessionDetail?.selectedDoctor?.assistantId) {
        toast.error('Assistant ID not found for this specialist');
        return;
      }

      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY);
      setVapiInstance(vapi);

      vapi.start(sessionDetail.selectedDoctor.assistantId);

      vapi.on('call-start', () => {
        setCallStarted(true);
        setDuration(0);
        toast.success('Call connected!');

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      });

      vapi.on('call-end', () => {
        setCallStarted(false);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      });

      vapi.on('error', (error: any) => {
        console.error('VAPI Error:', error);
        toast.error('Call connection error');
        setCallStarted(false);
      });
    } catch (err) {
      console.error('Error starting call:', err);
      toast.error('Failed to start call');
    }
  };

  const endCall = async () => {
    if (!vapiInstance) return;

    try {
      setLoading(true);

      // Remove all event listeners safely BEFORE stopping the call
      if (vapiInstance && typeof vapiInstance.off === 'function') {
        try {
          vapiInstance.off('call-start', () => {});
          vapiInstance.off('call-end', () => {});
          vapiInstance.off('message', () => {});
          vapiInstance.off('speech-start', () => {});
          vapiInstance.off('speech-end', () => {});
          vapiInstance.off('error', () => {});
        } catch (err) {
          console.log('Error removing listeners:', err);
        }
      }

      // Stop the call after removing listeners
      if (vapiInstance && typeof vapiInstance.stop === 'function') {
        vapiInstance.stop();
      }

      setCallStarted(false);
      setVapiInstance(null);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Generate report
      if (messages.length > 0 && sessionDetail) {
        try {
          await axios.post('/api/medical-report', {
            sessionId,
            sessionDetail,
            messages
          });
          toast.success('Medical report generated successfully!');
        } catch (err) {
          console.error('Error generating report:', err);
          toast.error('Failed to generate report');
        }
      }

      router.replace('/dashboard');
    } catch (err) {
      console.error('Error ending call:', err);
      toast.error('Error ending call');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  if (loading && !sessionDetail) {
    return (
      <div className='flex min-h-[600px] items-center justify-center rounded-3xl border bg-card'>
        <LoadingSpinner size="lg" text="Loading session details..." />
      </div>
    );
  }

  if (error || !sessionDetail) {
    return (
      <div className='flex min-h-[600px] items-center justify-center rounded-3xl border bg-card'>
        <div className="text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-4 inline-block">
            <PhoneOff className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-destructive">
            {error || 'Session not found'}
          </h2>
          <p className="mb-6 text-muted-foreground">Unable to load consultation session</p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto flex h-[calc(100vh-120px)] max-w-6xl flex-col gap-4 pb-4'>
      {sessionDetail && 
        <>
          {/* Top Section - Doctor, Status, Duration in one row - FIXED */}
          <div className='flex flex-shrink-0 flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-card to-muted/20 p-4 md:flex-row md:p-6'>
            {/* Doctor Profile */}
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <Image 
                  src={sessionDetail.selectedDoctor.image} 
                  alt={sessionDetail.selectedDoctor.specialist} 
                  width={64} 
                  height={64} 
                  className='h-16 w-16 rounded-full border-4 border-primary/20 object-cover shadow-lg'
                />
                {callStarted && (
                  <div className='absolute -bottom-1 -right-1 rounded-full bg-green-500 p-1.5 shadow-lg'>
                    <PhoneCall className='h-3 w-3 text-white' />
                  </div>
                )}
              </div>
              <div>
                <h2 className='text-lg font-bold'>{sessionDetail.selectedDoctor.specialist}</h2>
                <p className='text-xs text-muted-foreground'>AI Medical Voice Agent</p>
              </div>
            </div>

            {/* Status and Duration */}
            <div className='flex items-center gap-4'>
              {/* Mode Toggle */}
              <div className='flex gap-1 rounded-lg bg-muted p-1'>
                <Button
                  size="sm"
                  variant={chatMode === 'voice' ? 'default' : 'ghost'}
                  className='gap-2'
                  onClick={() => setChatMode('voice')}
                  disabled={callStarted}
                >
                  <PhoneCall className='h-4 w-4' />
                  Voice
                </Button>
                <Button
                  size="sm"
                  variant={chatMode === 'text' ? 'default' : 'ghost'}
                  className='gap-2'
                  onClick={() => setChatMode('text')}
                  disabled={callStarted}
                >
                  <MessageSquare className='h-4 w-4' />
                  Chat
                </Button>
              </div>

              {chatMode === 'voice' && (
                <>
                  <div className='flex items-center gap-2'>
                    <div className={`rounded-full p-2 ${callStarted ? 'bg-green-500/10' : 'bg-muted'}`}>
                      <Circle className={`h-3 w-3 ${callStarted ? 'fill-green-500 text-green-500 animate-pulse' : 'fill-muted-foreground text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>Status</p>
                      <p className="text-sm font-semibold">
                        {callStarted ? 'Connected' : 'Ready'}
                      </p>
                    </div>
                  </div>
                  
                  <div className='rounded-xl bg-muted/50 px-4 py-2'>
                    <p className='text-xs text-muted-foreground'>Duration</p>
                    <p className='text-base font-bold tabular-nums'>
                      {formatTime(duration)}
                    </p>
                  </div>
                </>
              )}

              {/* Lab Reports Actions */}
              <div className='flex gap-2'>
                <UploadReportDialog 
                  sessionId={sessionId as string} 
                  onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)}
                />
                <ViewLabReportsDialog 
                  sessionId={sessionId as string}
                  triggerRefresh={refreshTrigger}
                />
              </div>

              {/* Call Button - Only show in voice mode */}
              {chatMode === 'voice' && (
                <>
                  {!callStarted ? 
                    <Button 
                      size="lg"
                      className='gap-2' 
                      onClick={StartCall} 
                      disabled={loading}
                    > 
                      <PhoneCall className='h-4 w-4' />  
                      Start Call
                    </Button>
                  :
                    <Button 
                      size="lg"
                      variant='destructive' 
                      className='gap-2'
                      onClick={endCall} 
                      disabled={loading}
                    >
                      {loading ? <Loader className='h-4 w-4 animate-spin'/> : <PhoneOff className='h-4 w-4' />} 
                      Disconnect
                    </Button>
                  }
                </>
              )}
            </div>
          </div>

          {/* Conversation Section - FIXED HEIGHT WITH SCROLL */}
          <div className='flex flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-lg border'>
            {chatMode === 'text' ? (
              <ChatBot
                sessionId={sessionId as string}
                doctorName={sessionDetail.selectedDoctor.specialist}
                initialMessages={chatMessages}
                onMessagesUpdate={(msgs) => setChatMessages(msgs)}
              />
            ) : (
              <>
                <div className='flex-shrink-0 border-b bg-muted/30 px-6 py-3'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-base font-semibold'>Conversation</h3>
                    {messages.length > 0 && (
                      <span className='rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary'>
                        {messages.length} messages
                      </span>
                    )}
                  </div>
                </div>
                
                <div className='flex-1 overflow-y-auto px-6 py-4'>
                  <div className='space-y-4'>
                    {messages.length === 0 && !liveTranscript && !callStarted && (
                      <div className='flex min-h-[400px] items-center justify-center'>
                        <div className='text-center'>
                          <PhoneCall className='mx-auto mb-3 h-12 w-12 text-muted-foreground/50' />
                          <p className='text-muted-foreground'>
                            Click "Start Call" to begin your consultation
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {messages.map((msg, index) => (
                      <div 
                        key={`msg-${index}`}
                        className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div 
                          className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
                            msg.role === 'assistant' 
                              ? 'bg-muted text-foreground' 
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className='mb-1 text-xs font-medium opacity-70'>
                            {msg.role === 'assistant' ? 'assistant' : 'user'}
                          </p>
                          <p className='text-sm leading-relaxed'>{msg.text}</p>
                        </div>
                  </div>
                ))}
                
                {liveTranscript && (
                  <div className={`flex ${currentRole === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div 
                      className={`max-w-[75%] animate-pulse rounded-2xl p-4 shadow-md ${
                        currentRole === 'assistant' 
                          ? 'bg-muted/70 text-foreground border-2 border-primary/30' 
                          : 'bg-primary/80 text-primary-foreground border-2 border-primary'
                      }`}
                    >
                      <p className='mb-1 flex items-center gap-2 text-xs font-medium opacity-70'>
                        {currentRole === 'assistant' ? 'assistant' : 'user'}
                        <span className='text-xs'>(speaking...)</span>
                      </p>
                      <p className='text-sm leading-relaxed'>{liveTranscript}</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            </>
            )}
          </div>
        </>
      }
    </div>
  )
}  

export default MedicalVoiceAgent;
