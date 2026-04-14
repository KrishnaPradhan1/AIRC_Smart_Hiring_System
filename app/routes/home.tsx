import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "AIRC" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, isLoading, kv, fs } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      if (!isLoading) navigate('/auth?next=/');
    } else if (auth.role === 'recruiter') {
      navigate('/recruiter');
    }
  }, [auth.isAuthenticated, auth.role])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const resumes = (await kv.list('resume:*', true)) as KVItem[];

      const parsedResumes = resumes
        ?.filter((resume) => resume.value && resume.value !== '')
        .map((resume) => JSON.parse(resume.value) as Resume);

      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    }

    loadResumes()
  }, []);

  const handleDeleteResume = async (id: string) => {
    // Find the resume data to get file paths before removing from state
    const resumeData = resumes.find(r => r.id === id);

    // Remove from UI immediately
    setResumes(prev => prev.filter(r => r.id !== id));

    // Clean up storage in background (best-effort)
    try {
      await kv.set(`resume:${id}`, '');  // Clear the KV entry (overwrite with empty)
    } catch (e) {
      console.warn('KV cleanup failed:', e);
    }

    // Try to delete files (may fail if paths don't exist — that's ok)
    if (resumeData?.resumePath) {
      try { await fs.delete(resumeData.resumePath); } catch { /* ignore */ }
    }
    if (resumeData?.imagePath) {
      try { await fs.delete(resumeData.imagePath); } catch { /* ignore */ }
    }
  };

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumes?.length === 0 ? (
          <h2>No resumes found. Upload your first resume to get feedback.</h2>
        ) : (
          <h2>Review your submissions and check AI-powered feedback.</h2>
        )}
      </div>
      {loadingResumes && (
        <div className="flex flex-col items-center justify-center">
          <img src="/images/resume-scan-2.gif" className="w-[200px]" />
        </div>
      )}

      {!loadingResumes && resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} onDelete={handleDeleteResume} />
          ))}
        </div>
      )}

      {!loadingResumes && resumes?.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-10 gap-4">
          <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
            Upload Resume
          </Link>
        </div>
      )}
    </section>
  </main>
}
