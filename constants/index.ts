export const resumes: Resume[] = [
    {
        id: "1",
        companyName: "Google",
        jobTitle: "Frontend Developer",
        imagePath: "/images/resume_01.png",
        resumePath: "/resumes/resume-1.pdf",
        feedback: {
            extractedText: "Dummy text for frontend developer",
            extractedSkills: ["React", "TypeScript", "Tailwind"],
            jobDescriptionSkills: ["React", "TypeScript", "GraphQL", "Docker"],
            overallScore: 85,
            roleClassification: "Frontend Developer",
            missingKeywords: ["GraphQL", "Docker"],
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "2",
        companyName: "Microsoft",
        jobTitle: "Cloud Engineer",
        imagePath: "/images/resume_02.png",
        resumePath: "/resumes/resume-2.pdf",
        feedback: {
            extractedText: "Dummy text for cloud engineer",
            extractedSkills: ["Azure", "Docker"],
            jobDescriptionSkills: ["AWS", "Kubernetes", "CI/CD"],
            overallScore: 55,
            roleClassification: "Backend Developer",
            missingKeywords: ["AWS", "Kubernetes", "CI/CD"],
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "3",
        companyName: "Apple",
        jobTitle: "iOS Developer",
        imagePath: "/images/resume_03.png",
        resumePath: "/resumes/resume-3.pdf",
        feedback: {
            extractedText: "Dummy text for iOS developer",
            extractedSkills: ["Swift", "UIKit"],
            jobDescriptionSkills: ["Swift", "SwiftUI", "Combine"],
            overallScore: 75,
            roleClassification: "Mobile Developer",
            missingKeywords: ["SwiftUI", "Combine"],
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "4",
        companyName: "Google",
        jobTitle: "Frontend Developer",
        imagePath: "/images/resume_01.png",
        resumePath: "/resumes/resume-1.pdf",
        feedback: {
            extractedText: "Dummy frontend resume 2",
            extractedSkills: ["React", "JavaScript"],
            jobDescriptionSkills: ["React", "Next.js", "Redux"],
            overallScore: 85,
            roleClassification: "Frontend Developer",
            missingKeywords: ["Next.js", "Redux"],
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "5",
        companyName: "Microsoft",
        jobTitle: "Cloud Engineer",
        imagePath: "/images/resume_02.png",
        resumePath: "/resumes/resume-2.pdf",
        feedback: {
            extractedText: "Dummy devops resume",
            extractedSkills: ["AWS", "Linux"],
            jobDescriptionSkills: ["AWS", "Terraform", "Ansible"],
            overallScore: 55,
            roleClassification: "DevOps Engineer",
            missingKeywords: ["Terraform", "Ansible"],
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "6",
        companyName: "Apple",
        jobTitle: "iOS Developer",
        imagePath: "/images/resume_03.png",
        resumePath: "/resumes/resume-3.pdf",
        feedback: {
            extractedText: "Dummy iOS resume 2",
            extractedSkills: ["Swift", "Xcode"],
            jobDescriptionSkills: ["Swift", "Objective-C", "Fastlane"],
            overallScore: 75,
            roleClassification: "iOS Developer",
            missingKeywords: ["Objective-C", "Fastlane"],
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
];

export const AIResponseFormat = `
      interface Feedback {
      overallScore: number; //max 100
      extractedText: string; // The raw, plain text extracted from the resume
      extractedSkills: string[]; // List of skills found on the candidate's resume
      jobDescriptionSkills: string[]; // List of required or nice-to-have skills extracted from the job description
      roleClassification: string; // e.g., "Frontend Developer", "Data Scientist"
      missingKeywords: string[]; // List of critical skills missing from the resume
      ATS: {
        score: number; //rate based on ATS suitability
        tips: {
          type: "good" | "improve";
          tip: string; //give 3-4 tips
        }[];
      };
      toneAndStyle: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      content: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      structure: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      skills: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      grammarAndStyleIssues: { // REQUIRED — always return 3-5 items
        original: string; // the exact sentence from the resume
        suggested: string; // improved version
        category: "grammar" | "clarity" | "impact";
        explanation: string; // why the change helps
      }[];
      bulletImpacts: { // REQUIRED — always return items for EVERY experience bullet
        original: string; // the original experience bullet point from the resume
        impact_level: "weak" | "okay" | "strong";
        suggested_rewrite: string; // rewrite using 'Action + Context + Result' format
        explanation: string; // explain why the rewrite is better
      }[];
    }`;

export const prepareInstructions = ({ jobTitle, jobDescription, resumeText }: { jobTitle: string; jobDescription: string; resumeText: string; }) =>
    `You are an expert in ATS (Applicant Tracking System) and resume analysis.
      Please analyze and rate this resume and suggest how to improve it according to the latest industry standards.
      The rating can be low if the resume is bad.
      Be thorough and detailed. Don't be afraid to point out any mistakes or areas for improvement.
      If there is a lot to improve, don't hesitate to give low scores to help the user improve their resume.
      Use the provided job description to give specific, tailored feedback.
      The job title is: ${jobTitle}
      The job description is: ${jobDescription}
      
      Here is the text extracted from the candidate's resume. You MUST use this text to evaluate their grammar, style, and bullet points:
      <resume_text>
      ${resumeText}
      </resume_text>
      
      Provide the feedback STRICTLY using the following JSON structure:
      ${AIResponseFormat}

      CRITICAL INSTRUCTIONS:
      1. You MUST return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks (like \`\`\`json). Do NOT include any introductory or concluding text. Your entire response must be parseable by JSON.parse().
      2. The "extractedText" field MUST contain the full raw text you extracted from the resume document.
      3. The "grammarAndStyleIssues" array is REQUIRED. You MUST find and report at least 3-5 grammar, clarity, or impact issues. Look for: passive voice, weak verbs, vague statements, spelling errors, punctuation issues, and unclear phrasing.
      4. The "bulletImpacts" array is REQUIRED. You MUST analyze EVERY experience bullet point in the resume. For each one, rate it as "weak", "okay", or "strong" and provide a rewrite using the "Action + Context + Result" format. Always return at least 3-5 bullet analyses.
      5. ALL fields in the schema are required unless explicitly marked optional. Do not omit any field.`;

export const getHtmlConversionPrompt = (resumeJson: string) => `
You are an expert resume formatter and HTML developer.
I have a parsed JSON representation of a candidate's resume.
I want you to convert this raw text/data into a clean, professional, ATS-friendly HTML document that can be loaded into a WYSIWYG editor (like TipTap/Google Docs).

Here are the strict rules for the HTML:
1. Wrap everything in a standard flow (do NOT use <html>, <body>, or <head> tags, just the inner content).
2. Use exactly these tags: <h1> for the candidate's name, <h2> for section headers (SUMMARY, EXPERIENCE, EDUCATION, SKILLS), <ul> and <li> for bullet points.
3. Center-align the <h1> name and the contact information <p> below it.
4. Bold company names and italicize job titles. 
5. Separate sections with an <hr>.
6. DO NOT use fancy CSS classes, tailwind, layouts, flexbox, or grid. Return standard, basic HTML tags only.
7. Return ONLY the raw HTML string, do not wrap it in markdown ticks like \`\`\`html.

Here is the candidate's resume data to convert (this may contain raw extracted text and JSON fields):
${resumeJson}
`;

export const getAudioAnalysisPrompt = (transcript: string, jobTitle: string, jobDescription: string, resumeText: string) => `
You are an expert recruiter and communication coach. 
The candidate has recorded an audio pitch (elevator pitch) for the following role:
Job Title: ${jobTitle}
Job Description: ${jobDescription}

The candidate's resume text is:
${resumeText}

Here is the transcript of their audio pitch:
"${transcript}"

Analyze this transcript and evaluate their communication skills, how well they sell themselves, and whether their pitch aligns with their resume and the job requirements.
Provide the feedback STRICTLY using the following JSON structure. Do NOT include markdown blocks:
{
  "score": number, // out of 100
  "communicationStyle": string, // brief description of their speaking style and tone based on text
  "strengths": string[], // 2-3 strengths of the pitch
  "weaknesses": string[], // 1-2 areas for improvement
  "tips": string[] // 2-3 actionable tips for their next interview or pitch
}`;
