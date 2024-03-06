export interface SideMenuStep {
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
    audience: ProgressState;
    languages: ProgressState;
    involved_parties: ProgressState;
    realization: ProgressState;
    learning_env: ProgressState;
    new_content: ProgressState;
    formalities: ProgressState;
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
    audience: ProgressState.notStarted,
    languages: ProgressState.notStarted,
    involved_parties: ProgressState.notStarted,
    realization: ProgressState.notStarted,
    learning_env: ProgressState.notStarted,
    new_content: ProgressState.notStarted,
    formalities: ProgressState.notStarted,
    steps: [],
};
