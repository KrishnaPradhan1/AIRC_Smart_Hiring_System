import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Volume2, Award, Zap, AlertTriangle } from 'lucide-react';
import { usePuterStore } from '~/lib/puter';
import { getAudioAnalysisPrompt } from '../../constants';
import ScoreCircle from './ScoreCircle';

// Extend Window to include webkitSpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface AudioPitchProps {
    resumeId: string;
    resumeData: Resume;
    onUpdate: (updatedResume: Resume) => void;
}

const AudioPitch = ({ resumeId, resumeData, onUpdate }: AudioPitchProps) => {
    const { ai, kv } = usePuterStore();
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState(resumeData.audioTranscript || '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const recognitionRef = useRef<any>(null);

    const feedback = resumeData.audioFeedback;

    useEffect(() => {
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            
            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setTranscript(currentTranscript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsRecording(false);
            };
        }

        return () => {
            if (recognitionRef.current && isRecording) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            alert('Your browser does not support Speech Recognition. Please use Chrome or Edge.');
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            setTranscript('');
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    const handleAnalyze = async () => {
        if (!transcript.trim()) {
            alert('Please record or type a pitch before analyzing.');
            return;
        }

        setIsAnalyzing(true);
        try {
            const prompt = getAudioAnalysisPrompt(
                transcript,
                resumeData.jobTitle || 'General',
                '', // Assuming JD might not be present broadly, but we can pass an empty string
                resumeData.feedback?.extractedText || ''
            );

            const response = await ai.chat(prompt, { model: 'claude-3-5-sonnet', stream: false });
            // Clean markdown if present
            const cleanJsonStr = (response as any).message.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(cleanJsonStr);

            const updatedResume: Resume = {
                ...resumeData,
                audioTranscript: transcript,
                audioFeedback: analysis
            };

            // Save to Puter KV
            await kv.set(`resume:${resumeId}`, JSON.stringify(updatedResume));
            
            // Update parent state
            onUpdate(updatedResume);

        } catch (error) {
            console.error('Error analyzing audio pitch:', error);
            alert('Failed to analyze pitch. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700">
            <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-gray-900">Audio Pitch (Elevator Pitch)</h3>
                <p className="text-sm text-gray-500">
                    Record a 60-second elevator pitch introducing yourself. We'll transcribe it and use AI to evaluate 
                    your communication style, strengths, and alignment with your resume.
                </p>
            </div>

            <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Volume2 size={18} className="text-blue-500" />
                        Record Your Pitch
                    </h4>
                    <button
                        onClick={toggleRecording}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                            isRecording 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {isRecording ? <><Square size={16} fill="currentColor" /> Stop Recording</> : <><Mic size={16} /> Start Recording</>}
                    </button>
                </div>

                <div className="relative">
                    <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Your transcript will appear here. You can also type or paste your pitch directly..."
                        className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-800"
                    />
                    {isRecording && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 text-red-500 text-sm font-semibold">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Listening...
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !transcript.trim() || isRecording}
                        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
                    >
                        {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Play size={16} /> Analyze Pitch</>}
                    </button>
                </div>
            </div>

            {feedback && (
                <div className="flex flex-col gap-6 mt-4 animate-in fade-up">
                    <h3 className="text-2xl font-bold text-gray-900 border-b pb-2">Feedback Summary</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-2xl">
                            <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Pitch Score</h4>
                            <ScoreCircle score={feedback.score} />
                        </div>
                        
                        <div className="col-span-2 flex flex-col justify-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Communication Style</h4>
                            <p className="text-gray-600 leading-relaxed">{feedback.communicationStyle}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Strengths */}
                        <div className="flex flex-col gap-4 p-6 bg-green-50 border border-green-200 rounded-2xl">
                            <h4 className="flex items-center gap-2 font-bold text-green-800">
                                <Award size={18} /> Strengths
                            </h4>
                            <ul className="flex flex-col gap-3">
                                {feedback.strengths.map((strength, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-green-900">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        {strength}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="flex flex-col gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                            <h4 className="flex items-center gap-2 font-bold text-red-800">
                                <AlertTriangle size={18} /> Needs Improvement
                            </h4>
                            <ul className="flex flex-col gap-3">
                                {feedback.weaknesses.map((weakness, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-red-900">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        {weakness}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="flex flex-col gap-4 p-6 bg-amber-50 border border-amber-200 rounded-2xl mb-8">
                        <h4 className="flex items-center gap-2 font-bold text-amber-800">
                            <Zap size={18} /> Actionable Tips
                        </h4>
                        <ul className="flex flex-col gap-3">
                            {feedback.tips.map((tip, i) => (
                                <li key={i} className="flex gap-3 text-sm text-amber-900">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioPitch;
