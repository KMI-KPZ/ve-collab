import imageGeneralInformation from '@/images/icons/progressBar/topProgressBar/generalInformation.svg';
import imageStagePlanner from '@/images/icons/progressBar/topProgressBar/stagePlanner.svg';
import imageFinish from '@/images/icons/progressBar/topProgressBar/finish.svg';
import { IMenuData, ISubmenuData } from '@/interfaces/ve-designer/sideProgressBar';

const itemsAllgemein: ISubmenuData[] = [
    {
        text: 'Projektname',
        id: 'name',
        link: '/ve-designer/name',
    },
    {
        text: 'Partner',
        id: 'partners',
        link: '/ve-designer/partners',
    },
    {
        text: 'Institution',
        id: 'institutions',
        link: '/ve-designer/lectures',
    },
    {
        text: 'Lehrveranstaltungen',
        id: 'lectures',
        link: '/ve-designer/participatingCourses',
    },
    {
        text: 'Zielgruppen',
        id: 'audience',
        link: '/ve-designer/target-groups',
    },
    {
        text: 'Lerninhalte',
        id: 'learning_goals',
        link: '/ve-designer/learning-goals',
    },
    {
        text: 'Methodischer Ansatz',
        id: 'methodical_approach',
        link: '/ve-designer/methodical-approach',
    },
    {
        text: 'Bewertung und Evaluation',
        id: 'evaluation',
        link: '/ve-designer/evaluation',
    },
    {
        text: 'Formate',
        id: 'realization',
        link: '/ve-designer/teaching-formats',
    },
    {
        text: 'Lernumgebung',
        id: 'learning_env',
        link: '/ve-designer/learning-environment',
    },
    {
        text: 'Checkliste',
        id: 'formalities',
        link: '/ve-designer/checklist',
    },
];

const itemsEtappenplaner: ISubmenuData[] = [
    {
        text: 'Grobplanung',
        id: 'stepsGenerally',
        link: '/ve-designer/step-names',
    },
];

export const mainMenu: IMenuData[] = [
    {
        text: 'Allgemein',
        id: 'generally',
        link: '',
        image: imageGeneralInformation,
        // submenu: getSubMenu('generally', itemsAllgemein)
        submenu: itemsAllgemein
    },
    {
        text: 'Etappenplaner',
        id: 'steps',
        link: '',
        image: imageStagePlanner,
        submenu: itemsEtappenplaner
    },
    {
        text: 'Abschluss',
        id: 'finish',
        link: '/ve-designer/finish',
        image: imageFinish,
        submenu: []
    },
    {
        text: 'Nachbearbeitung',
        id: 'post-process',
        link: '/ve-designer/post-process',
        image: imageStagePlanner,
        submenu: []
    },
];

// export const getSubMenu = async (ofParent: IMenuData): Promise<ISubmenuData[]> => {

//     if (ofParent.id == 'steps') {
//         // TODO dynamically ad steps
//         await Promise.resolve()
//     }

//     return ofParent.submenu

// }

// export const getMainMenu = () => {
//     return mainMenu
// }