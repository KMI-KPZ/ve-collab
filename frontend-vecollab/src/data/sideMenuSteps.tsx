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
        text: 'Zielgruppen',
        id: 'audience',
        link: '/startingWizard/generalInformation/targetGroups',
    },
    {
        text: 'Thema',
        id: 'topic',
        link: '/startingWizard/generalInformation/veTopic',
    },
    {
        text: 'Sprachen',
        id: 'languages',
        link: '/startingWizard/generalInformation/languages',
    },
    {
        text: 'neue Inhalte',
        id: 'new_content',
        link: '/startingWizard/generalInformation/questionNewContent',
    },
    {
        text: 'Digitale Umsetzung',
        id: 'realization',
        link: '/startingWizard/generalInformation/courseFormat',
    },
    {
        text: 'Digitale Lernumgebung',
        id: 'learning_env',
        link: '/startingWizard/generalInformation/learningPlatform',
    },
    {
        text: 'Tools',
        id: 'tools',
        link: '/startingWizard/generalInformation/tools',
    },
    {
        text: 'formale Rahmenbedingungen',
        id: 'formalities',
        link: '/startingWizard/generalInformation/formalConditions',
    },
    {
        text: 'Etappenplanung',
        id: 'steps',
        link: '/startingWizard/broadPlanner',
    },
];
