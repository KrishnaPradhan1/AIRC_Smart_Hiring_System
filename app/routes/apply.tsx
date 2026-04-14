import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";
import { usePuterStore } from "~/lib/puter";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import AudioPitch from "~/components/AudioPitch";
import { extractTextFromPdf } from "~/lib/extractTextFromPdf";
import { convertPdfToImage } from "~/lib/pdf2img";
import { prepareInstructions } from "../../constants";
import { safeJsonParse } from "~/lib/safeJsonParse";
import { UnifiedFeedbackSchema } from "../../types/matching";
import { computeHybridScore } from "~/lib/matchingEngine";

export default function ApplyPage() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { auth, fs, ai, kv } = usePuterStore();

    const [job, setJob] = useState<any>(null);
    const [recruiterInfo, setRecruiterInfo] = useState<any>(null);
    const [isLoadingJob, setIsLoadingJob] = useState(true);

    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [hasApplied, setHasApplied] = useState(false);
    
    // Manage Existing Application
    const [existingAppId, setExistingAppId] = useState<string | null>(null);
    const [appStatus, setAppStatus] = useState<string | null>(null);

    // Audio tracking
    const [audioTranscript, setAudioTranscript] = useState<string | undefined>();
    const [audioFeedback, setAudioFeedback] = useState<any>();

    useEffect(() => {
        if (!jobId) return;

        const loadJobDetails = async () => {
            setIsLoadingJob(true);
            try {
                // Fetch job
                const { data: jobData, error: jobError } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('id', jobId)
                    .single();

                if (jobData) {
                    setJob(jobData);
                    // Fetch recruiter info
                    const { data: recData } = await supabase
                        .from('recruiter_profiles')
                        .select('company_name, location')
                        .eq('id', jobData.recruiter_id)
                        .single();
                    if (recData) setRecruiterInfo(recData);
                } else {
                    console.error("Job missing", jobError);
                }

                // Check if already applied
                if (auth.isAuthenticated && auth.user) {
                    const { data: applyData } = await supabase
                        .from('applications')
                        .select('id, status')
                        .eq('job_id', jobId)
                        .eq('student_id', auth.user.username)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    
                    if (applyData) {
                        setHasApplied(true);
                        setExistingAppId(applyData.id);
                        setAppStatus(applyData.status);
                    }
                }

            } catch (err) {
                console.error("Failed to load job", err);
            } finally {
                setIsLoadingJob(false);
            }
        };

        loadJobDetails();
    }, [jobId, auth.isAuthenticated, auth.user]);

    const handleSubmitApplication = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!auth.isAuthenticated) {
            navigate(`/auth?next=/apply/${jobId}`);
            return;
        }

        if (files.length === 0) {
            alert("Please upload your resume.");
            return;
        }

        setIsSubmitting(true);
        const file = files[0];

        try {
            setSubmitStatus("Uploading resume to secure vault...");
            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) throw new Error("Failed to upload file to Puter");

            setSubmitStatus("Optimizing document for recruiter viewing...");
            const imageFile = await convertPdfToImage(file);
            let imagePath = '';
            if (imageFile.file) {
                const uploadedImg = await fs.upload([imageFile.file]);
                if (uploadedImg) imagePath = uploadedImg.path;
            }

            setSubmitStatus("Extracting raw text for ATS Matcher...");
            let resumeText = '';
            try {
                resumeText = await extractTextFromPdf(file);
            } catch (err) {
                console.error("Client side extract failed", err);
            }

            setSubmitStatus("Analyzing technical fit using AI Engine...");
            let promptInstructions = prepareInstructions({ 
                jobTitle: job.title, 
                jobDescription: job.description, 
                resumeText 
            });

            const feedback = await ai.feedback(uploadedFile.path, promptInstructions);
            if (!feedback) throw new Error("AI engine failed to respond");

            let feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : (feedback.message.content[0] as any).text;

            const parsedResult = safeJsonParse(feedbackText, UnifiedFeedbackSchema);
            if (!parsedResult.success) throw new Error("AI returned malformed data format.");

            setSubmitStatus("Computing Final ATS Vector Scores...");
            const hybrid = await computeHybridScore(
                parsedResult.data.overallScore,
                parsedResult.data.extractedText,
                job.description,
                parsedResult.data.extractedSkills,
                parsedResult.data.jobDescriptionSkills
            );

            setSubmitStatus("Saving documents to recruiter vault...");
            
            // Upload original PDF to Supabase Storage for recruiter access
            let publicUrl = '';
            try {
                const fileName = `${auth.user!.username}_${jobId}_${Date.now()}.pdf`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('resumes')
                    .upload(fileName, file, { contentType: 'application/pdf' });
                    
                if (!uploadError && uploadData) {
                    const { data } = supabase.storage.from('resumes').getPublicUrl(fileName);
                    publicUrl = data.publicUrl;
                } else {
                    console.error("Failed to upload to Supabase Storage:", uploadError);
                }
            } catch (storageErr) {
                console.error("Storage upload exception:", storageErr);
            }

            // Final data payload for recruiter 
            const finalResumeData = {
                resumePath: uploadedFile.path,
                resumeUrl: publicUrl,
                imagePath: imagePath,
                feedback: parsedResult.data
            };

            // Submit to Database
            setSubmitStatus("Finalizing application record...");
            
            // Critical fail-safe: Ensure profile records exist to satisfy foreign keys
            // If the user onboarded while the DB was asleep/offline, their profile row might be missing.
            try {
                await supabase.from('profiles').upsert(
                    { id: auth.user!.username, role: 'student' },
                    { onConflict: 'id', ignoreDuplicates: true }
                );
                await supabase.from('student_profiles').upsert(
                    { id: auth.user!.username, full_name: auth.user?.username || 'Applicant' },
                    { onConflict: 'id', ignoreDuplicates: true }
                );
            } catch (e) {
                console.warn("Profile auto-sync failed", e);
            }
            
            if (existingAppId) {
                const { error: updateError } = await supabase.from('applications').update({
                    resume_data: finalResumeData,
                    audio_transcript: audioTranscript,
                    audio_feedback: audioFeedback,
                    hybrid_score: hybrid,
                    status: 'pending' // Resets status so the recruiter is notified of the reapplication
                }).eq('id', existingAppId);

                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('applications').insert({
                    job_id: jobId,
                    student_id: auth.user!.username,
                    resume_data: finalResumeData,
                    audio_transcript: audioTranscript,
                    audio_feedback: audioFeedback,
                    hybrid_score: hybrid,
                    status: 'pending'
                });

                if (insertError) throw insertError;
            }

            setHasApplied(true);
            setAppStatus('pending'); // UI Overwrite
            alert("Application submitted successfully!");
        } catch (err: any) {
            alert(err.message || "Failed to submit application");
        } finally {
            setIsSubmitting(false);
            setSubmitStatus("");
        }
    }

    if (isLoadingJob) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </main>
        )
    }

    if (!job) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-2xl shadow">
                    <h2 className="text-2xl font-bold text-gray-800">Job Not Found</h2>
                    <p className="text-gray-500 mt-2">The link you followed may be invalid or expired.</p>
                </div>
            </main>
        )
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen pb-24">
            <Navbar />
            
            <section className="max-w-4xl mx-auto px-4 mt-8">
                {/* Job Info Banner */}
                <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 mb-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{job.title}</h1>
                            <div className="flex items-center gap-3 text-gray-600 font-medium">
                                <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                                    {recruiterInfo?.company_name || 'Hiring Company'}
                                </span>
                                {recruiterInfo?.location && (
                                    <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-lg">
                                        📍 {recruiterInfo.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="prose max-w-none text-gray-700">
                        <h3 className="text-lg font-bold mb-3">About the Role</h3>
                        <p className="whitespace-pre-wrap">{job.description}</p>
                    </div>
                </div>

                {hasApplied ? (
                    <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl border border-white/50 text-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                            ✓
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
                        <p className="text-gray-600 mb-6">Your current application status is: <strong className="uppercase text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1 rounded-lg text-sm">{appStatus || 'PENDING'}</strong></p>
                        
                        <div className="pt-6 border-t border-gray-100 mt-6">
                            <h3 className="text-sm font-bold text-gray-800 mb-2">Need to update your resume?</h3>
                            <button 
                                onClick={() => setHasApplied(false)}
                                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm text-sm"
                            >
                                Reapply & Overwrite Existing Application
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitApplication} className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl border border-white/50">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Your Application</h2>
                        <p className="text-gray-500 mb-8">Your resume will be securely analyzed and sent to the recruiter.</p>

                        {!auth.isAuthenticated && (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-700 mb-8 flex items-center justify-between">
                                <span className="font-semibold">You need to log in to apply.</span>
                                <button type="button" onClick={() => navigate(`/auth?next=/apply/${jobId}`)} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700">
                                    Log In
                                </button>
                            </div>
                        )}

                        <div className={`transition-opacity ${!auth.isAuthenticated ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="mb-10">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Upload your Resume (PDF)</h3>
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                    <FileUploader onFileSelect={setFiles} />
                                </div>
                            </div>
                            
                            <div className="mb-10">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Professional Voice Pitch (Optional)</h3>
                                <p className="text-sm text-gray-500 mb-4">Stand out by submitting a 60-second audio elevator pitch. We'll transcribe it and include it in your application automatically.</p>
                                <div className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm">
                                    {/* Mock resumeData just for AudioPitch compatibility */}
                                    <AudioPitch 
                                        resumeId="new-app" 
                                        resumeData={{ jobTitle: job.title, jobDescription: job.description, feedback: { extractedText: "" } } as any} 
                                        onUpdate={(data) => {
                                            setAudioTranscript(data.audioTranscript);
                                            setAudioFeedback(data.audioFeedback);
                                        }} 
                                    />
                                    {audioTranscript && (
                                        <div className="mt-4 p-4 bg-green-50 text-green-700 font-medium rounded-xl border border-green-100 text-sm flex items-center gap-2">
                                            ✓ Audio pitch successfully recorded and attached!
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting || files.length === 0}
                                className={`w-full py-4 text-xl rounded-xl font-bold text-white shadow-xl transition-all ${isSubmitting || files.length === 0 ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-2xl hover:-translate-y-1'}`}
                            >
                                {isSubmitting ? 'Processing Application...' : 'Submit Application'}
                            </button>
                            
                            {isSubmitting && (
                                <p className="text-center font-medium text-indigo-600 mt-4 animate-pulse">
                                    {submitStatus}
                                </p>
                            )}
                        </div>
                    </form>
                )}
            </section>
        </main>
    )
}
