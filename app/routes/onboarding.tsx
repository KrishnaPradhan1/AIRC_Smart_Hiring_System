import React, { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { supabase } from "~/lib/supabase";
import { GraduationCap, Building2, Plus, Trash2 } from "lucide-react";

const Onboarding = () => {
    const { auth } = usePuterStore();
    const location = useLocation();
    const navigate = useNavigate();
    
    const urlParams = new URLSearchParams(location.search);
    const role = urlParams.get('role') || 'student';
    const isStudent = role === 'student';

    const [isSaving, setIsSaving] = useState(false);

    // Dynamic Arrays State for Student Profile
    const [education, setEducation] = useState<any[]>([]);
    const [experience, setExperience] = useState<any[]>([]);

    const addEducation = () => setEducation([...education, { degree: '', institute: '' }]);
    const updateEducation = (index: number, field: string, value: string) => {
        const newEdu = [...education];
        newEdu[index] = { ...newEdu[index], [field]: value };
        setEducation(newEdu);
    };
    const removeEducation = (index: number) => setEducation(education.filter((_, i) => i !== index));

    const addExperience = () => setExperience([...experience, { company: '', role: '', duration: '' }]);
    const updateExperience = (index: number, field: string, value: string) => {
        const newExp = [...experience];
        newExp[index] = { ...newExp[index], [field]: value };
        setExperience(newExp);
    };
    const removeExperience = (index: number) => setExperience(experience.filter((_, i) => i !== index));

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const userId = auth.user?.username;

        if (!userId) {
            alert("Session missing. Please log in again.");
            navigate('/auth');
            return;
        }

        try {
            // Guarantee the root profile exists for FK constraints
            try {
                const { error: rootError } = await supabase.from('profiles').upsert({
                    id: userId,
                    role: isStudent ? 'student' : 'recruiter'
                });
                if (rootError) throw rootError;
            } catch (supaErr: any) {
                console.warn('Could not sync root profile to Supabase:', supaErr);
                if (supaErr?.message && !supaErr.message.includes('fetch')) throw supaErr;
            }

            if (isStudent) {
                try {
                    const { error } = await supabase.from('student_profiles').upsert({
                        id: userId,
                        full_name: formData.get('full_name') as string,
                        phone: formData.get('phone') as string,
                        email: formData.get('email') as string,
                        linkedin_url: formData.get('linkedin_url') as string,
                        institute: formData.get('institute') as string,
                        city: formData.get('city') as string,
                        state: formData.get('state') as string,
                        country: formData.get('country') as string,
                        experience: experience,
                        education: education
                    });
                    if (error) throw error;
                } catch (supaErr: any) {
                    console.warn('Could not sync student profile:', supaErr);
                    if (supaErr?.message && !supaErr.message.includes('fetch')) throw supaErr;
                }
                
                // Update local Zustand cache natively without full reload
                localStorage.setItem('userRole', 'student');
                auth.refreshUser();
                
                const nextRoute = urlParams.get('next');
                navigate(nextRoute || '/');
            } else {
                try {
                    const { error } = await supabase.from('recruiter_profiles').upsert({
                        id: userId,
                        corporate_email: formData.get('corporate_email') as string,
                        company_name: formData.get('company_name') as string,
                        location: formData.get('location') as string,
                        contact_details: formData.get('contact_details') as string,
                    });
                    if (error) throw error;
                } catch (supaErr: any) {
                    console.warn('Could not sync recruiter profile:', supaErr);
                    if (supaErr?.message && !supaErr.message.includes('fetch')) throw supaErr;
                }
                
                // Update local Zustand cache
                localStorage.setItem('userRole', 'recruiter');
                auth.refreshUser();
                
                const nextRoute = urlParams.get('next');
                navigate(nextRoute || '/recruiter');
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to save profile: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!auth.isAuthenticated) {
        return <div className="p-8 text-center text-gray-500">Redirecting to login...</div>;
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen pt-20 pb-20 px-4 flex justify-center">
            <div className="max-w-xl w-full">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white">
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className={`p-4 rounded-2xl mb-4 ${isStudent ? 'bg-blue-100 text-blue-600 shadow-lg shadow-blue-500/20' : 'bg-indigo-100 text-indigo-600 shadow-lg shadow-indigo-500/20'}`}>
                            {isStudent ? <GraduationCap size={40} /> : <Building2 size={40} />}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
                        <p className="text-gray-500">
                            Tell us a bit more about {isStudent ? "yourself" : "your company"} to get started.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {isStudent ? (
                            <>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                    <input type="text" name="full_name" required placeholder="John Doe" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                                        <input type="tel" name="phone" required placeholder="+1 234 567 8900" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                    </div>
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Email Address</label>
                                        <input type="email" name="email" required placeholder="john@example.com" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                    </div>
                                </div>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">LinkedIn URL (Optional)</label>
                                    <input type="url" name="linkedin_url" placeholder="https://linkedin.com/in/johndoe" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                </div>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">University / Institute</label>
                                    <input type="text" name="institute" required placeholder="Harvard University" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                </div>
                                <div className="grid grid-cols-3 gap-5">
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">City</label>
                                        <input type="text" name="city" required placeholder="Boston" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                    </div>
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">State</label>
                                        <input type="text" name="state" required placeholder="MA" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                    </div>
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Country</label>
                                        <input type="text" name="country" required placeholder="USA" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                    </div>
                                </div>

                                <hr className="border-gray-100 my-4" />

                                {/* Education Section */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 w-full">Education History (Optional)</h3>
                                    </div>
                                    {education.map((edu, idx) => (
                                        <div key={idx} className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl relative">
                                            <button type="button" onClick={() => removeEducation(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                            <div className="grid grid-cols-2 gap-4 pr-8">
                                                <div className="form-div">
                                                    <label className="text-xs font-semibold text-gray-600">Degree / Qualification</label>
                                                    <input type="text" value={edu.degree || ''} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} placeholder="e.g. Diploma in CS, B.Tech, Master's" className="w-full bg-white border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm" />
                                                </div>
                                                <div className="form-div">
                                                    <label className="text-xs font-semibold text-gray-600">Institution Name</label>
                                                    <input type="text" value={edu.institute || ''} onChange={(e) => updateEducation(idx, 'institute', e.target.value)} placeholder="University Name" className="w-full bg-white border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addEducation} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 w-fit px-4 py-2 rounded-lg transition-colors">
                                        <Plus size={16} /> Add Education Entry
                                    </button>
                                </div>

                                <hr className="border-gray-100 my-4" />

                                {/* Experience Section */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 w-full">Professional Experience (Optional)</h3>
                                    </div>
                                    {experience.map((exp, idx) => (
                                        <div key={idx} className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl relative">
                                            <button type="button" onClick={() => removeExperience(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                            <div className="grid grid-cols-2 gap-4 pr-8">
                                                <div className="form-div">
                                                    <label className="text-xs font-semibold text-gray-600">Company Name</label>
                                                    <input type="text" value={exp.company || ''} onChange={(e) => updateExperience(idx, 'company', e.target.value)} placeholder="e.g. Google, Startup Inc" className="w-full bg-white border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm" />
                                                </div>
                                                <div className="form-div">
                                                    <label className="text-xs font-semibold text-gray-600">Job Title / Role</label>
                                                    <input type="text" value={exp.role || ''} onChange={(e) => updateExperience(idx, 'role', e.target.value)} placeholder="Software Engineer" className="w-full bg-white border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm" />
                                                </div>
                                                <div className="form-div col-span-2">
                                                    <label className="text-xs font-semibold text-gray-600">Duration / Time Period</label>
                                                    <input type="text" value={exp.duration || ''} onChange={(e) => updateExperience(idx, 'duration', e.target.value)} placeholder="e.g. 2 Years, Jan 2021 - Present" className="w-full bg-white border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addExperience} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 w-fit px-4 py-2 rounded-lg transition-colors">
                                        <Plus size={16} /> Add Work Experience
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">Company Name</label>
                                    <input type="text" name="company_name" required placeholder="Example Corp" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                </div>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">Corporate Email</label>
                                    <input type="email" name="corporate_email" required placeholder="hr@example.com" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                </div>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">Company Location</label>
                                    <input type="text" name="location" required placeholder="San Francisco, CA" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                </div>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">Main Contact Details / Phone</label>
                                    <input type="text" name="contact_details" required placeholder="+1 800 123 4567" className="w-full bg-gray-50 border-gray-200 focus:bg-white" />
                                </div>
                            </>
                        )}

                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`w-full mt-6 py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all ${isSaving ? 'bg-gray-400' : isStudent ? 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'}`}
                        >
                            {isSaving ? "Saving..." : "Complete Setup"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}

export default Onboarding;
