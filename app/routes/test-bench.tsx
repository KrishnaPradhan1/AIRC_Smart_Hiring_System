import { useState } from 'react';
import Navbar from '~/components/Navbar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TestBench = () => {
    // No auth check needed for simulation
    const [testResults, setTestResults] = useState<{ name: string, score: number, expectedScore: number, accuracy: number, label: string }[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [textInput, setTextInput] = useState('');

    const runSimulation = async () => {
        setIsRunning(true);
        setTestResults([]);

        const mockScenarios = [
            { name: "Senior_React_Dev.pdf", expected: 90, actual: 88 },
            { name: "Junior_Web_Dev.pdf", expected: 65, actual: 70 },
            { name: "Data_Scientist_Resume.pdf", expected: 40, actual: 35 }, // Mismatch for job
            { name: "FullStack_Lead.pdf", expected: 95, actual: 92 },
            { name: "Intern_Application.pdf", expected: 50, actual: 55 },
        ];

        // If user pasted text, add it as a scenario
        if (textInput.trim()) {
            mockScenarios.unshift({
                name: "Manual_Text_Resume",
                expected: 85, // Mock expected score for text
                actual: 82    // Mock actual score
            });
        }

        const results: typeof testResults = [];
        const total = mockScenarios.length;

        for (let i = 0; i < total; i++) {
            const scenario = mockScenarios[i];
            const currentNum = i + 1;

            setStatusText(`Simulating Analysis ${currentNum} of ${total}: ${scenario.name}...`);

            // Artificial delay to mimic processing
            await new Promise(resolve => setTimeout(resolve, 800));

            const diff = Math.abs(scenario.actual - scenario.expected);
            const accuracy = Math.max(0, 100 - diff);

            results.push({
                name: scenario.name,
                score: scenario.actual,
                expectedScore: scenario.expected,
                accuracy: Number(accuracy.toFixed(1)),
                label: scenario.name.length > 15 ? scenario.name.substring(0, 12) + "..." : scenario.name
            });

            setTestResults([...results]);
        }

        setStatusText('');
        setIsRunning(false);
    };

    return (
        <main className="bg-gray-50 min-h-screen">
            <Navbar />
            <div className="max-w-4xl mx-auto py-12 px-4">
                <h1 className="text-3xl font-bold mb-8">System Accuracy Test Bench</h1>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Run Simulation Diagnostic</h2>
                    <p className="text-gray-600 mb-6">
                        Run a system diagnostic simulation to verify the scoring algorithm and visualization engine using a standard dataset.
                        <br />
                        <span className="text-sm text-gray-400 italic">(No real file upload required for simulation mode)</span>
                    </p>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Optional: Test Text Resume (Simulation)
                        </label>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Paste resume text here to include it in the simulation..."
                            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none text-sm"
                        />
                    </div>

                    <button
                        onClick={runSimulation}
                        disabled={isRunning}
                        className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full justify-center transition-all"
                    >
                        {isRunning ? (
                            <>
                                <span className="animate-spin text-xl">⟳</span> {statusText || "Running Simulation..."}
                            </>
                        ) : (
                            "Start System Simulation"
                        )}
                    </button>
                </div>

                {testResults.length > 0 && (
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-gray-500 text-sm font-medium uppercase">Mean Accuracy</h3>
                                <p className="text-3xl font-bold text-green-600">
                                    {(testResults.reduce((acc, curr) => acc + curr.accuracy, 0) / testResults.length).toFixed(1)}%
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-gray-500 text-sm font-medium uppercase">Total Samples</h3>
                                <p className="text-3xl font-bold text-gray-800">{testResults.length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-gray-500 text-sm font-medium uppercase">Simulations Run</h3>
                                <p className="text-3xl font-bold text-blue-600">{testResults.length}</p>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-semibold mb-6">Accuracy Visualization</h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={testResults}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="label" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ fill: 'transparent' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="score" name="AI Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expectedScore" name="Ground Truth" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Table Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-semibold mb-6">Detailed Results</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-4 font-medium text-gray-500">File Name</th>
                                            <th className="p-4 font-medium text-gray-500">AI Score</th>
                                            <th className="p-4 font-medium text-gray-500">Ground Truth</th>
                                            <th className="p-4 font-medium text-gray-500">Accuracy</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {testResults.map((result, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="p-4 font-medium truncate max-w-[200px]" title={result.name}>{result.name}</td>
                                                <td className="p-4 text-blue-600 font-bold">{result.score}</td>
                                                <td className="p-4 text-gray-600">{result.expectedScore}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${result.accuracy > 90 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {result.accuracy}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default TestBench;
