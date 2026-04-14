import { type FormEvent, useState, useEffect } from 'react';
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";
import { safeJsonParse } from "~/lib/safeJsonParse";
import { UnifiedFeedbackSchema } from "../../types/matching";
import { computeHybridScore } from "~/lib/matchingEngine";
import { extractTextFromPdf } from "~/lib/extractTextFromPdf";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelect = (files: File[]) => {
        setFiles(files)
    }

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, files }: { companyName: string, jobTitle: string, jobDescription: string, files: File[] }) => {
        setIsProcessing(true);

        let completed = 0;
        const total = files.length;

        for (const file of files) {
            try {
                const currentNum = completed + 1;
                setStatusText(`Processing ${currentNum} of ${total}: Uploading file...`);

                const uploadedFile = await fs.upload([file]);
                if (!uploadedFile) {
                    console.error(`Failed to upload ${file.name}`);
                    continue;
                }

                setStatusText(`Processing ${currentNum} of ${total}: Converting to image...`);
                const imageFile = await convertPdfToImage(file);
                if (!imageFile.file) {
                    console.error(`Failed to convert ${file.name}`);
                    continue;
                }

                setStatusText(`Processing ${currentNum} of ${total}: Uploading image...`);
                const uploadedImage = await fs.upload([imageFile.file]);
                if (!uploadedImage) {
                    console.error(`Failed to upload image for ${file.name}`);
                    continue;
                }

                setStatusText(`Processing ${currentNum} of ${total}: Preparing data...`);
                const uuid = generateUUID();
                const data = {
                    id: uuid,
                    resumePath: uploadedFile.path,
                    imagePath: uploadedImage.path,
                    companyName, jobTitle, jobDescription,
                    feedback: '',
                }
                await kv.set(`resume:${uuid}`, JSON.stringify(data));

                setStatusText(`Processing ${currentNum} of ${total}: Extracting text from PDF...`);
                let resumeText = '';
                try {
                    resumeText = await extractTextFromPdf(file);
                } catch (extractErr) {
                    console.error("Failed to extract text client-side:", extractErr);
                    // We'll proceed with empty text, maybe the AI can still read the file natively,
                    // but usually it's better to log it and continue.
                }

                setStatusText(`Processing ${currentNum} of ${total}: Analyzing with AI...`);

                const feedback = await ai.feedback(
                    uploadedFile.path,
                    prepareInstructions({ jobTitle, jobDescription, resumeText })
                )

                if (feedback) {
                    let feedbackText = typeof feedback.message.content === 'string'
                        ? feedback.message.content
                        : (feedback.message.content[0] as any).text;

                    console.log("RAW AI FEEDBACK:", feedbackText);

                    const parsedResult = safeJsonParse(feedbackText, UnifiedFeedbackSchema);

                    if (parsedResult.success) {
                        setStatusText(`Processing ${currentNum} of ${total}: Computing Hybrid Score (Embeddings)...`);

                        const hybrid = await computeHybridScore(
                            parsedResult.data.overallScore,
                            parsedResult.data.extractedText,
                            jobDescription,
                            parsedResult.data.extractedSkills,
                            parsedResult.data.jobDescriptionSkills,
                            (progressInfo: any) => {
                                if (progressInfo.status === 'progress') {
                                    setStatusText(`Downloading matching model: ${Math.round(progressInfo.progress)}%`);
                                }
                            }
                        );

                        data.feedback = {
                            ...parsedResult.data,
                            overallScore: hybrid.overallScore,
                            semanticScore: hybrid.semanticScore,
                            keywordScore: hybrid.keywordScore
                        } as any;

                        await kv.set(`resume:${uuid}`, JSON.stringify(data));
                        completed++;
                    } else {
                        let errObj = (parsedResult as any).error || {};
                        let parseErrMsg = JSON.stringify(errObj.issues || errObj.message || errObj);
                        console.error(`Failed to parse AI feedback as JSON for ${file.name}:`, feedbackText, errObj);
                        alert(`Error analyzing ${file.name}: The AI generated an invalid response format.\n\nDetails:\n${parseErrMsg}`);
                        setIsProcessing(false);
                        return; // Stop processing and don't redirect
                    }
                } else {
                    console.error(`Failed to analyze ${file.name}`);
                    alert(`Error analyzing ${file.name}: The AI failed to return a response.`);
                    setIsProcessing(false);
                    return; // Stop processing and don't redirect
                }
            } catch (error: any) {
                console.error(`Error processing ${file.name}:`, error);

                // Properly stringify the error instead of letting it become [object Object]
                const errorMessage = error instanceof Error
                    ? error.message
                    : typeof error === 'object'
                        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
                        : String(error);

                alert(`Error processing ${file.name}: ${errorMessage}`);
                setIsProcessing(false);
                return; // Stop processing and don't redirect
            }
        }

        setStatusText('Analysis complete! Redirecting...');
        // Wait a small moment so user sees completion
        setTimeout(() => {
            navigate('/');
        }, 1000);
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
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resumes for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" required />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" required />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" required />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume(s)</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze {files.length > 1 ? `${files.length} Resumes` : 'Resume'}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
