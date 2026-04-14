import { z } from "zod";

export const PersonalInfoSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().url().optional().or(z.literal("")),
    github: z.string().url().optional().or(z.literal("")),
    portfolio: z.string().url().optional().or(z.literal("")),
    summary: z.string().optional(),
});

export const ExperienceSchema = z.object({
    id: z.string(),
    company: z.string().min(1, "Company is required"),
    role: z.string().min(1, "Role is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    isCurrent: z.boolean().default(false),
    location: z.string().optional(),
    bullets: z.array(z.string()).default([]),
});

export const EducationSchema = z.object({
    id: z.string(),
    institution: z.string().min(1, "Institution is required"),
    degree: z.string().min(1, "Degree is required"),
    fieldOfStudy: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    gpa: z.string().optional(),
});

export const SkillCategorySchema = z.object({
    id: z.string(),
    category: z.string().optional(),
    items: z.array(z.string()).default([]),
});

export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional(),
    technologies: z.array(z.string()).default([]),
    link: z.string().url().optional().or(z.literal("")),
    bullets: z.array(z.string()).default([]),
});

export const UserResumeSchema = z.object({
    id: z.string().optional(), // Used if saved to KV
    title: z.string().default("Untitled Resume"),
    personalInfo: PersonalInfoSchema,
    experience: z.array(ExperienceSchema).default([]),
    education: z.array(EducationSchema).default([]),
    skills: z.array(SkillCategorySchema).default([]),
    projects: z.array(ProjectSchema).default([]),
});

// Infer TypeScript types from Zod Schemas
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type UserResume = z.infer<typeof UserResumeSchema>;

// Default empty resume
export const defaultResume: UserResume = {
    title: "My New Resume",
    personalInfo: {
        fullName: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: "",
        portfolio: "",
        summary: "",
    },
    experience: [],
    education: [],
    skills: [
        {
            id: "skills-1",
            category: "Languages",
            items: [],
        },
        {
            id: "skills-2",
            category: "Frameworks & Tools",
            items: [],
        }
    ],
    projects: [],
};
