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
    name: ProgressState.notStarted;
    institutions: ProgressState.notStarted;
    topic: ProgressState.notStarted;
    lectures: ProgressState.notStarted;
    audience: ProgressState.notStarted;
    languages: ProgressState.notStarted;
    involved_parties: ProgressState.notStarted;
    realization: ProgressState.notStarted;
    learning_env: ProgressState.notStarted;
    tools: ProgressState.notStarted;
    new_content: ProgressState.notStarted;
    formalities: ProgressState.notStarted;
    steps: ISideProgressBarStateSteps[];
}

export interface ISideProgressBarStateSteps {
    [key: string]: ProgressState.notStarted;
}

export const initialSideProgressBarStates: ISideProgressBarStates = {
    name: ProgressState.notStarted,
    institutions: ProgressState.notStarted,
    topic: ProgressState.notStarted,
    lectures: ProgressState.notStarted,
    audience: ProgressState.notStarted,
    languages: ProgressState.notStarted,
    involved_parties: ProgressState.notStarted,
    realization: ProgressState.notStarted,
    learning_env: ProgressState.notStarted,
    tools: ProgressState.notStarted,
    new_content: ProgressState.notStarted,
    formalities: ProgressState.notStarted,
    steps: [],
};
