import { ProgressState, SideMenuStep } from '@/interfaces/startingWizard/sideProgressBar';

export const sideMenuStepsGeneralInformation: SideMenuStep[] = [
    {
        text: 'Essentielle Informationen',
        link: '/startingWizard/generalInformation/essentialInformation',
        state: ProgressState.completed,
    },
    {
        text: 'Kursinformationen',
        link: '/startingWizard/generalInformation/courseInformation',
        state: ProgressState.completed,
    },
    {
        text: 'Ziele',
        link: '/startingWizard/generalInformation/goals',
        state: ProgressState.completed,
    },
    {
        text: 'Tools',
        link: '/startingWizard/generalInformation/tools',
        state: ProgressState.uncompleted,
    },
    {
        text: 'Formale Rahmenbedingungen',
        link: '/startingWizard/generalInformation/formalGeneralConditions',
        state: ProgressState.notStarted,
    },
];
