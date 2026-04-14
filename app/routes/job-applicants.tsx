import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";
import Navbar from "~/components/Navbar";
import { usePuterStore } from "~/lib/puter";
import { ChevronLeft, Play, Pause, Mail, ExternalLink } from "lucide-react";
import emailjs from '@emailjs/browser';

export default function JobApplicants() {
    const { jobId } = useParams();
    const { auth } = usePuterStore();

    const [job, setJob] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(20);

    // Audio player state
    const [playingId, setPlayingId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!auth.isAuthenticated || !auth.user?.username) return;
        if (auth.role === 'student') {
            navigate('/');
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch Job Details
                const { data: jobData } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('id', jobId)
                    .single();

                if (jobData) setJob(jobData);

                // Fetch Applications
                const { data: appsData } = await supabase
                    .from('applications')
                    .select(`
                        *,
                        student_profiles (
                            full_name, email, phone, linkedin_url, institute, city, state, country
                        )
                    `)
                    .eq('job_id', jobId)
                    .order('created_at', { ascending: false });

                if (appsData) {
                    // Sort locally by hybrid overall score descending
                    const sortedApps = appsData.sort((a, b) => {
                        const scoreA = a.hybrid_score?.overallScore || a.resume_data?.feedback?.overallScore || 0;
                        const scoreB = b.hybrid_score?.overallScore || b.resume_data?.feedback?.overallScore || 0;
                        return scoreB - scoreA;
                    });
                    setApplications(sortedApps);
                }
            } catch (err) {
                console.error("Failed to load applicants", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [jobId, auth.isAuthenticated]);

    const handleSelectCandidate = async (app: any) => {
        const studentInfo = app.student_profiles || {};
        const studentName = studentInfo.full_name || app.student_id;
        let recipientEmail = studentInfo.email;

        // Fetch Recruiter Email
        let recruiterEmail = '';
        try {
            const { data: recProfile } = await supabase.from('recruiter_profiles').select('corporate_email').eq('id', auth.user!.username).single();
            if (recProfile) recruiterEmail = recProfile.corporate_email;
        } catch (e) { console.warn("Could not fetch recruiter email", e); }

        if (!recipientEmail) {
            const fallback = prompt("Candidate is missing an email address! Enter an email to send the confirmation to, or press Cancel to just select them silently:");
            if (!fallback) {
                setApplications(apps => apps.map(a => a.id === app.id ? { ...a, status: 'selected' } : a));
                await supabase.from('applications').update({ status: 'selected' }).eq('id', app.id);
                alert("Candidate Selected (Email skipped).");
                return;
            }
            recipientEmail = fallback;
        }

        // Optimistic UI update
        setApplications(apps => apps.map(a => a.id === app.id ? { ...a, status: 'selected' } : a));

        try {
            await supabase.from('applications').update({ status: 'selected' }).eq('id', app.id);

            // Dispatch Background Email via EmailJS
            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_0j0s4zs';
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_iekffki';
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'ngGVMzm0I5cxCKvdA';

            if (serviceId && templateId && publicKey && templateId !== 'template_YOUR_TEMPLATE_ID_HERE') {
                // Email 1: To the candidate
                await emailjs.send(
                    serviceId,
                    templateId,
                    {
                        company_name: job.company_name || 'Hiring Team',
                        candidate_name: studentName,
                        time: new Date().toLocaleString(),
                        message: `Congratulations! We have reviewed your application for the ${job.title} position and would love to move forward to the next round of interviews. We will be in touch shortly with scheduling details.`,
                        to_email: recipientEmail
                    },
                    publicKey
                );

                // Email 2: Details to the Recruiter
                const score = app.hybrid_score?.overallScore || app.resume_data?.feedback?.overallScore || 0;
                const resumeLink = app.resume_data?.resumeUrl || 'Not provided. No resume attached.';

                let hrRecipient = recruiterEmail;
                if (!hrRecipient) {
                    hrRecipient = prompt("Your recruiter profile is missing a corporate email. Enter an email to receive the candidate's resume packet for your records, or cancel to skip:", "") || "";
                }

                if (hrRecipient) {
                    await emailjs.send(
                        serviceId,
                        templateId,
                        {
                            company_name: 'Internal Notification',
                            candidate_name: 'Hiring Manager',
                            time: new Date().toLocaleString(),
                            message: `A candidate has been formally selected for ${job.title}.\n\nCandidate Name: ${studentName}\nCandidate Email: ${recipientEmail}\nATS Scanned Score: ${score}/100\n\nOriginal Resume Link: ${resumeLink}\n\nPlease proceed with scheduling their interview phase.`,
                            to_email: hrRecipient
                        },
                        publicKey
                    );
                }

                alert(`Candidate Selected! Automated emails sent to candidate and HR (${hrRecipient || 'Skipped HR Email'}).`);
            } else {
                alert(`Candidate Selected! (Automated email skipped: Please update VITE_EMAILJS_TEMPLATE_ID in the .env.local file to activate emails).`);
            }
        } catch (err: any) {
            console.error('Email Dispatch Error:', err);
            const cause = err?.text || err?.message || 'Unknown configuration error';
            alert(`Candidate Selected! However, the background email failed with error: "${cause}". Make sure your EmailJS Template "To" field is set to: {{to_email}}`);
        }
    };

    const handleRejectCandidate = async (appId: string, studentEmail: string, studentName: string, feedback: any) => {
        let recipientEmail = studentEmail;
        if (!recipientEmail) {
            const fallback = prompt("Candidate is missing an email address! Enter an email to send the rejection to, or press Cancel to just reject them silently:");
            if (!fallback) {
                setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: 'rejected' } : app));
                await supabase.from('applications').update({ status: 'rejected' }).eq('id', appId);
                alert("Candidate Rejected (Email skipped).");
                return;
            }
            recipientEmail = fallback;
        }

        setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: 'rejected' } : app));

        try {
            await supabase.from('applications').update({ status: 'rejected' }).eq('id', appId);

            // Dispatch Rejection Background Email via EmailJS
            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_0j0s4zs';
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_iekffki';
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'ngGVMzm0I5cxCKvdA';

            if (serviceId && templateId && publicKey && templateId !== 'template_YOUR_TEMPLATE_ID_HERE') {

                let missingKeywordsSnippet = '';
                if (feedback?.missingKeywords && feedback.missingKeywords.length > 0) {
                    missingKeywordsSnippet = `To improve your chances in the future, our AI screening system completely analyzed your resume and noted that it was missing these core technical skills related to the role: ${feedback.missingKeywords.slice(0, 5).join(', ')}.`;
                }

                const rejectionMessage = `Thank you for taking the time to apply for the ${job.title} position. After careful review, we have decided to move forward with other candidates whose profiles more closely match our current requirements.\n\n${missingKeywordsSnippet}\n\nWe encourage you to continue developing your tech stack and wish you the absolute best of luck in your job search!`;

                await emailjs.send(
                    serviceId,
                    templateId,
                    {
                        company_name: job.company_name || 'Hiring Team',
                        candidate_name: studentName || 'Applicant',
                        time: new Date().toLocaleString(),
                        message: rejectionMessage,
                        to_email: recipientEmail
                    },
                    publicKey
                );
                alert(`Candidate Rejected. A personalized rejection email with feedback was dispatched to ${recipientEmail}.`);
            }
        } catch (err: any) {
            console.error('Email Dispatch Error:', err);
            const cause = err?.text || err?.message || 'Unknown configuration error';
            alert(`Candidate status updated to rejected, but the automated email failed with error: "${cause}". Make sure your EmailJS Template "To" field is set to: {{to_email}}`);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </main>
        )
    }

    if (!job) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">Job not found or access denied.</div>
            </main>
        )
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen pb-24">
            <Navbar />

            <section className="max-w-6xl mx-auto px-4 mt-8">
                <div className="mb-8">
                    <Link to="/recruiter" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold mb-4 hover:-translate-x-1 transition-transform">
                        <ChevronLeft size={20} /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Applicant Pool: {job.title}</h1>
                    <p className="text-gray-500 mt-2">{applications.length} total candidates applied.</p>
                </div>

                <div className="grid gap-6">
                    {applications.length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-600">No applicants yet</h3>
                            <p className="text-gray-500 mt-2">Share your job application link to start receiving candidates.</p>
                        </div>
                    ) : (
                        applications.slice(0, visibleCount).map((app, index) => {
                            const student = app.student_profiles || {};
                            const score = app.hybrid_score?.overallScore || app.resume_data?.feedback?.overallScore || 0;
                            const isSelected = app.status === 'selected';
                            const isRejected = app.status === 'rejected';

                            return (
                                <div key={app.id} className={`bg-white rounded-2xl shadow-md border-l-8 ${isSelected ? 'border-l-green-500' : isRejected ? 'border-l-red-500 opacity-60' : 'border-l-indigo-500'} p-6 transition-all`}>
                                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">

                                        {/* Candidate Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xl font-bold">
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <Link to={`/recruiter/application/${app.id}`} className="hover:underline">
                                                        <h3 className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">{student.full_name || app.student_id}</h3>
                                                    </Link>
                                                    <p className="text-sm text-gray-500">{student.institute} • {student.city}, {student.country}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-4">
                                                <a href={`mailto:${student.email}`} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-gray-200">
                                                    <Mail size={14} /> {student.email}
                                                </a>
                                                <a href={`tel:${student.phone}`} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                                                    📞 {student.phone}
                                                </a>
                                                {student.linkedin_url && (
                                                    <a href={student.linkedin_url} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                                                        in LinkedIn
                                                    </a>
                                                )}
                                            </div>

                                            {app.audio_transcript && (
                                                <div className="mt-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                                                    <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                                        🎙️ Audio Pitch Attached
                                                    </h4>
                                                    <p className="text-sm text-gray-700 italic border-l-2 border-indigo-300 pl-3 py-1">
                                                        "{app.audio_transcript.substring(0, 150)}{app.audio_transcript.length > 150 ? '...' : ''}"
                                                    </p>

                                                    {app.audio_feedback && (
                                                        <div className="mt-3 flex items-center gap-4">
                                                            <div className="text-xs font-bold bg-white px-2 py-1 rounded text-indigo-700 shadow-sm border border-indigo-100">
                                                                Comm Score: {app.audio_feedback.score}/100
                                                            </div>
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                Style: {app.audio_feedback.communicationStyle}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Scoring & Actions */}
                                        <div className="flex flex-col items-end gap-4 min-w-[200px]">
                                            <div className="text-center bg-gray-50 p-4 rounded-2xl border border-gray-100 w-full">
                                                <span className="block text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">ATS Match</span>
                                                <span className={`text-3xl font-black ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {score}%
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-2 w-full">
                                                {app.resume_data?.resumeUrl && (
                                                    <a
                                                        href={app.resume_data.resumeUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-2 shadow-md"
                                                    >
                                                        <ExternalLink size={18} /> Original Resume
                                                    </a>
                                                )}
                                                {!isSelected && !isRejected && (
                                                    <>
                                                        <Link
                                                            to={`/recruiter/application/${app.id}`}
                                                            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 rounded-xl transition-all text-center border border-blue-200"
                                                        >
                                                            View Full Details
                                                        </Link>
                                                        <button
                                                            onClick={() => handleSelectCandidate(app)}
                                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md mt-1"
                                                        >
                                                            Select & Email Candidate
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectCandidate(app.id, student.email, student.full_name, app.resume_data?.feedback)}
                                                            className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-2.5 rounded-xl transition-all"
                                                        >
                                                            Reject & Email Feedback
                                                        </button>
                                                    </>
                                                )}

                                                {isSelected && (
                                                    <div className="w-full bg-green-100 text-green-800 font-bold py-2.5 rounded-xl text-center border border-green-200">
                                                        ✓ Selected User
                                                    </div>
                                                )}

                                                {isRejected && (
                                                    <div className="w-full bg-red-100 text-red-800 font-bold py-2.5 rounded-xl text-center border border-red-200">
                                                        ✗ Rejected User
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {!isLoading && applications.length > visibleCount && (
                    <div className="flex justify-center mt-12 mb-8">
                        <button
                            onClick={() => setVisibleCount(prev => prev + 20)}
                            className="bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold py-3 px-8 rounded-full shadow-sm transition-all flex items-center gap-2 hover:scale-105"
                        >
                            Load More Applicants ({applications.length - visibleCount} remaining)
                        </button>
                    </div>
                )}
            </section>
        </main>
    )
}
