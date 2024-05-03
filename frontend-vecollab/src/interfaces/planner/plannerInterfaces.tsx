import { ISideProgressBarStates } from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import { TargetGroup } from '@/pages/ve-designer/target-groups';
import { Lecture } from '@/pages/ve-designer/lectures';
import { LectureOld } from '@/pages/ve-designer/participatingCourses';
import { PhysicalMobility } from '@/pages/ve-designer/teaching-formats';
import { CheckListPartner } from '@/pages/ve-designer/checklist';
import { EvaluationPerPartner } from '@/pages/ve-designer/evaluation';

export interface PlanPreview {
    _id: string;
    name: string;
    author: string;
    read_access: string[];
    write_access: string[];
    creation_timestamp: string;
    last_modified: string;
    progress: ISideProgressBarStates;
    is_good_practise: boolean;
}

export interface IPlan {
    _id: string;
    audience: TargetGroup[];
    author: string;
    creation_timestamp: string;
    duration: number | null;
    formalities: CheckListPartner[];
    institutions: Lecture[];
    involved_parties: string[];
    languages: string[];
    evaluation: EvaluationPerPartner[];
    last_modified: string;
    learning_env: string | null;
    learning_goals: string[];
    lectures: LectureOld[];
    name: string;
    new_content: boolean | null;
    partners: string[];
    physical_mobility: boolean | null;
    physical_mobilities: PhysicalMobility[];
    progress: ISideProgressBarStates;
    read_access: string[];
    realization: string | null;
    steps: IFineStep[];
    is_good_practise: boolean;
    underlying_ve_model: string | null;
    reflection: string | null;
    good_practise_evaluation: string | null;
    timestamp_from: string | null;
    timestamp_to: string | null;
    topics: string[];
    workload: number;
    write_access: string[];
}
