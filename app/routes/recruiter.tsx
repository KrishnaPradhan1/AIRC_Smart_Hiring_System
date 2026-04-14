import { type FormEvent, useState, useEffect } from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate, useLocation } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";
import { safeJsonParse } from "~/lib/safeJsonParse";
import { UnifiedFeedbackSchema } from "../../types/matching";
import { computeHybridScore } from "~/lib/matchingEngine";
import { extractTextFromPdf } from "~/lib/extractTextFromPdf";
import { supabase } from "~/lib/supabase";
import { Copy, PlusCircle, Users } from "lucide-react";

interface CandidateResult {
    id: string;
    name: string;
    overallScore: number;
    semanticScore: number;
    keywordScore: number;
    colorBucket: 'green' | 'amber' | 'red';
}

const RecruiterDashboard = () => {
    const { fs, ai, kv, auth } = usePuterStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'jobs' | 'batch'>('jobs');
    
    // Sync React-Router state to Navbar navigations
    useEffect(() => {
        if (location.search.includes('history')) {
            setActiveTab('batch');
            setShowPreviousBatches(true);
        } else if (location.search === '') {
            // "Home" button clicked from Navbar drops search queries
            setActiveTab('jobs');
        }
    }, [location.search]);
    
    // Batch Screen State
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [fairnessMode, setFairnessMode] = useState(false);
    const [results, setResults] = useState<CandidateResult[]>([]);
    const [previousBatches, setPreviousBatches] = useState<CandidateResult[]>([]);
    const [showPreviousBatches, setShowPreviousBatches] = useState(false);

    // Jobs State
    const [jobs, setJobs] = useState<any[]>([]);
    const [isCreatingJob, setIsCreatingJob] = useState(false);
    const [isSavingJob, setIsSavingJob] = useState(false);

    useEffect(() => {
        if (!auth.isAuthenticated || !auth.user?.username) {
            // Unauthenticated
        } else if (auth.role === 'student') {
            navigate('/');
        } else {
            const fetchJobs = async () => {
                const { data, error } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('recruiter_id', auth.user!.username)
                    .order('created_at', { ascending: false });
                
                if (data) setJobs(data);
            };
            fetchJobs();
        }
    }, [auth.isAuthenticated, auth.user, auth.role, navigate]);

    const handleCreateJob = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSavingJob(true);
        const form = e.currentTarget;
        const fd = new FormData(form);
        
        try {
            if (!auth.user?.username) throw new Error("User disconnected");
            const { data, error } = await supabase.from('jobs').insert({
                recruiter_id: auth.user.username,
                title: fd.get('title') as string,
                description: fd.get('description') as string
            }).select().single();

            // Notify recruiter if insert fails
            if (error) {
                throw new Error(error.message || "Insert failed");
            }

            if (data) {
                setJobs([data, ...jobs]);
                setIsCreatingJob(false);
                form.reset();
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to create job post. " + err.message);
        } finally {
            setIsSavingJob(false);
        }
    }

    const handleFileSelect = (selectedFiles: File[]) => {
        if (selectedFiles.length > 100) {
            alert(`You selected ${selectedFiles.length} files. The batch screen is optimized for a maximum of 100 resumes at a time. Truncating to the first 100.`);
            setFiles(selectedFiles.slice(0, 100));
        } else {
            setFiles(selectedFiles);
        }
    }

    const getColorBucket = (score: number): 'green' | 'amber' | 'red' => {
        if (score >= 75) return 'green';
        if (score >= 50) return 'amber';
        return 'red';
    }

    useEffect(() => {
        if (activeTab !== 'batch') return;
        
        const loadPreviousBatches = async () => {
            const allResumes = (await kv.list('resume:*', true)) as any[];
            const validResults: CandidateResult[] = [];
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();

            for (const resumeItem of allResumes || []) {
                if (!resumeItem.value) continue;
                try {
                    const parsed = JSON.parse(resumeItem.value);
                    if (parsed.createdAt && (now - parsed.createdAt > thirtyDaysMs)) {
                        await kv.set(`resume:${parsed.id}`, '');
                        if (parsed.resumePath) await fs.delete(parsed.resumePath).catch(() => null);
                        if (parsed.imagePath) await fs.delete(parsed.imagePath).catch(() => null);
                        continue;
                    }
                    if (parsed.feedback && parsed.feedback.overallScore) {
                        validResults.push({
                            id: parsed.id,
                            name: parsed.fileName || parsed.id.split('-')[0],
                            overallScore: parsed.feedback.overallScore,
                            semanticScore: parsed.feedback.semanticScore || 0,
                            keywordScore: parsed.feedback.keywordScore || 0,
                            colorBucket: getColorBucket(parsed.feedback.overallScore)
                        });
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
            
            validResults.sort((a,b) => b.overallScore - a.overallScore);
            setPreviousBatches(validResults);
        }
        loadPreviousBatches();
    }, [activeTab, kv, fs]);

    // Helper to run promises with a concurrency limit
    const asyncPool = async <T,>(poolLimit: number, array: any[], iteratorFn: (item: any) => Promise<T>): Promise<T[]> => {
        const ret: Promise<T>[] = [];
        const executing = new Set<Promise<T>>();
        for (const item of array) {
            const p = Promise.resolve().then(() => iteratorFn(item));
            ret.push(p);
            executing.add(p);
            const clean = () => executing.delete(p);
            p.then(clean).catch(clean);
            if (executing.size >= poolLimit) {
                await Promise.race(executing);
            }
        }
        return Promise.all(ret);
    };

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, files }: { companyName: string, jobTitle: string, jobDescription: string, files: File[] }) => {
        setIsProcessing(true);
        setResults([]);

        let completed = 0;
        const total = files.length;
        const newResults: CandidateResult[] = [];

        // Process files with a concurrency limit of 3
        await asyncPool(3, files, async (file: File) => {
            try {
                const currentNum = completed + 1;
                setStatusText(`Processing ${file.name} (${currentNum} of ${total})... Uploading...`);

                const uploadedFile = await fs.upload([file]);
                if (!uploadedFile) {
                    console.error(`Failed to upload ${file.name}`);
                    return;
                }

                setStatusText(`Processing ${file.name}: Converting to image...`);
                const imageFile = await convertPdfToImage(file);
                if (!imageFile.file) return;

                const uploadedImage = await fs.upload([imageFile.file]);
                if (!uploadedImage) return;

                setStatusText(`Processing ${file.name}: Extracting text from PDF...`);
                let resumeText = '';
                try {
                    resumeText = await extractTextFromPdf(file);
                } catch (extractErr) {
                    console.error(`Failed to extract text client-side for ${file.name}:`, extractErr);
                }

                setStatusText(`Processing ${file.name}: Analyzing with LLM...`);
                const uuid = generateUUID();
                const data = {
                    id: uuid,
                    resumePath: uploadedFile.path,
                    imagePath: uploadedImage.path,
                    companyName, jobTitle, jobDescription,
                    feedback: {},
                    createdAt: Date.now(),
                    fileName: file.name
                }

                let promptInstructions = prepareInstructions({ jobTitle, jobDescription, resumeText });
                if (fairnessMode) {
                    promptInstructions += `\n\nFAIRNESS MODE ACTIVE: Please evaluate without bias regarding gender, age, or ethnicity. Ignore names, emails, and identifying info. focus purely on skills and experience matching.`;
                }

                const feedback = await ai.feedback(uploadedFile.path, promptInstructions);

                if (feedback) {
                    let feedbackText = typeof feedback.message.content === 'string'
                        ? feedback.message.content
                        : (feedback.message.content[0] as any).text;

                    const parsedResult = safeJsonParse(feedbackText, UnifiedFeedbackSchema);

                    if (parsedResult.success) {
                        setStatusText(`Processing ${file.name}: Computing Hybrid Engine Scores...`);

                        const hybrid = await computeHybridScore(
                            parsedResult.data.overallScore,
                            parsedResult.data.extractedText,
                            jobDescription,
                            parsedResult.data.extractedSkills,
                            parsedResult.data.jobDescriptionSkills,
                            (progressInfo: any) => {
                                if (progressInfo.status === 'progress') {
                                    setStatusText(`Processing ${file.name}: Loading ML model ${Math.round(progressInfo.progress)}%`);
                                }
                            }
                        );

                        const finalScore = hybrid.overallScore;

                        data.feedback = {
                            ...parsedResult.data,
                            overallScore: finalScore,
                            semanticScore: hybrid.semanticScore,
                            keywordScore: hybrid.keywordScore
                        } as any;

                        await kv.set(`resume:${uuid}`, JSON.stringify(data));

                        // Push to results table
                        newResults.push({
                            id: uuid,
                            name: file.name.replace('.pdf', ''), // Fallback to filename
                            overallScore: finalScore,
                            semanticScore: hybrid.semanticScore,
                            keywordScore: hybrid.keywordScore,
                            colorBucket: getColorBucket(finalScore)
                        });

                        completed++;
                    } else {
                        let errObj = (parsedResult as any).error || {};
                        let parseErrMsg = JSON.stringify(errObj.issues || errObj.message || errObj);
                        console.error(`Skipping ${file.name} due to parse error:`, parseErrMsg);
                    }
                }
            } catch (error: any) {
                console.error(`Error processing ${file.name}:`, error);
            }
        });

        // Sort results descending by overall score
        newResults.sort((a, b) => b.overallScore - a.overallScore);

        setResults(newResults);
        setIsProcessing(false);
        setStatusText('');
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if (files.length === 0) {
            alert("Please upload at least one resume.");
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, files });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />

            <section className="main-section pb-24">
                <div className="page-heading py-8">
                    <h1>Recruiter Dashboard</h1>
                    <h2>Manage Job Postings and Screen Candidates</h2>
                </div>

                <div className="flex justify-center mb-8">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
                        <button 
                            onClick={() => setActiveTab('jobs')}
                            className={`px-8 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'jobs' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            My Job Postings
                        </button>
                        <button 
                            onClick={() => setActiveTab('batch')}
                            className={`px-8 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'batch' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Manual Batch Screen
                        </button>
                    </div>
                </div>

                {activeTab === 'jobs' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">Active Job Postings</h3>
                            <button 
                                onClick={() => setIsCreatingJob(!isCreatingJob)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md"
                            >
                                <PlusCircle size={20} />
                                {isCreatingJob ? 'Cancel' : 'Create New Job'}
                            </button>
                        </div>

                        {isCreatingJob && (
                            <form onSubmit={handleCreateJob} className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50 mb-10 w-full animate-in fade-in slide-in-from-top-4">
                                <h4 className="text-xl font-bold mb-6 text-gray-800">Post a New Job</h4>
                                <div className="form-div mb-4">
                                    <label className="text-sm font-semibold text-gray-700">Job Title</label>
                                    <input type="text" name="title" required placeholder="E.g. Senior Product Designer" className="w-full bg-gray-50" />
                                </div>
                                <div className="form-div mb-6">
                                    <label className="text-sm font-semibold text-gray-700">Job Description</label>
                                    <textarea name="description" required rows={6} placeholder="Paste the full job requirements and responsibilities..." className="w-full bg-gray-50 resize-y" />
                                </div>
                                <button type="submit" disabled={isSavingJob} className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all ${isSavingJob ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                    {isSavingJob ? 'Generating Link...' : 'Create & Generate Apply Link'}
                                </button>
                            </form>
                        )}

                        <div className="grid gap-6">
                            {jobs.length === 0 && !isCreatingJob && (
                                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
                                    <h3 className="text-xl font-bold text-gray-600 mb-2">No active jobs found</h3>
                                    <p className="text-gray-500">Create a job post to generate a sharing link for candidates to apply securely.</p>
                                </div>
                            )}

                            {jobs.map((job) => {
                                const applyUrl = `${window.location.origin}/apply/${job.id}`;
                                return (
                                    <div key={job.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-xl font-bold text-gray-900">{job.title}</h4>
                                                <p className="text-sm text-gray-500 mt-1">Created on {new Date(job.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <Link to={`/recruiter/job/${job.id}`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-semibold transition-colors">
                                                <Users size={18} />
                                                View Applicants
                                            </Link>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                            <div className="flex-1 truncate mr-4">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Public Apply Link</span>
                                                <span className="text-indigo-600 font-medium truncate inline-block w-full">{applyUrl}</span>
                                            </div>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(applyUrl); alert('Link Copied!') }}
                                                className="p-2.5 bg-white text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg hover:text-indigo-600 shadow-sm transition-all"
                                                title="Copy Apply Link"
                                            >
                                                <Copy size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'batch' && (
                    <div className="w-full">
                        {results.length > 0 && !isProcessing && (
                            <div className="w-full">
                                <h3 className="text-2xl font-bold mb-4 text-left">Ranked Candidates</h3>
                                <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100 p-2">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                                <th className="p-4 font-semibold rounded-tl-lg">Candidate</th>
                                                <th className="p-4 font-semibold">Match Score</th>
                                                <th className="p-4 font-semibold">Semantic</th>
                                                <th className="p-4 font-semibold">Keyword</th>
                                                <th className="p-4 font-semibold text-right rounded-tr-lg">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {results.map((r) => (
                                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 font-medium text-gray-900">{r.name}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${r.colorBucket === 'green' ? 'bg-green-100 text-green-700' :
                                                            r.colorBucket === 'amber' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {r.overallScore}/100
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-600">{r.semanticScore}%</td>
                                                    <td className="p-4 text-gray-600">{r.keywordScore}%</td>
                                                    <td className="p-4 text-right flex justify-end gap-2">
                                                        <Link to={`/resume/${r.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-all">
                                                            View Details
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <button onClick={() => setResults([])} className="mt-8 text-gray-500 hover:text-gray-900 underline">
                                    Start a New Batch
                                </button>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="mt-12 w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6 border border-gray-100">
                                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                <h3 className="text-xl font-semibold text-gray-800 animate-pulse">{statusText}</h3>
                            </div>
                        )}

                        {!isProcessing && results.length === 0 && (
                            <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl mx-auto w-full bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white/50">
                                <div className="form-div">
                                    <label htmlFor="company-name" className="text-gray-700 font-semibold">Company Name</label>
                                    <input type="text" name="company-name" placeholder="E.g. Acme Corp" id="company-name" required className="w-full" />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-title" className="text-gray-700 font-semibold">Job Title</label>
                                    <input type="text" name="job-title" placeholder="E.g. Senior Software Engineer" id="job-title" required className="w-full" />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-description" className="text-gray-700 font-semibold">Job Description</label>
                                    <textarea rows={6} name="job-description" placeholder="Paste the full job description here..." id="job-description" required className="w-full resize-none" />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="fairness-toggle"
                                        checked={fairnessMode}
                                        onChange={(e) => setFairnessMode(e.target.checked)}
                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <div className="flex flex-col text-left">
                                        <label htmlFor="fairness-toggle" className="text-gray-900 font-semibold cursor-pointer">Enable PII-Blind Fairness Mode</label>
                                        <span className="text-sm text-gray-500">Evaluates candidates without bias by avoiding gender, age, and names in the scoring prompt.</span>
                                    </div>
                                </div>

                                <div className="form-div mt-2">
                                    <label htmlFor="uploader" className="text-gray-700 font-semibold">Upload Candidate Resumes (Batch)</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                        <FileUploader onFileSelect={handleFileSelect} />
                                    </div>
                                    {files.length > 0 && (
                                        <p className="text-sm text-green-600 font-medium mt-2">
                                            ✓ {files.length} file(s) selected ready for batch processing.
                                        </p>
                                    )}
                                </div>

                                <button className="primary-button w-full mt-4 text-lg py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" type="submit">
                                    Batch Analyze {files.length > 0 ? `(${files.length} Resumes)` : ''}
                                </button>
                            </form>
                        )}
                        
                        {!isProcessing && results.length === 0 && previousBatches.length > 0 && (
                            <div className="mt-12 w-full max-w-3xl mx-auto">
                                <button 
                                    onClick={() => setShowPreviousBatches(!showPreviousBatches)}
                                    className="w-full flex items-center justify-between text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-4 rounded-xl font-bold transition-colors border border-indigo-100"
                                >
                                    <span>View Previously Screened Resumes ({previousBatches.length})</span>
                                    <span>{showPreviousBatches ? '▼' : '►'}</span>
                                </button>
                                
                                {showPreviousBatches && (
                                    <div className="mt-4 overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100 p-2 animate-in fade-in slide-in-from-top-4">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                                    <th className="p-4 font-semibold rounded-tl-lg">Candidate</th>
                                                    <th className="p-4 font-semibold">Match Score</th>
                                                    <th className="p-4 font-semibold">Semantic</th>
                                                    <th className="p-4 font-semibold">Keyword</th>
                                                    <th className="p-4 font-semibold text-right rounded-tr-lg">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {previousBatches.map((r) => (
                                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-4 font-medium text-gray-900 truncate max-w-[150px]" title={r.name}>{r.name}</td>
                                                        <td className="p-4">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${r.colorBucket === 'green' ? 'bg-green-100 text-green-700' :
                                                                r.colorBucket === 'amber' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {r.overallScore}/100
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-gray-600">{r.semanticScore}%</td>
                                                        <td className="p-4 text-gray-600">{r.keywordScore}%</td>
                                                        <td className="p-4 text-right">
                                                            <Link to={`/resume/${r.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-all">
                                                                View Details
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section >
        </main >
    )
}

export default RecruiterDashboard;
