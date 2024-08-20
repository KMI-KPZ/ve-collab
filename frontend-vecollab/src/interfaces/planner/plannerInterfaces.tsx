import { ISideProgressBarStates } from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import { TargetGroup } from '@/pages/ve-designer/target-groups';
import { Institution } from '@/pages/ve-designer/institutions';
import { LectureOld } from '@/pages/ve-designer/lectures';
import { CheckListPartner } from '@/pages/ve-designer/checklist';
import { EvaluationPerPartner } from '@/pages/ve-designer/evaluation';
import { EvaluationFile, LiteratureFile } from '@/pages/ve-designer/post-process';
import { PhysicalMobility } from '@/pages/ve-designer/methodology';

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
    target_groups: TargetGroup[];
    author: string;
    abstract: string | null;
    creation_timestamp: string;
    duration: number | null;
    checklist: CheckListPartner[];
    institutions: Institution[];
    involved_parties: string[];
    languages: string[];
    evaluation: EvaluationPerPartner[];
    evaluation_file: EvaluationFile;
    last_modified: string;
    learning_env: string | null;
    major_learning_goals: string[];
    individual_learning_goals: {username: string, learning_goal: string}[];
    methodical_approaches: string[];
    lectures: LectureOld[];
    name: string;
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
    literature?: string | null;
    literature_files?: LiteratureFile[] | null;
    timestamp_from: string | null;
    timestamp_to: string | null;
    topics: string[];
    workload: number;
    write_access: string[];
}
