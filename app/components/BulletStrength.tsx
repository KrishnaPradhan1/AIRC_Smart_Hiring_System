const BulletStrength = ({ feedback }: { feedback: any }) => {
    const impacts = feedback.bulletImpacts || [];

    if (impacts.length === 0) {
        return (
            <div className="flex flex-col gap-4 border border-gray-200 bg-gray-50 p-6 rounded-2xl w-full">
                <h3 className="text-xl font-bold text-gray-800">No Experience Bullets Analyzed</h3>
                <p className="text-sm text-gray-600">We couldn't extract enough context to rate your bullet points.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700">
            <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-gray-900">Experience Bullet Impact</h3>
                <p className="text-sm text-gray-500">Recruiters look for the <strong>Action + Context + Result</strong> format. Here is how your bullet points stack up.</p>
            </div>

            <div className="flex flex-col gap-5">
                {impacts.map((item: any, index: number) => {
                    // weak = red, okay = amber, strong = green
                    const impactLvl = item.impact_level?.toLowerCase() || 'okay';
                    const bgColor =
                        impactLvl === 'weak' ? 'bg-red-50' :
                            impactLvl === 'okay' ? 'bg-amber-50' :
                                'bg-green-50';

                    const borderColor =
                        impactLvl === 'weak' ? 'border-red-200' :
                            impactLvl === 'okay' ? 'border-amber-200' :
                                'border-green-200';

                    const badgeColor =
                        impactLvl === 'weak' ? 'bg-red-500 text-white' :
                            impactLvl === 'okay' ? 'bg-amber-500 text-white' :
                                'bg-green-500 text-white';

                    return (
                        <div key={index} className={`flex flex-col gap-3 p-5 rounded-2xl border ${borderColor} ${bgColor} shadow-sm transition-all`}>
                            <div className="flex justify-between items-center gap-4 border-b border-black/5 pb-3">
                                <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${badgeColor}`}>
                                    {item.impact_level} Impact
                                </span>
                            </div>

                            <div className="flex flex-col gap-2 mt-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Original</span>
                                <p className="text-sm text-gray-800 italic">"{item.original}"</p>
                            </div>

                            {impactLvl !== 'strong' && (
                                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-black/5">
                                    <span className="text-xs font-semibold text-gray-700 uppercase">Suggested Rewrite</span>
                                    <p className="text-sm text-gray-900 font-bold">"{item.suggested_rewrite}"</p>
                                </div>
                            )}

                            <div className="mt-3 text-sm text-gray-700 bg-white/60 p-3 rounded-lg border border-black/5">
                                <span className="font-semibold text-gray-900 mr-2">Analysis:</span>
                                {item.explanation}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default BulletStrength;
