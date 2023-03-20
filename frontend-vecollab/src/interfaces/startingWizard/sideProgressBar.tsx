export interface SideProgressBar {
    sideMenuSteps: SideMenuStep[];
}
export interface SideMenuStep {
    readonly text: string;
    readonly link: string;
    state: ProgressState;
}

// eslint error with enums
export enum ProgressState {
    // eslint-disable-next-line no-unused-vars
    completed,
    // eslint-disable-next-line no-unused-vars
    notStarted,
    // eslint-disable-next-line no-unused-vars
    uncompleted,
}
