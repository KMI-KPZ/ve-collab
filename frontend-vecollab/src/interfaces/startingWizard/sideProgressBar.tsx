export interface SideProgressBar {
    sideMenuSteps: SideMenuStep[];
}
export interface SideMenuStep {
    readonly text: string;
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
    institutions: ProgressState;
    topic: ProgressState;
    lectures: ProgressState;
    audience: ProgressState;
    languages: ProgressState;
    involved_parties: ProgressState;
    realization: ProgressState;
    learning_env: ProgressState;
    tools: ProgressState;
    new_content: ProgressState;
    formalities: ProgressState;
    steps: ProgressState;
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
    steps: ProgressState.notStarted,
};
