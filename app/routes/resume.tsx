import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import RoleAnalysis from "~/components/RoleAnalysis";
import GrammarAndStyle from "~/components/GrammarAndStyle";
import BulletStrength from "~/components/BulletStrength";
import { useBuilderStore } from "~/lib/builderStore";
import { textToResumeHTML } from "~/lib/textToResumeHTML";
import { extractTextFromPdf } from "~/lib/extractTextFromPdf";
import { Edit3, Loader2 } from "lucide-react";
import AudioPitch from "~/components/AudioPitch";

type TabType = 'ats' | 'grammar' | 'bullets' | 'audio';

export const meta = () => ([
    { title: 'AIRC | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { setDocHTML } = useBuilderStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [resumeData, setResumeData] = useState<Resume | null>(null);
    const feedback = resumeData?.feedback;
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [analysisError, setAnalysisError] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('ats');
    const [isConverting, setIsConverting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            const resume = await kv.get(`resume:${id}`);

            if (!resume) return;

            const data = JSON.parse(resume);

            const resumeBlob = await fs.read(data.resumePath);
            if (!resumeBlob) return;

            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
            setPdfBlob(pdfBlob);
            const resumeUrl = URL.createObjectURL(pdfBlob);
            setResumeUrl(resumeUrl);

            const imageBlob = await fs.read(data.imagePath);
            if (!imageBlob) return;
            const imageUrl = URL.createObjectURL(imageBlob);
            setImageUrl(imageUrl);

            setResumeData(data);
            if (!data.feedback || data.feedback === '') {
                setAnalysisError(true);
            }
            console.log({ resumeUrl, imageUrl, feedback: data.feedback });
        }

        loadResume();
    }, [id]);

    const handleFixInEditor = async () => {
        if (!pdfBlob) {
            alert('Resume PDF not loaded yet. Please wait.');
            return;
        }

        setIsConverting(true);
        try {
            // Extract text directly from the PDF file using PDF.js
            const rawText = await extractTextFromPdf(pdfBlob);

            // Convert to structured HTML and load into editor
            const htmlContent = textToResumeHTML(rawText);
            setDocHTML(htmlContent);
            navigate('/builder');
        } catch (err) {
            console.error('Failed to extract text from PDF:', err);
            alert('Failed to read the PDF. Please try again.');
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <div className="flex justify-between items-center w-full max-w-3xl">
                        <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                        {pdfBlob && (
                            <button
                                onClick={handleFixInEditor}
                                disabled={isConverting}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
                            >
                                {isConverting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Extracting...
                                    </>
                                ) : (
                                    <>
                                        <Edit3 className="w-4 h-4" />
                                        Fix in Editor
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full max-w-3xl">
                            {/* Tabs Navigation */}
                            <div className="flex gap-2 border-b border-gray-200 pb-2">
                                <button
                                    onClick={() => setActiveTab('ats')}
                                    className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'ats' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                                >
                                    ATS Match
                                </button>
                                <button
                                    onClick={() => setActiveTab('grammar')}
                                    className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'grammar' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                                >
                                    Grammar & Style
                                </button>
                                <button
                                    onClick={() => setActiveTab('bullets')}
                                    className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'bullets' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                                >
                                    Bullet Strength
                                </button>
                                <button
                                    onClick={() => setActiveTab('audio')}
                                    className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'audio' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                                >
                                    Audio Pitch
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'ats' && (
                                <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                                    <Summary feedback={feedback} />
                                    <RoleAnalysis role={feedback.roleClassification} missingKeywords={feedback.missingKeywords} />
                                    <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                                    <Details feedback={feedback} />
                                </div>
                            )}

                            {activeTab === 'grammar' && (
                                <GrammarAndStyle feedback={feedback} />
                            )}

                            {activeTab === 'bullets' && (
                                <BulletStrength feedback={feedback} />
                            )}

                            {activeTab === 'audio' && resumeData && (
                                <AudioPitch 
                                    resumeId={id as string} 
                                    resumeData={resumeData} 
                                    onUpdate={(updatedData) => setResumeData(updatedData)} 
                                />
                            )}
                        </div>
                    ) : analysisError ? (
                        <div className="flex flex-col gap-4 items-center justify-center h-full">
                            <h3 className="text-2xl font-bold text-red-500">Analysis Failed</h3>
                            <p className="text-gray-600">The AI could not generate valid feedback for this resume. Please delete the resume and try again.</p>
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
