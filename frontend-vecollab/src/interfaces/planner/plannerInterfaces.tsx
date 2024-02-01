import { ISideProgressBarStates } from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { TargetGroup } from '@/pages/startingWizard/generalInformation/targetGroups';
import { Institution } from '@/pages/startingWizard/generalInformation/institutions';
import { Lecture } from '@/pages/startingWizard/generalInformation/participatingCourses';
import { Tool } from '@/pages/startingWizard/generalInformation/tools';

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
    audience: TargetGroup[];
    author: string;
    creation_timestamp: string;
    duration: number | null;
    formalities: {
        technology: string | null;
        exam_regulations: string | null;
    };
    institutions: Institution[];
    involved_parties: string[];
    languages: string[];
    last_modified: string;
    learning_env: string | null;
    lectures: Lecture[];
    name: string;
    new_content: boolean | null;
    partners: string[];
    progress: ISideProgressBarStates[];
    read_access: string[];
    realization: string | null;
    steps: IFineStep[];
    timestamp_from: string | null;
    timestamp_to: string | null;
    tools: Tool[];
    topic: string | null;
    workload: number;
    write_access: string[];
}
