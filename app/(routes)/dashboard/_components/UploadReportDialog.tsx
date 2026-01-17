'use client';
import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  IconUpload, 
  IconFileText, 
  IconLoader, 
  IconPhoto, 
  IconFile, 
  IconX,
  IconMessageCircle,
  IconMicrophone,
  IconStethoscope
} from '@tabler/icons-react';

type UploadReportDialogProps = {
  sessionId: string;
  onUploadSuccess?: () => void;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function UploadReportDialog({ sessionId, onUploadSuccess }: UploadReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportName, setReportName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, JPEG, or PNG file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    
    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile && !reportText.trim()) {
      toast.error('Please upload a file or paste report text');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    console.log('Starting upload...', { uploadedFile: uploadedFile?.name, hasText: !!reportText });

    try {
      let response;
      
      if (uploadedFile) {
        console.log('Processing file:', uploadedFile.name, uploadedFile.type);
        // Convert file to base64 for API
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadedFile);
        });

        console.log('File converted to base64, sending to API...');
        
        response = await axios.post('/api/upload-lab-report', {
          sessionId,
          reportName: reportName.trim() || uploadedFile.name,
          fileData: base64String,
          fileType: uploadedFile.type,
        });

        console.log('API Response:', response.data);

        if (response.data.success) {
          setAnalysisResult(response.data.analysis);
          setShowChat(true);
          setChatMessages([{
            role: 'assistant',
            content: `I've analyzed your ${response.data.analysis.reportType || 'medical report'}. ${response.data.analysis.doctorExplanation} Feel free to ask me any questions about your results!`
          }]);
          toast.success('Report analyzed successfully!');
          if (onUploadSuccess) onUploadSuccess();
        } else {
          throw new Error(response.data.error || 'Analysis failed');
        }
      } else {
        // Text-based upload
        console.log('Processing text input...');
        response = await axios.post('/api/upload-lab-report', {
          sessionId,
          reportText: reportText.trim(),
          reportName: reportName.trim() || 'Lab Report'
        });

        console.log('API Response:', response.data);

        if (response.data.success) {
          setAnalysisResult(response.data.analysis);
          setShowChat(true);
          setChatMessages([{
            role: 'assistant',
            content: `I've analyzed your ${response.data.analysis.reportType || 'medical report'}. ${response.data.analysis.doctorExplanation} Feel free to ask me any questions about your results!`
          }]);
          toast.success('Report analyzed successfully!');
          setReportText('');
          setReportName('');
          if (onUploadSuccess) onUploadSuccess();
        } else {
          throw new Error(response.data.error || 'Analysis failed');
        }
      }
    } catch (error: any) {
      console.error('Error uploading report:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to analyze report. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
      console.log('Upload process completed');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !analysisResult) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await axios.post('/api/chat-with-report', {
        sessionId,
        reportAnalysis: analysisResult,
        messages: [...chatMessages, userMessage],
        question: chatInput
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.answer
      };
      setChatMessages(prev => [...prev, assistantMessage]);

      // Auto-speak response if available
      if ('speechSynthesis' in window) {
        speakText(response.data.answer);
      }
    } catch (error) {
      console.error('Error chatting:', error);
      toast.error('Failed to get response');
    } finally {
      setIsChatting(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported in your browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error('Speech synthesis failed');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleConsultWithDoctor = () => {
    // Close current dialog
    setOpen(false);
    
    // Navigate to consultation with report context
    toast.success('Opening AI Doctor consultation with your report...');
    
    // Redirect to new consultation session
    window.location.href = `/dashboard?openConsultation=true&reportId=${analysisResult?.reportId || ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <IconUpload size={18} />
          Upload Lab Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <IconFileText className="text-primary" />
            Upload & Analyze Medical Report
          </DialogTitle>
          <DialogDescription>
            Upload your lab reports (PDF, JPEG, PNG) or paste text. Get AI analysis with doctor-style explanations and chat about your results.
          </DialogDescription>
        </DialogHeader>

        {!showChat ? (
          <div className="space-y-6 py-4">
            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">
                    Upload Report File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <IconUpload size={24} className="text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">PDF, JPEG, PNG (Max 10MB)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* File Preview */}
              {uploadedFile && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {uploadedFile.type.startsWith('image/') ? (
                        <IconPhoto size={24} className="text-primary" />
                      ) : (
                        <IconFile size={24} className="text-primary" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <IconX size={18} />
                    </Button>
                  </div>
                  
                  {filePreview && (
                    <div className="mt-4">
                      <img 
                        src={filePreview} 
                        alt="Preview" 
                        className="max-h-64 rounded-lg border object-contain w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* OR Divider */}
              {!uploadedFile && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or paste text
                    </span>
                  </div>
                </div>
              )}

              {/* Text Input (only show if no file uploaded) */}
              {!uploadedFile && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Report Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Complete Blood Count - Dec 2025"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Lab Report Text
                    </label>
                    <Textarea
                      placeholder="Paste your laboratory test results here..."
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      className="min-h-[200px] font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {uploadedFile && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Report Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Complete Blood Count - Dec 2025"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isAnalyzing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isAnalyzing || (!uploadedFile && !reportText.trim())}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <IconLoader className="animate-spin" size={18} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <IconUpload size={18} />
                    Analyze Report
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Chat Interface After Analysis
          <div className="space-y-4">
            {/* Analysis Summary */}
            {analysisResult && (
              <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                <h3 className="font-semibold mb-2">
                  {analysisResult.reportType || 'Medical Report'} - Analysis Complete
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    analysisResult.overallRiskLevel === 'low' ? 'bg-green-500 text-white' :
                    analysisResult.overallRiskLevel === 'moderate' ? 'bg-yellow-500 text-white' :
                    'bg-red-500 text-white'
                  }`}>
                    {analysisResult.overallRiskLevel?.toUpperCase() || 'ANALYZED'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-2"
                    onClick={handleConsultWithDoctor}
                  >
                    <IconStethoscope size={16} />
                    Consult AI Doctor
                  </Button>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="rounded-lg border bg-card p-4 max-h-[400px] overflow-y-auto space-y-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-6 gap-1 text-xs"
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                      >
                        <IconMicrophone size={14} />
                        {isSpeaking ? 'Stop' : 'Play'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted p-3">
                    <IconLoader className="animate-spin" size={16} />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about your results..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isChatting}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isChatting || !chatInput.trim()}
                size="sm"
              >
                <IconMessageCircle size={18} />
              </Button>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => {
                setShowChat(false);
                setAnalysisResult(null);
                setChatMessages([]);
                setUploadedFile(null);
                setFilePreview(null);
                setOpen(false);
              }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
