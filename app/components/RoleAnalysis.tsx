import React from 'react';

const RoleAnalysis = ({ role, missingKeywords }: { role: string, missingKeywords: string[] }) => {
    return (
        <div className="bg-white rounded-2xl shadow-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">AI Role Analysis</h2>

            <div className="mb-6">
                <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-2">Detected Role</h3>
                <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold text-lg">
                    {role || "General"}
                </div>
            </div>

            <div>
                <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-2">Missing Critical Skills</h3>
                {missingKeywords && missingKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {missingKeywords.map((keyword, index) => (
                            <span key={index} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-md text-sm font-medium">
                                + {keyword}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-green-600 font-medium">Great job! No critical keywords missing.</p>
                )}
            </div>
        </div>
    );
};

export default RoleAnalysis;
