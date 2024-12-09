// Not included (not public accessible, error pages, user-specific pages):

// api/...
// orcidAccountLinkCallback
// LEARNINGMATERIAL_EDIT: '/learning-material/edit',
// MEETING_ID: `/meeting/${id}`,
// PLAN_PDF_PLANID: `/plan/pdf/${planId}`,
// PROFILE_EDIT: '/profile/edit',
// ERROR500: '/500',
// ERROR404: '/404',
// ETHERPAD: `/etherpad/${id}`,

export const ROUTES = {
    HOME: '',
    SEARCH: '/search',
    PLANS: '/plans',
    MATCHING: '/matching',
    GROUPS: '/groups',
    LEARNINGMATERIAL: '/learning-material',
    PROFILE: '/profile',

    // VE-Designer
    /*    VEDESIGNER_STEP_ID: `/ve-designer/step/${id}`,*/
    VEDESIGNER_CHECKLIST: '/ve-designer/checklist',
    VEDESIGNER_EVALUATION: '/ve-designer/evaluation',
    VEDESIGNER_FINISH: '/ve-designer/finish',
    VEDESIGNER_INSTITUTIONS: '/ve-designer/institutions',
    VEDESIGNER_LEARNINGENV: '/ve-designer/learning-env',
    VEDESIGNER_LEARNINGGOALS: '/ve-designer/learning-goals',
    VEDESIGNER_LECTURES: '/ve-designer/lectures',
    VEDESIGNER_METHODOLOGY: '/ve-designer/methodology',
    VEDESIGNER_NAME: '/ve-designer/name',
    VEDESIGNER_PARTNERS: '/ve-designer/partners',
    VEDESIGNER_POSTPROCESS: '/ve-designer/post-process',
    VEDESIGNER_STEPS: '/ve-designer/steps',
    VEDESIGNER_TARGETGROUPS: '/ve-designer/target-groups',
};

// declare dynamic routes in sitemap
