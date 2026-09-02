import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';

/*

The VE-designer auto-creates a stub entry for several of the plan's list
fields as soon as their form step is opened (e.g. one target group, one
evaluation and one learning goal per partner), even if the user never fills
anything in. Those stubs must not show up as empty cards in the summary rendering.
*/

export const hasText = (value?: string | null) => !!value && value.trim() !== '';

export const partnerNameOf = (
    partnerProfileSnippets: { [Key: string]: BackendUserSnippet },
    username: string
) =>
    partnerProfileSnippets[username]
        ? `${partnerProfileSnippets[username].first_name} ${partnerProfileSnippets[username].last_name}`
        : username;

export const getFilledInstitutions = (plan: IPlan) =>
    plan.institutions.filter(
        (institution) =>
            hasText(institution.name) ||
            hasText(institution.school_type) ||
            hasText(institution.country) ||
            hasText(institution.department)
    );

export const getFilledLectures = (plan: IPlan) =>
    plan.lectures.filter(
        (lecture) =>
            hasText(lecture.name) ||
            hasText(lecture.lecture_type) ||
            hasText(lecture.lecture_format) ||
            !!lecture.participants_amount
    );

export const getFilledIndividualLearningGoals = (plan: IPlan) =>
    plan.individual_learning_goals.filter((goal) => hasText(goal.learning_goal));

export const getFilledTargetGroups = (plan: IPlan) =>
    plan.target_groups.filter(
        (studyGroup) =>
            hasText(studyGroup.name) ||
            hasText(studyGroup.semester) ||
            hasText(studyGroup.experience) ||
            hasText(studyGroup.academic_course) ||
            studyGroup.languages.length > 0
    );

export const getFilledTopics = (plan: IPlan) => plan.topics.filter(hasText);

// physical mobility meetings are irrelevant whenever physical mobility itself
// wasn't planned, regardless of any stub data left in the list
export const getFilledPhysicalMobilities = (plan: IPlan) =>
    plan.physical_mobility
        ? plan.physical_mobilities.filter(
              (mobility) =>
                  hasText(mobility.location) ||
                  hasText(mobility.timestamp_from) ||
                  hasText(mobility.timestamp_to)
          )
        : [];

export const getFilledEvaluations = (plan: IPlan) =>
    plan.evaluation.filter(
        (evaluation) =>
            evaluation.is_graded ||
            hasText(evaluation.task_type) ||
            hasText(evaluation.assessment_type) ||
            hasText(evaluation.evaluation_before) ||
            hasText(evaluation.evaluation_while) ||
            hasText(evaluation.evaluation_after)
    );

export type EvaluationPhaseKey = 'before' | 'while' | 'after';

// translation keys per evaluation phase: the "full" variant spells out
// "Evaluation ..." and is used when only a single phase was filled in, so that
// the phase isn't left ambiguous under a generic "Evaluation..." heading
export const evaluationPhaseLabelKeys: Record<EvaluationPhaseKey, { short: string; full: string }> =
    {
        before: {
            short: 'plan_summary_evaluation_before',
            full: 'plan_summary_evaluation_before_full',
        },
        while: {
            short: 'plan_summary_evaluation_while',
            full: 'plan_summary_evaluation_while_full',
        },
        after: {
            short: 'plan_summary_evaluation_after',
            full: 'plan_summary_evaluation_after_full',
        },
    };

export const getFilledEvaluationPhases = (evaluation: IPlan['evaluation'][number]) =>
    (
        [
            { key: 'before', value: evaluation.evaluation_before },
            { key: 'while', value: evaluation.evaluation_while },
            { key: 'after', value: evaluation.evaluation_after },
        ] as { key: EvaluationPhaseKey; value: string }[]
    ).filter((phase) => hasText(phase.value));

export const formatMobilityDate = (mobility: IPlan['physical_mobilities'][number]) => {
    if (!mobility.timestamp_from && !mobility.timestamp_to) return '';

    const from = mobility.timestamp_from ? mobility.timestamp_from.split('T')[0] : '';
    const to = mobility.timestamp_to ? mobility.timestamp_to.split('T')[0] : '';
    return `${from} - ${to}`;
};
