import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

class TextEmbedder {
    static instance: any = null;

    static async getInstance(progressCallback?: Function) {
        if (this.instance === null) {
            // Load a small embedding model optimized for local browser execution
            this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: progressCallback
            });
        }
        return this.instance;
    }
}

/**
 * Computes cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: Float32Array | number[], vecB: Float32Array | number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Computes semantic similarity between two texts using local embeddings.
 * Returns a score between 0 and 100.
 */
export async function computeSemanticSimilarity(text1: string, text2: string, progressCallback?: Function): Promise<number> {
    try {
        const extractor = await TextEmbedder.getInstance(progressCallback);

        // Note: The model has a max sequence length (usually 512). It will truncate if longer.
        const output1 = await extractor(text1, { pooling: 'mean', normalize: true });
        const output2 = await extractor(text2, { pooling: 'mean', normalize: true });

        const sim = cosineSimilarity(output1.data, output2.data);

        // Math.max to prevent negative scores, cap at 1. Convert to 0-100 range.
        return Math.min(100, Math.max(0, sim * 100));
    } catch (error) {
        console.error("Semantic similarity error:", error);
        return 0; // Fallback
    }
}

/**
 * Computes overlap percentage of JD skills found in the resume skills.
 */
export function computeKeywordOverlap(resumeSkills: string[], jdSkills: string[]): number {
    if (!jdSkills || jdSkills.length === 0) return 100;
    if (!resumeSkills || resumeSkills.length === 0) return 0;

    const resumeSet = new Set(resumeSkills.map(s => s.toLowerCase().trim()));
    let overlapCount = 0;

    for (const reqSkill of jdSkills) {
        if (resumeSet.has(reqSkill.toLowerCase().trim())) {
            overlapCount++;
        }
    }

    return (overlapCount / jdSkills.length) * 100;
}

/**
 * Hybrid matching engine that combines LLM score, embeddings similarity, and keyword overlap.
 * This can be used to augment the overall score and provide a multi-faceted match score.
 */
export async function computeHybridScore(
    llmScore: number,
    resumeText: string,
    jdText: string,
    resumeSkills: string[],
    jdSkills: string[],
    progressCallback?: Function
): Promise<{
    overallScore: number;
    semanticScore: number;
    keywordScore: number;
}> {
    const keywordScore = computeKeywordOverlap(resumeSkills, jdSkills);
    const semanticScore = await computeSemanticSimilarity(resumeText, jdText, progressCallback);

    // Weighted average: e.g., 50% LLM, 30% Semantic Embeddings, 20% Keyword Overlap
    const overallScore = Math.round((llmScore * 0.5) + (semanticScore * 0.3) + (keywordScore * 0.2));

    return {
        overallScore,
        semanticScore: Math.round(semanticScore),
        keywordScore: Math.round(keywordScore)
    };
}
