import React, { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { supabase } from "~/lib/supabase";
import Navbar from "~/components/Navbar";
import { User, Shield, CheckCircle, AlertCircle, Plus, Trash2 } from "lucide-react";

export default function ProfileSettings() {
    const { auth } = usePuterStore();
    const navigate = useNavigate();

    const effectiveRole = auth.role || (typeof window !== 'undefined' ? localStorage.getItem('userRole') : null) || 'student';

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

    // Profile data
    const [profileData, setProfileData] = useState<any>({});
    
    // Dynamic Arrays State
    const [education, setEducation] = useState<any[]>([]);
    const [experience, setExperience] = useState<any[]>([]);

    useEffect(() => {
        if (!auth.isAuthenticated || !auth.user?.username) {
            navigate('/auth?next=/profile');
            return;
        }

        const fetchProfile = async () => {
            try {
                if (auth.role === 'student') {
                    const { data } = await supabase.from('student_profiles').select('*').eq('id', auth.user!.username).single();
                    if (data) {
                        setProfileData(data);
                        setEducation(data.education || []);
                        setExperience(data.experience || []);
                    }
                } else if (auth.role === 'recruiter') {
                    const { data } = await supabase.from('recruiter_profiles').select('*').eq('id', auth.user!.username).single();
                    if (data) setProfileData(data);
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProfile();
    }, [auth.isAuthenticated, auth.user, auth.role, navigate]);

    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveStatus(null);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const updates: any = {};
        
        // Only capture top-level string fields natively
        formData.forEach((value, key) => {
            if (!key.startsWith('edu_') && !key.startsWith('exp_')) {
                updates[key] = value.toString();
            }
        });

        // Inject our JSON arrays
        if (effectiveRole === 'student') {
            updates.education = education;
            updates.experience = experience;
        }

        try {
            const table = auth.role === 'student' ? 'student_profiles' : 'recruiter_profiles';
            const { error } = await supabase.from(table).update(updates).eq('id', auth.user!.username);
            if (error) throw error;
            setSaveStatus({ type: 'success', message: 'Profile updated successfully!' });
        } catch (err: any) {
            console.error(err);
            setSaveStatus({ type: 'error', message: err.message || 'Failed to update profile' });
        } finally {
            setIsSaving(false);
        }
    };

    // Array manipulation helpers
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

    const handleSwitchRole = async (targetRole: 'student' | 'recruiter') => {
        const currentRole = auth.role || localStorage.getItem('userRole') || 'student';
        if (currentRole === targetRole) {
            alert(`You are already registered as a ${targetRole}!`);
            return;
        }
        if (!confirm(`Are you sure you want to switch your account to a ${targetRole === 'student' ? 'Candidate' : 'Recruiter'}?`)) return;
        
        setIsSwitchingRole(true);
        try {
            const newRole = targetRole;
            
            try {
                const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', auth.user!.username);
                if (error) throw error;
            } catch (supaErr: any) {
                console.warn('Could not sync role to Supabase (might be offline):', supaErr);
                if (supaErr?.message && !supaErr.message.includes('fetch')) {
                    throw supaErr;
                }
            }
            
            // Offline fallback / persistence
            localStorage.setItem('userRole', newRole);
            
            // Force refresh global state
            await auth.refreshUser();
            
            // Redirect to onboarding so they can establish the new identity schema
            navigate(`/onboarding?role=${newRole}`);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to switch roles.');
            setIsSwitchingRole(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you absolutely sure you want to permanently delete your account and all associated data? This action cannot be undone.")) return;
        
        const verify = prompt("Type 'DELETE' to confirm account deletion:");
        if (verify !== 'DELETE') {
            alert("Account deletion cancelled.");
            return;
        }

        setIsSwitchingRole(true);
        try {
            // Delete specific profiles and base profile
            await supabase.from('student_profiles').delete().eq('id', auth.user!.username);
            await supabase.from('recruiter_profiles').delete().eq('id', auth.user!.username);
            await supabase.from('profiles').delete().eq('id', auth.user!.username);
            
            alert('Your account has been deleted successfully.');
            await auth.signOut();
            navigate('/');
        } catch (err: any) {
            console.error(err);
            alert("Failed to delete account: " + err.message);
            setIsSwitchingRole(false);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </main>
        )
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen pb-24">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 mt-8 grid md:grid-cols-3 gap-8">
                {/* Sidebar */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center">
                        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{profileData?.full_name || auth.user?.username}</h2>
                        <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">
                            {auth.role === 'student' ? 'Candidate' : auth.role} Account
                        </span>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-3">
                            <Shield size={18} /> Authentication
                        </h3>
                        <p className="text-sm text-indigo-700 mb-4 leading-relaxed">
                            Your password and root login credentials are securely managed by Puter.com OS. 
                        </p>
                        <a 
                            href="https://puter.com" 
                            target="_blank" 
                            rel="noreferrer"
                            className="block text-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl transition-all text-sm shadow-md"
                        >
                            Manage Password at Puter.com
                        </a>
                    </div>

                    <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-orange-900 flex items-center gap-2 mb-3">
                            <AlertCircle size={18} /> Switch Account Type
                        </h3>
                        <p className="text-sm text-orange-800 mb-4 leading-relaxed">
                            You are currently registered as a <strong>{auth.role || localStorage.getItem('userRole') || 'student'}</strong>. Do you want to change your account identity?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => handleSwitchRole('student')}
                                disabled={isSwitchingRole}
                                className={`w-full font-bold py-2 rounded-xl transition-all text-sm shadow-md ${isSwitchingRole ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                Convert to Candidate
                            </button>
                            <button 
                                onClick={() => handleSwitchRole('recruiter')}
                                disabled={isSwitchingRole}
                                className={`w-full font-bold py-2 rounded-xl transition-all text-sm shadow-md ${isSwitchingRole ? 'bg-indigo-400 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                            >
                                Convert to Recruiter
                            </button>
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-3xl p-6 shadow-sm mt-6">
                        <h3 className="font-bold text-red-900 flex items-center gap-2 mb-3">
                            Log Out
                        </h3>
                        <p className="text-sm text-red-800 mb-4 leading-relaxed">
                            End your current session safely.
                        </p>
                        <button 
                            onClick={() => auth.signOut()}
                            className="block text-center w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl transition-all text-sm shadow-md"
                        >
                            Log Out
                        </button>
                    </div>

                    <div className="bg-red-100 border border-red-200 rounded-3xl p-6 shadow-sm mt-6">
                        <h3 className="font-bold text-red-900 flex items-center gap-2 mb-3">
                            <Trash2 size={18} /> Delete Account
                        </h3>
                        <p className="text-sm text-red-800 mb-4 leading-relaxed">
                            Permanently delete your profile and all associated data. This action cannot be undone.
                        </p>
                        <button 
                            onClick={handleDeleteAccount}
                            disabled={isSwitchingRole}
                            className={`block w-full font-bold py-2 rounded-xl transition-all text-sm shadow-md ${isSwitchingRole ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-700 hover:bg-red-800 text-white'}`}
                        >
                            Delete Account
                        </button>
                    </div>
                </div>

                {/* Main Settings Form */}
                <div className="md:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Profile Settings</h1>
                    
                    {saveStatus && (
                        <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${saveStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {saveStatus.type === 'success' ? <CheckCircle size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                            <p className="font-medium">{saveStatus.message}</p>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="flex flex-col gap-5">
                        {effectiveRole === 'student' ? (
                            <>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                    <input type="text" name="full_name" defaultValue={profileData.full_name} required className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Phone</label>
                                        <input type="tel" name="phone" defaultValue={profileData.phone} required className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                    </div>
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Email</label>
                                        <input type="email" name="email" defaultValue={profileData.email} required className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                    </div>
                                </div>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">LinkedIn URL</label>
                                    <input type="url" name="linkedin_url" defaultValue={profileData.linkedin_url} className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                </div>
                                <div className="form-div">
                                    <label className="text-sm font-semibold text-gray-700">Institute / University</label>
                                    <input type="text" name="institute" defaultValue={profileData.institute} className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                </div>
                                <div className="grid grid-cols-3 gap-5">
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">City</label>
                                        <input type="text" name="city" defaultValue={profileData.city} className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                    </div>
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">State</label>
                                        <input type="text" name="state" defaultValue={profileData.state} className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                    </div>
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Country</label>
                                        <input type="text" name="country" defaultValue={profileData.country} className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                    </div>
                                </div>

                                <hr className="border-gray-100 my-4" />

                                {/* Education Section */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 w-full">Education History</h3>
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
                                    <button type="button" onClick={addEducation} className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 w-fit px-4 py-2 rounded-lg transition-colors">
                                        <Plus size={16} /> Add Education Entry
                                    </button>
                                </div>

                                <hr className="border-gray-100 my-4" />

                                {/* Experience Section */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 w-full">Professional Experience</h3>
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
                                    <button type="button" onClick={addExperience} className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 w-fit px-4 py-2 rounded-lg transition-colors">
                                        <Plus size={16} /> Add Work Experience
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Corporate Email</label>
                                        <input type="email" name="corporate_email" defaultValue={profileData.corporate_email} required className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-5 border border-indigo-100 p-5 rounded-2xl bg-indigo-50/30">
                                    <h3 className="font-bold text-indigo-900 border-b border-indigo-100 pb-2">Company Information</h3>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="form-div">
                                            <label className="text-sm font-semibold text-gray-700">Company Name</label>
                                            <input type="text" name="company_name" defaultValue={profileData.company_name} required className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                        </div>
                                        <div className="form-div">
                                            <label className="text-sm font-semibold text-gray-700">Headquarters / Location</label>
                                            <input type="text" name="location" defaultValue={profileData.location} required className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1" />
                                        </div>
                                    </div>
                                    <div className="form-div">
                                        <label className="text-sm font-semibold text-gray-700">Contact Details & About</label>
                                        <textarea name="contact_details" defaultValue={profileData.contact_details} rows={3} className="w-full bg-gray-50 border-gray-200 focus:bg-white rounded-xl px-4 py-2 mt-1"></textarea>
                                    </div>
                                </div>
                            </>
                        )}

                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`mt-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5'}`}
                        >
                            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    )
}
