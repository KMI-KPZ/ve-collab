import imageGeneralInformation from '@/images/icons/progressBar/topProgressBar/generalInformation.svg';
import imageStagePlanner from '@/images/icons/progressBar/topProgressBar/stagePlanner.svg';
import imageFinish from '@/images/icons/progressBar/topProgressBar/finish.svg';
import { IMenuData, ISubmenuData } from '@/interfaces/ve-designer/sideProgressBar';

const itemsAllgemein = (): ISubmenuData[] => {
    return [
        {
            text: 'sidebar_project_name',
            id: 'name',
            link: '/ve-designer/name',
        },
        {
            text: "sidebar_partners",
            id: 'partners',
            link: '/ve-designer/partners',
        },
        {
            text: "sidebar_institutions",
            id: 'institutions',
            link: '/ve-designer/institutions',
        },
        {
            text: "sidebar_courses",
            id: 'lectures',
            link: '/ve-designer/lectures',
        },
        {
            text: "sidebar_tg_and_language",
            id: 'target_groups',
            link: '/ve-designer/target-groups',
        },
        {
            text: "sidebar_learning_content",
            id: 'learning_goals',
            link: '/ve-designer/learning-goals',
        },
        {
            text: "sidebar_learning_env",
            id: 'learning_env',
            link: '/ve-designer/learning-env',
        },
        {
            text: "sidebar_methods",
            id: 'methodical_approaches',
            link: '/ve-designer/methodology',
        },
        {
            text: "sidebar_evaluation",
            id: 'evaluation',
            link: '/ve-designer/evaluation',
        },
        {
            text: "sidebar_checklist",
            id: 'checklist',
            link: '/ve-designer/checklist',
        },
    ];
};

const itemsEtappenplaner = (): ISubmenuData[] => {
    return [
        {
            text: "sidebar_general_outline",
            id: 'stepsGenerally',
            link: '/ve-designer/step-names',
        },
    ];
};

export const mainMenu = (): IMenuData[] => {
    return [
        {
            // text: t('sidebar_general'),
            text: 'sidebar_general',
            id: 'generally',
            link: '',
            image: imageGeneralInformation,
            // submenu: getSubMenu('generally', itemsAllgemein)
            submenu: itemsAllgemein(),
        },
        {
            text: "sidebar_phases",
            id: 'steps',
            link: '',
            image: imageStagePlanner,
            submenu: itemsEtappenplaner(),
        },
        {
            text: "sidebar_summary",
            id: 'finish',
            link: '/ve-designer/finish',
            image: imageFinish,
            submenu: [],
        },
        {
            text: "sidebar_post_processing",
            id: 'post-process',
            link: '/ve-designer/post-process',
            image: imageStagePlanner,
            submenu: [],
        },
    ];
};

export interface IMenuDataState {
    id: string;
    open: boolean;
}
