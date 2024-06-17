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
        text: 'Partner:innen',
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
        text: 'Zielgruppe & Sprache',
        id: 'audience',
        link: '/ve-designer/target-groups',
    },
    {
        text: 'Lerninhalte',
        id: 'learning_goals',
        link: '/ve-designer/learning-goals',
    },
    {
        text: 'Lernumgebung',
        id: 'learning_env',
        link: '/ve-designer/learning-env',
    },
        {
        text: 'Methodik',
        id: 'methodology',
        link: '/ve-designer/methodology',
    },
    {
        text: 'Bewertung & Evaluation',
        id: 'evaluation',
        link: '/ve-designer/evaluation',
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
        text: 'Etappenplanung',
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