import { ISideProgressBarStates } from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';

export interface PlanPreview {
    _id: string;
    name: string;
    author: string;
    read_access: string[];
    write_access: string[];
    creation_timestamp: string;
    last_modified: string;
}

export interface IPlan {
    _id: string;
    audience: string[];
    author: string;
    creation_timestamp: string;
    duration: number | null;
    formalities: {
        technology: string | null;
        exam_regulations: string | null;
    };
    institutions: string[];
    involved_parties: string[];
    languages: string[];
    last_modified: string;
    learning_env: string | null;
    lectures: string[];
    name: string;
    new_content: boolean | null;
    partners: string[];
    progress: ISideProgressBarStates[];
    read_access: string[];
    realization: string | null;
    steps: IFineStep[];
    timestamp_from: string | null;
    timestamp_to: string | null;
    tools: string[];
    topic: string | null;
    workload: number;
    write_access: string[];
}
