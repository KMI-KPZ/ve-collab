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
    // uncompleted = 'uncompleted',
}

export interface ISideProgressBarStates {
    name: ProgressState;
    partners: ProgressState;
    institutions: ProgressState;
    lectures: ProgressState;
    target_groups: ProgressState;
    learning_goals: ProgressState;
    learning_env: ProgressState;
    methodical_approaches: ProgressState;
    evaluation: ProgressState;
    checklist: ProgressState;
    stepsGenerally: ProgressState;
    steps: ISideProgressBarStateSteps[];
}

export interface ISideProgressBarStateSteps {
    [key: string]: ProgressState;
}

export const initialSideProgressBarStates: ISideProgressBarStates = {
    name: ProgressState.notStarted,
    partners: ProgressState.notStarted,
    institutions: ProgressState.notStarted,
    lectures: ProgressState.notStarted,
    target_groups: ProgressState.notStarted,
    learning_goals: ProgressState.notStarted,
    learning_env: ProgressState.notStarted,
    methodical_approaches: ProgressState.notStarted,
    evaluation: ProgressState.notStarted,
    checklist: ProgressState.notStarted,
    stepsGenerally: ProgressState.notStarted,
    steps: [],
};
