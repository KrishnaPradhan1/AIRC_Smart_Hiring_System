import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { Settings } from "lucide-react";

const Navbar = () => {
    const { auth } = usePuterStore();
    const isRecruiter = auth.role === 'recruiter';
    // If role is null but they are authenticated, default to student view so navigation doesn't vanish
    const isStudent = auth.role === 'student' || !auth.isAuthenticated || (auth.isAuthenticated && !auth.role);

    const homeLink = isRecruiter ? "/recruiter" : "/";

    return (
        <nav className="navbar">
            <div className="flex items-center gap-6">
                <Link to={homeLink}>
                    <p className="text-2xl font-bold text-gradient">AIRC</p>
                </Link>
                
                {/* User Requested Glass Radio Group Component */}
                <div className="glass-radio-group hidden md:flex">
                    <input type="radio" id="glass-silver" name="subscription" value="silver" defaultChecked />
                    <label htmlFor="glass-silver">Silver</label>
                    
                    <input type="radio" id="glass-gold" name="subscription" value="gold" />
                    <label htmlFor="glass-gold">Gold</label>
                    
                    <input type="radio" id="glass-platinum" name="subscription" value="platinum" />
                    <label htmlFor="glass-platinum">Platinum</label>
                    
                    <div className="glass-glider"></div>
                </div>
            </div>

            <div className="flex gap-4 items-center">
                {isStudent && (
                    <>
                        <Link to="/builder" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors hidden sm:block">
                            Resume Builder
                        </Link>
                        <Link to="/upload" className="primary-button w-fit">
                            Upload Resume
                        </Link>
                    </>
                )}
                {isRecruiter && (
                    <>
                        <Link to="/recruiter" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors hidden sm:block">
                            Recruiter Dashboard
                        </Link>
                    </>
                )}

                {auth.isAuthenticated && (
                    <Link to="/profile" className="ml-2 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 transition-all border border-indigo-100 shadow-sm" title="Profile Settings">
                        <Settings size={20} />
                    </Link>
                )}
            </div>
        </nav>
    )
}
export default Navbar
