import { Link } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import { Trash2 } from "lucide-react";

const ResumeCard = ({
    resume: { id, companyName, jobTitle, feedback, imagePath },
    onDelete,
}: {
    resume: Resume;
    onDelete?: (id: string) => void;
}) => {
    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadResume = async () => {
            const blob = await fs.read(imagePath);
            if (!blob) return;
            let url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }

        loadResume();
    }, [imagePath]);

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigating via the parent <Link>
        e.stopPropagation();

        if (!confirm('Are you sure you want to delete this resume? This cannot be undone.')) return;

        setIsDeleting(true);
        onDelete?.(id);
    };

    return (
        <div className="relative group">
            <Link to={`/resume/${id}`} className={`resume-card animate-in fade-in duration-1000 ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="resume-card-header">
                    <div className="flex flex-col gap-2">
                        {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
                        {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
                        {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
                    </div>
                    <div className="flex-shrink-0">
                        <ScoreCircle score={feedback?.overallScore || 0} />
                    </div>
                </div>
                {resumeUrl && (
                    <div className="gradient-border animate-in fade-in duration-1000">
                        <div className="w-full h-full">
                            <img
                                src={resumeUrl}
                                alt="resume"
                                className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
                            />
                        </div>
                    </div>
                )}
            </Link>

            {/* Delete Button — floats top-right on hover */}
            {onDelete && (
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 cursor-pointer disabled:opacity-50"
                    title="Delete resume"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    )
}
export default ResumeCard
