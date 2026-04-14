const GrammarAndStyle = ({ feedback }: { feedback: any }) => {
    const issues = feedback.grammarAndStyleIssues || [];

    if (issues.length === 0) {
        return (
            <div className="flex flex-col gap-4 border border-green-200 bg-green-50 p-6 rounded-2xl w-full">
                <h3 className="text-xl font-bold text-green-800">No Grammar or Style Issues Found!</h3>
                <p className="text-sm text-green-700">Your resume language looks clean, clear, and professional.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700">
            <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-gray-900">Grammar & Style Suggestions</h3>
                <p className="text-sm text-gray-500">Review the suggested changes to improve the clarity and impact of your sentences.</p>
            </div>

            <div className="flex flex-col gap-4">
                {issues.map((issue: any, index: number) => {
                    const badgeColor =
                        issue.category === 'grammar' ? 'bg-red-100 text-red-700 border-red-200' :
                            issue.category === 'clarity' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                'bg-blue-100 text-blue-700 border-blue-200'; // impact

                    return (
                        <div key={index} className="flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start gap-4">
                                <span className={`text-xs font-bold uppercase px-2.5 py-1 border rounded-lg ${badgeColor}`}>
                                    {issue.category}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div className="flex flex-col gap-2 pl-4 border-l-4 border-gray-200">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Original</span>
                                    <p className="text-sm text-gray-800 line-through decoration-red-400 decoration-2">{issue.original}</p>
                                </div>
                                <div className="flex flex-col gap-2 pl-4 border-l-4 border-green-400">
                                    <span className="text-xs font-semibold text-green-600 uppercase">Suggested</span>
                                    <p className="text-sm text-gray-900 font-medium">{issue.suggested}</p>
                                </div>
                            </div>

                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="font-semibold text-gray-700 mr-2">Why:</span>
                                {issue.explanation}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div >
    )
}

export default GrammarAndStyle;
