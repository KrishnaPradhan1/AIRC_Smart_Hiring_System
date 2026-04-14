import { z } from 'zod';

// Zod schemas for the Matching Engine

export const JobDescriptionSchema = z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    responsibilities: z.array(z.string()).optional(),
    required_skills: z.array(z.string()),
    nice_to_have_skills: z.array(z.string()).optional(),
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;

export const ResumeProfileSchema = z.object({
    id: z.string(),
    files: z.array(z.string()), // paths to the actual parsing artifacts/documents
    extracted_text: z.string(),
    inferred_role: z.string(),
    skills: z.array(z.string()),
    experience_years: z.number().optional(),
    education_level: z.string().optional(),
    // For the new Builder, sections could be attached here or separate
});

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;

export const MatchResultSchema = z.object({
    overall_score: z.number(), // 0 - 100
    skill_match_score: z.number(), // 0 - 100
    experience_match_score: z.number(), // 0 - 100
    culture_fit_hint: z.string().optional(),
    missing_skills: z.array(z.string()),
    red_flags: z.array(z.string()).optional(),
    explanation: z.string(),
    color_bucket: z.enum(['green', 'amber', 'red']),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

export const GrammarIssueSchema = z.object({
    original: z.string(),
    suggested: z.string(),
    category: z.string(), // grammar, clarity, impact
    explanation: z.string()
});

export const BulletImpactSchema = z.object({
    original: z.string(),
    impact_level: z.string(), // weak, okay, strong
    suggested_rewrite: z.string(),
    explanation: z.string()
});

// Add backwards compatibility wrapper that conforms to the existing pipeline structure
// but embeds the new matching structure internally, or define a cleaner structure.
export const UnifiedFeedbackSchema = z.object({
    overallScore: z.number(),
    semanticScore: z.number().optional(),
    keywordScore: z.number().optional(),
    extractedText: z.string(),
    extractedSkills: z.array(z.string()),
    jobDescriptionSkills: z.array(z.string()),
    roleClassification: z.string(),
    missingKeywords: z.array(z.string()),
    grammarAndStyleIssues: z.array(GrammarIssueSchema).optional(),
    bulletImpacts: z.array(BulletImpactSchema).optional(),
    ATS: z.object({
        score: z.number(),
        tips: z.array(z.object({
            type: z.string(), // good, improve
            tip: z.string()
        }))
    }),
    toneAndStyle: z.object({
        score: z.number(),
        tips: z.array(z.object({
            type: z.string(),
            tip: z.string(),
            explanation: z.string().optional()
        }))
    }).optional(),
    content: z.object({
        score: z.number(),
        tips: z.array(z.object({
            type: z.string(),
            tip: z.string(),
            explanation: z.string().optional()
        }))
    }).optional(),
    structure: z.object({
        score: z.number(),
        tips: z.array(z.object({
            type: z.string(),
            tip: z.string(),
            explanation: z.string().optional()
        }))
    }).optional(),
    skills: z.object({
        score: z.number(),
        tips: z.array(z.object({
            type: z.string(),
            tip: z.string(),
            explanation: z.string().optional()
        }))
    }).optional(),
});

export type UnifiedFeedback = z.infer<typeof UnifiedFeedbackSchema>;
