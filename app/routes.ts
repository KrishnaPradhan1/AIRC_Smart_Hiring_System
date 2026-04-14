import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/auth', 'routes/auth.tsx'),
    route('/upload', 'routes/upload.tsx'),
    route('/resume/:id', 'routes/resume.tsx'),
    route('/wipe', 'routes/wipe.tsx'),
    route('/test-bench', 'routes/test-bench.tsx'),
    route('/recruiter', 'routes/recruiter.tsx'),
    route('/recruiter/job/:jobId', 'routes/job-applicants.tsx'),
    route('/recruiter/application/:appId', 'routes/application-details.tsx'),
    route('/builder', 'routes/builder.tsx'),
    route('/onboarding', 'routes/onboarding.tsx'),
    route('/apply/:jobId', 'routes/apply.tsx'),
    route('/profile', 'routes/profile.tsx')
] satisfies RouteConfig;
