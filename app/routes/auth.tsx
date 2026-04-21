import { usePuterStore } from "~/lib/puter";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";
import { Building2, GraduationCap } from "lucide-react";

export const meta = () => ([
    { title: 'AIRC | Auth' },
    { name: 'description', content: 'Log into your account' },
])

const Auth = () => {
    const { isLoading, auth } = usePuterStore();
    const location = useLocation();
    const next = location.search.split('next=')[1] || '/';
    const navigate = useNavigate();

    const [selectedRole, setSelectedRole] = useState<'student' | 'recruiter' | null>(null);
    const [isCheckingProfile, setIsCheckingProfile] = useState(false);

    useEffect(() => {
        const checkProfile = async () => {
            if (auth.isAuthenticated && auth.user) {
                setIsCheckingProfile(true);
                try {
                    const userId = auth.user.username || 'anonymous';
                    
                    // Check if profile exists in Supabase
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', userId)
                        .single();

                    if (profile) {
                        // User exists, route to their specific dashboard or 'next'
                        if (profile.role === 'recruiter' && next === '/') {
                             navigate('/recruiter');
                        } else {
                             navigate(next);
                        }
                    } else {
                        // Profile does not exist, they must have selected a role
                        const roleToCreate = selectedRole || localStorage.getItem('pendingRole') || 'student';
                        
                        // Insert base profile
                        try {
                            await supabase.from('profiles').insert({
                                id: userId,
                                role: roleToCreate
                            });
                        } catch (insErr: any) {
                            console.warn("Could not insert profile to Supabase (might be offline):", insErr);
                            if (insErr?.message && !insErr.message.includes('fetch')) {
                                throw insErr;
                            }
                        }

                        // Clear pending
                        localStorage.removeItem('pendingRole');
                        localStorage.setItem('userRole', roleToCreate);

                        // Route to onboarding
                        navigate(`/onboarding?role=${roleToCreate}&next=${encodeURIComponent(next)}`);
                    }
                } catch (err: any) {
                    console.error("Error checking/creating profile:", err);
                    
                    // Fallback for offline mode: rely on localStorage
                    const localRole = localStorage.getItem('userRole');
                    if (localRole) {
                        if (localRole === 'recruiter' && next === '/') {
                             navigate('/recruiter');
                        } else {
                             navigate(next);
                        }
                    } else {
                        navigate(next); // Fallback
                    }
                } finally {
                    setIsCheckingProfile(false);
                }
            }
        };

        checkProfile();
    }, [auth.isAuthenticated, auth.user, next, navigate, selectedRole]);

    const handleLoginClick = () => {
        if (!selectedRole) {
            alert("Please select if you are a Candidate or Recruiter first.");
            return;
        }
        localStorage.setItem('pendingRole', selectedRole);
        auth.signIn();
    };

    return (
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center p-4">
            <div className="gradient-border shadow-2xl max-w-md w-full">
                <section className="flex flex-col gap-8 bg-white/90 backdrop-blur-xl rounded-2xl p-8 items-center text-center border border-white/50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30 mb-2">
                            AIRC
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Join the Portal</h1>
                        <h2 className="text-gray-600 font-medium">Select your role to continue</h2>
                    </div>
                    
                    <div className="w-full">
                        {isLoading || isCheckingProfile ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-4">
                                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-medium animate-pulse">
                                    {isCheckingProfile ? "Setting up your workspace..." : "Communicating with Puter..."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {!auth.isAuthenticated && (
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <button 
                                            onClick={() => setSelectedRole('student')}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedRole === 'student' ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50 bg-white'}`}
                                        >
                                            <div className={`p-3 rounded-full ${selectedRole === 'student' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <GraduationCap size={28} />
                                            </div>
                                            <span className={`font-semibold ${selectedRole === 'student' ? 'text-blue-700' : 'text-gray-600'}`}>Candidate</span>
                                        </button>

                                        <button 
                                            onClick={() => setSelectedRole('recruiter')}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedRole === 'recruiter' ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50 bg-white'}`}
                                        >
                                            <div className={`p-3 rounded-full ${selectedRole === 'recruiter' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Building2 size={28} />
                                            </div>
                                            <span className={`font-semibold ${selectedRole === 'recruiter' ? 'text-indigo-700' : 'text-gray-600'}`}>Recruiter</span>
                                        </button>
                                    </div>
                                )}
                                
                                {auth.isAuthenticated ? (
                                    <button className="w-full primary-button py-3 text-lg" onClick={auth.signOut}>
                                        <p>Log Out</p>
                                    </button>
                                ) : (
                                    <button 
                                        className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all ${selectedRole ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:-translate-y-0.5' : 'bg-gray-300 cursor-not-allowed text-gray-100 shadow-none'}`} 
                                        onClick={handleLoginClick}
                                        disabled={!selectedRole}
                                    >
                                        Log In with Puter
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}

export default Auth

