import imageGeneralInformation from '@/images/icons/progressBar/topProgressBar/generalInformation.svg';
import imageStagePlanner from '@/images/icons/progressBar/topProgressBar/stagePlanner.svg';
import imageFinish from '@/images/icons/progressBar/topProgressBar/finish.svg';
import { IMenuData, ISubmenuData } from '@/interfaces/ve-designer/sideProgressBar';

const itemsAllgemein: ISubmenuData[] = [
        {
            text: 'designer:sidebar.project_name',
            id: 'name',
            link: '/ve-designer/name',
        },
        {
            text: "designer:sidebar.partners",
            id: 'partners',
            link: '/ve-designer/partners',
        },
        {
            text: "designer:sidebar.institutions",
            id: 'institutions',
            link: '/ve-designer/institutions',
        },
        {
            text: "designer:sidebar.courses",
            id: 'lectures',
            link: '/ve-designer/lectures',
        },
        {
            text: "designer:sidebar.tg_and_language",
            id: 'target_groups',
            link: '/ve-designer/target-groups',
        },
        {
            text: "designer:sidebar.learning_content",
            id: 'learning_goals',
            link: '/ve-designer/learning-goals',
        },
        {
            text: "designer:sidebar.learning_env",
            id: 'learning_env',
            link: '/ve-designer/learning-env',
        },
        {
            text: "designer:sidebar.methods",
            id: 'methodical_approaches',
            link: '/ve-designer/methodology',
        },
        {
            text: "designer:sidebar.evaluation",
            id: 'evaluation',
            link: '/ve-designer/evaluation',
        },
        {
            text: "designer:sidebar.checklist",
            id: 'checklist',
            link: '/ve-designer/checklist',
        },
    ];

const itemsEtappenplaner : ISubmenuData[] =
    [
        {
            text: "designer:sidebar.general_outline",
            id: 'stepsGenerally',
            link: '/ve-designer/step-names',
        },
    ];

export interface IMainMenuItems {
    generally: IMenuData,
    steps: IMenuData,
    finish: IMenuData,
    'post-process': IMenuData
}

export const mainMenuData: IMainMenuItems = {
    'generally': {
        text: 'designer:sidebar.general',
        id: 'generally',
        link: '',
        image: imageGeneralInformation,
        submenu: itemsAllgemein,
    },
    'steps': {
        text: "designer:sidebar.phases",
        id: 'steps',
        link: '',
        image: imageStagePlanner,
        submenu: itemsEtappenplaner,
    },
    'finish': {
        text: "designer:sidebar.summary",
        id: 'finish',
        link: '/ve-designer/finish',
        image: imageFinish,
        submenu: [],
    },
    'post-process': {
        text: "designer:sidebar.post_processing",
        id: 'post-process',
        link: '/ve-designer/post-process',
        image: imageStagePlanner,
        submenu: [],
    }
}


export interface IMenuDataState {
    id: string;
    open: boolean;
}
