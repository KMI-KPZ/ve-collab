import { SideMenuStep } from '@/interfaces/startingWizard/sideProgressBar';

export const sideMenuStepsData: SideMenuStep[] = [
    {
        text: 'Projektname',
        id: 'name',
        link: '/startingWizard/generalInformation/projectName',
    },
    {
        text: 'Partner',
        id: 'partners',
        link: '/startingWizard/generalInformation/partners',
    },
    {
        text: 'Externe Beteiligte',
        id: 'involved_parties',
        link: '/startingWizard/generalInformation/externalParties',
    },
    {
        text: 'Institution',
        id: 'institutions',
        link: '/startingWizard/generalInformation/institutions',
    },
    {
        text: 'Lehrveranstaltungen',
        id: 'lectures',
        link: '/startingWizard/generalInformation/participatingCourses',
    },
    {
        text: 'Richtlernziele',
        id: 'learning_goals',
        link: '/startingWizard/generalInformation/globalGoals',
    },
    {
        text: 'Zielgruppen',
        id: 'audience',
        link: '/startingWizard/generalInformation/targetGroups',
    },
    {
        text: 'Thema/Themen',
        id: 'topics',
        link: '/startingWizard/generalInformation/veTopic',
    },
    {
        text: 'Sprache(n)',
        id: 'languages',
        link: '/startingWizard/generalInformation/languages',
    },
    {
        text: '(Digitale) Formate',
        id: 'realization',
        link: '/startingWizard/generalInformation/courseFormat',
    },
    {
        text: 'Digitale Lernumgebung',
        id: 'learning_env',
        link: '/startingWizard/generalInformation/learningPlatform',
    },
    {
        text: 'Formale Rahmenbedingungen',
        id: 'formalities',
        link: '/startingWizard/generalInformation/formalConditions',
    },
    {
        text: 'Etappenplanung',
        id: 'steps',
        link: '/startingWizard/broadPlanner',
    },
];
