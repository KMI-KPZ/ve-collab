export interface IMenuData {
    id: string;
    text: string;
    link: string;
    image: string;
    submenu: ISubmenuData[]
}

export interface ISubmenuData {
    readonly text: string;
    readonly id: string;
    readonly link: string;
}

// eslint error with enums
export enum ProgressState {
    // eslint-disable-next-line no-unused-vars
    completed = 'completed',
    // eslint-disable-next-line no-unused-vars
    notStarted = 'not_started',
    // eslint-disable-next-line no-unused-vars
    uncompleted = 'uncompleted',
}

export interface ISideProgressBarStates {
    name: ProgressState;
    partners: ProgressState;
    institutions: ProgressState;
    topics: ProgressState;
    lectures: ProgressState;
    target_groups: ProgressState;
    languages: ProgressState;
    involved_parties: ProgressState;
    realization: ProgressState;
    learning_env: ProgressState;
    checklist: ProgressState;
    steps: ISideProgressBarStateSteps[];
}

export interface ISideProgressBarStateSteps {
    [key: string]: ProgressState;
}

export const initialSideProgressBarStates: ISideProgressBarStates = {
    name: ProgressState.notStarted,
    partners: ProgressState.notStarted,
    institutions: ProgressState.notStarted,
    topics: ProgressState.notStarted,
    lectures: ProgressState.notStarted,
    target_groups: ProgressState.notStarted,
    languages: ProgressState.notStarted,
    involved_parties: ProgressState.notStarted,
    realization: ProgressState.notStarted,
    learning_env: ProgressState.notStarted,
    checklist: ProgressState.notStarted,
    steps: [],
};
