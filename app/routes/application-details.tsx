import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";
import Navbar from "~/components/Navbar";
import { usePuterStore } from "~/lib/puter";
import { ChevronLeft, Download, Mail, Phone, ExternalLink } from "lucide-react";
import { useReactToPrint } from "react-to-print";

export default function ApplicationDetails() {
    const { appId } = useParams();
    const { auth } = usePuterStore();

    const [application, setApplication] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const resumePrintRef = useRef<HTMLDivElement>(null);
    const reportPrintRef = useRef<HTMLDivElement>(null);
    const combinedPrintRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!appId || !auth.isAuthenticated) return;
        if (auth.role === 'student') {
            navigate('/');
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('applications')
                    .select(`
                        *,
                        student_profiles (
                            full_name, email, phone, linkedin_url, institute, city, state, country
                        ),
                        jobs (
                            title, description
                        )
                    `)
                    .eq('id', appId)
                    .single();

                if (data) setApplication(data);
                if (error) console.error("Error fetching app:", error);
            } catch (err) {
                console.error("Failed to load application", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [appId, auth.isAuthenticated]);

    // Setup PDF printing hooks
    const handlePrintResume = useReactToPrint({
        contentRef: resumePrintRef,
        documentTitle: `Resume_${application?.student_profiles?.full_name || 'Candidate'}`,
        pageStyle: `
            @page { size: auto; margin: 20mm; }
            @media print { body { -webkit-print-color-adjust: exact; background: white; } }
        `,
    });

    const handlePrintReport = useReactToPrint({
        contentRef: reportPrintRef,
        documentTitle: `ATS_Report_${application?.student_profiles?.full_name || 'Candidate'}`,
        pageStyle: `
            @page { size: auto; margin: 20mm; }
            @media print { body { -webkit-print-color-adjust: exact; background: white; } }
        `,
    });

    const handlePrintCombined = useReactToPrint({
        contentRef: combinedPrintRef,
        documentTitle: `Full_Application_${application?.student_profiles?.full_name || 'Candidate'}`,
        pageStyle: `
            @page { size: auto; margin: 20mm; }
            @media print { body { -webkit-print-color-adjust: exact; background: white; } }
        `,
    });

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </main>
        )
    }

    if (!application) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Application Not Found</h2>
                    <Link to="/recruiter" className="text-indigo-600 font-medium hover:underline mt-4 block">Return to Dashboard</Link>
                </div>
            </main>
        )
    }

    const student = application.student_profiles || {};
    const job = application.jobs || {};
    const feedback = application.resume_data?.feedback || {};
    const score = application.hybrid_score?.overallScore || feedback.overallScore || 0;

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen pb-24">
            <Navbar />
            
            <section className="max-w-7xl mx-auto px-4 mt-8">
                <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
                    <div>
                        <Link to={`/recruiter/job/${application.job_id}`} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold mb-3 hover:-translate-x-1 transition-transform">
                            <ChevronLeft size={20} /> Back to Applicant Pool
                        </Link>
                        <h1 className="text-4xl font-extrabold text-gray-900">{student.full_name || application.student_id}</h1>
                        <p className="text-gray-600 mt-2 font-medium text-lg">Applied for: <span className="text-gray-900 font-bold">{job.title}</span></p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                        {application.resume_data?.resumeUrl && (
                            <a 
                                href={application.resume_data.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all text-sm"
                            >
                                <ExternalLink size={16} /> View Original Upload
                            </a>
                        )}
                        <button 
                            onClick={handlePrintResume}
                            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-300 text-blue-700 font-semibold py-2 px-4 rounded-xl shadow-sm transition-all text-sm"
                        >
                            <Download size={16} /> Resume Only
                        </button>
                        <button 
                            onClick={handlePrintReport}
                            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-300 text-indigo-700 font-semibold py-2 px-4 rounded-xl shadow-sm transition-all text-sm"
                        >
                            <Download size={16} /> Explainer Only
                        </button>
                        <button 
                            onClick={handlePrintCombined}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all text-sm"
                        >
                            <Download size={16} /> Download Combined PDF
                        </button>
                    </div>
                </div>

                <div ref={combinedPrintRef}>
                    <style>{`
                        @media print {
                            .print-page-break { page-break-before: always; }
                            .combined-wrapper { font-family: sans-serif; }
                        }
                    `}</style>
                    <div className="combined-wrapper grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN: Resume Rendering */}
                        <div className="flex flex-col gap-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📄 Text Resume Data</h2>
                        
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8" ref={resumePrintRef}>
                            <style>{`
                                @media print {
                                    .printable-resume { box-shadow: none !important; border: none !important; }
                                    .bg-print-white { background-color: white !important; }
                                }
                            `}</style>
                            <div className="printable-resume bg-print-white h-full">
                                <h1 className="text-3xl font-black text-gray-900 text-center mb-1">{student.full_name || 'Candidate'}</h1>
                                <p className="text-center text-gray-600 text-sm mb-6 pb-6 border-b border-gray-200">
                                    {student.email} • {student.phone} • {student.city}, {student.country} 
                                    {student.linkedin_url && ` • ${student.linkedin_url}`}
                                </p>
                                
                                <div className="prose max-w-none text-gray-800 text-sm whitespace-pre-wrap font-serif leading-relaxed">
                                    {feedback.extractedText || "No raw text available. Candidate applied without standard extraction?"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: AI Feedback Report */}
                    <div className="flex flex-col gap-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">🤖 ATS Explainer & Evaluation</h2>
                        
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8 print-page-break h-full" ref={reportPrintRef}>
                            <style>{`
                                @media print {
                                    .printable-report { box-shadow: none !important; border: none !important; }
                                    .print-break-inside-avoid { break-inside: avoid; }
                                }
                            `}</style>
                            <div className="printable-report">
                                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-200">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">AI Application Report</h2>
                                        <p className="text-gray-500 font-medium">For: {student.full_name}</p>
                                    </div>
                                    <div className="text-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100">
                                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Match Factor</span>
                                        <span className={`text-4xl font-black ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {score}%
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="print-break-inside-avoid">
                                        <h3 className="text-lg font-bold text-gray-800 mb-3">Predicted Role Alignment</h3>
                                        <p className="bg-indigo-50 text-indigo-900 font-semibold p-4 rounded-xl border border-indigo-100">
                                            {feedback.roleClassification || 'General Candidate'}
                                        </p>
                                    </div>

                                    <div className="print-break-inside-avoid">
                                        <h3 className="text-lg font-bold text-gray-800 mb-3">Key Missing Skills</h3>
                                        {feedback.missingKeywords && feedback.missingKeywords.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {feedback.missingKeywords.map((kw: string, i: number) => (
                                                    <span key={i} className="bg-red-50 text-red-700 border border-red-100 px-3 py-1.5 rounded-lg text-sm font-medium">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No critical missing keywords detected.</p>
                                        )}
                                    </div>

                                    {feedback.bulletImpacts && feedback.bulletImpacts.length > 0 && (
                                        <div className="mt-8 print-break-inside-avoid">
                                            <h3 className="text-lg font-bold text-gray-800 mb-4">Experience Bullet Evaluation</h3>
                                            <div className="space-y-4">
                                                {feedback.bulletImpacts.slice(0, 5).map((bullet: any, i: number) => (
                                                    <div key={i} className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                                                        <p className="text-gray-800 mb-2 border-l-2 border-gray-300 pl-3">"{bullet.original}"</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${bullet.impact_level === 'high' || bullet.impact_level === 'strong' ? 'bg-green-100 text-green-700' : bullet.impact_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                {bullet.impact_level.toUpperCase()} IMPACT
                                                            </span>
                                                            <span className="text-gray-500 italic text-xs">{bullet.explanation}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </section>
        </main>
    )
}
