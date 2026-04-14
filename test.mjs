import fs from "fs";
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

class TextEmbedder {
    static instance = null;
    static async getInstance() {
        if (this.instance === null) {
            this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: () => {} // Silence the progress bar
            });
        }
        return this.instance;
    }
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function testSemanticSimilarity() {
    const startLoad = performance.now();
    const extractor = await TextEmbedder.getInstance();
    const loadTime = performance.now() - startLoad;

    const resumeTxt = "Experienced React.js Developer with 4 years of frontend development. Skilled in building responsive UIs using Vite, React, and Tailwind CSS. Familiar with REST APIs and state management using Zustand.";
    const jdTxt = "Looking for a Frontend Engineer with React.js expertise. Candidates should know Vite, Tailwind, and Zustand, and have strong communicative skills to interact with stakeholders. Node.js is a plus.";

    const startCompute = performance.now();
    const output1 = await extractor(resumeTxt, { pooling: 'mean', normalize: true });
    const output2 = await extractor(jdTxt, { pooling: 'mean', normalize: true });
    
    const sim = cosineSimilarity(output1.data, output2.data);
    const computeTime = performance.now() - startCompute;

    const score = Math.min(100, Math.max(0, sim * 100));

    const result = {
        modelLoadMs: parseFloat(loadTime.toFixed(2)),
        computeLatencyMs: parseFloat(computeTime.toFixed(2)),
        similarityScore: parseFloat(score.toFixed(2))
    };

    fs.writeFileSync('results.json', JSON.stringify(result, null, 2), 'utf-8');
}

testSemanticSimilarity();
