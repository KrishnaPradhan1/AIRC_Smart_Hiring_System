interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback;
    audioTranscript?: string;
    audioFeedback?: AudioFeedback;
    createdAt?: number;
    fileName?: string;
}

interface AudioFeedback {
    score: number;
    communicationStyle: string;
    strengths: string[];
    weaknesses: string[];
    tips: string[];
}

interface Feedback {
    extractedText: string;
    extractedSkills: string[];
    jobDescriptionSkills: string[];
    semanticScore?: number;
    keywordScore?: number;
    overallScore: number;
    roleClassification: string;
    missingKeywords: string[];
    ATS: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
        }[];
    };
    toneAndStyle: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation?: string;
        }[];
    };
    content: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation?: string;
        }[];
    };
    structure: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation?: string;
        }[];
    };
    skills: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation?: string;
        }[];
    };
}
