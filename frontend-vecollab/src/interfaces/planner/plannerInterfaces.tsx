import { ISideProgressBarStates } from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { TargetGroup } from '@/pages/startingWizard/generalInformation/targetGroups';
import { Institution } from '@/pages/startingWizard/generalInformation/institutions';
import { Lecture } from '@/pages/startingWizard/generalInformation/participatingCourses';
import { PhysicalMobility } from '@/pages/startingWizard/generalInformation/courseFormat';
import { FormalConditionPartner } from '@/pages/startingWizard/generalInformation/formalConditions';

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
    formalities: FormalConditionPartner[];
    institutions: Institution[];
    involved_parties: string[];
    languages: string[];
    last_modified: string;
    learning_env: string | null;
    learning_goals: string[];
    lectures: Lecture[];
    name: string;
    new_content: boolean | null;
    partners: string[];
    physical_mobility: boolean | null;
    physical_mobilities: PhysicalMobility[];
    progress: ISideProgressBarStates[];
    read_access: string[];
    realization: string | null;
    steps: IFineStep[];
    is_good_practise: boolean;
    underlying_ve_model: string | null;
    reflection: string | null;
    evaluation: string | null;
    timestamp_from: string | null;
    timestamp_to: string | null;
    topics: string[];
    workload: number;
    write_access: string[];
}
