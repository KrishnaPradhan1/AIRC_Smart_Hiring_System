import type { ZodSchema } from 'zod';

/**
 * Safely parses a potentially markdown-wrapped JSON string from an LLM
 * and validates it against a provided Zod schema.
 */
export function safeJsonParse<T>(text: string, schema: ZodSchema<T>): { success: true; data: T } | { success: false; error: any } {
    let cleanText = text.trim();

    // Remove markdown code blocks if present
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = cleanText.match(jsonBlockRegex);
    if (match && match[1]) {
        cleanText = match[1].trim();
    } else {
        // Sometimes LLMs just return the JSON text but with random leading/trailing text.
        // Try to find the first '{' or '[' and the last '}' or ']'
        const firstBrace = cleanText.indexOf('{');
        const firstBracket = cleanText.indexOf('[');
        const lastBrace = cleanText.lastIndexOf('}');
        const lastBracket = cleanText.lastIndexOf(']');

        let startIdx = -1;
        let endIdx = -1;

        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            startIdx = firstBrace;
            endIdx = lastBrace;
        } else if (firstBracket !== -1) {
            startIdx = firstBracket;
            endIdx = lastBracket;
        }

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleanText = cleanText.substring(startIdx, endIdx + 1);
        }
    }

    try {
        const parsed = JSON.parse(cleanText);
        const validated = schema.parse(parsed);
        return { success: true, data: validated };
    } catch (error) {
        return { success: false, error };
    }
}
