import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
    type UserResume,
    type PersonalInfo,
    type Experience,
    type Education,
    type SkillCategory,
    type Project,
    defaultResume
} from '../../types/resume';

interface BuilderState {
    resumeData: UserResume;
    docHTML: string;

    // Global actions
    loadResume: (resume: UserResume) => void;
    resetResume: () => void;
    updateTitle: (title: string) => void;
    setDocHTML: (html: string) => void;

    // Personal Info
    updatePersonalInfo: (data: Partial<PersonalInfo>) => void;

    // Experience
    addExperience: () => void;
    updateExperience: (id: string, data: Partial<Experience>) => void;
    removeExperience: (id: string) => void;

    // Education
    addEducation: () => void;
    updateEducation: (id: string, data: Partial<Education>) => void;
    removeEducation: (id: string) => void;

    // Skills
    addSkillCategory: () => void;
    updateSkillCategory: (id: string, data: Partial<SkillCategory>) => void;
    removeSkillCategory: (id: string) => void;

    // Projects
    addProject: () => void;
    updateProject: (id: string, data: Partial<Project>) => void;
    removeProject: (id: string) => void;
}

export const useBuilderStore = create<BuilderState>()(
    persist(
        (set) => ({
            resumeData: defaultResume,
            docHTML: '',

            loadResume: (resume) => set({ resumeData: resume }),
            resetResume: () => set({ resumeData: defaultResume, docHTML: '' }),
            updateTitle: (title) => set((state) => ({ resumeData: { ...state.resumeData, title } })),
            setDocHTML: (html: string) => set({ docHTML: html }),

            updatePersonalInfo: (data) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    personalInfo: { ...state.resumeData.personalInfo, ...data }
                }
            })),

            addExperience: () => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    experience: [
                        ...state.resumeData.experience,
                        { id: uuidv4(), company: '', role: '', startDate: '', isCurrent: false, bullets: [] }
                    ]
                }
            })),
            updateExperience: (id, data) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    experience: state.resumeData.experience.map((exp: Experience) => exp.id === id ? { ...exp, ...data } : exp)
                }
            })),
            removeExperience: (id) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    experience: state.resumeData.experience.filter((exp: Experience) => exp.id !== id)
                }
            })),

            addEducation: () => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    education: [
                        ...state.resumeData.education,
                        { id: uuidv4(), institution: '', degree: '', startDate: '', endDate: '' }
                    ]
                }
            })),
            updateEducation: (id, data) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    education: state.resumeData.education.map((edu: Education) => edu.id === id ? { ...edu, ...data } : edu)
                }
            })),
            removeEducation: (id) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    education: state.resumeData.education.filter((edu: Education) => edu.id !== id)
                }
            })),

            addSkillCategory: () => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    skills: [
                        ...state.resumeData.skills,
                        { id: uuidv4(), category: '', items: [] }
                    ]
                }
            })),
            updateSkillCategory: (id, data) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    skills: state.resumeData.skills.map((skill: SkillCategory) => skill.id === id ? { ...skill, ...data } : skill)
                }
            })),
            removeSkillCategory: (id) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    skills: state.resumeData.skills.filter((skill: SkillCategory) => skill.id !== id)
                }
            })),

            addProject: () => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    projects: [
                        ...state.resumeData.projects,
                        { id: uuidv4(), name: '', description: '', technologies: [], bullets: [] }
                    ]
                }
            })),
            updateProject: (id, data) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    projects: state.resumeData.projects.map((proj: Project) => proj.id === id ? { ...proj, ...data } : proj)
                }
            })),
            removeProject: (id) => set((state) => ({
                resumeData: {
                    ...state.resumeData,
                    projects: state.resumeData.projects.filter((proj: Project) => proj.id !== id)
                }
            })),

        }),
        {
            name: 'ats-resume-builder-storage', // saves to local storage automatically
        }
    )
);
