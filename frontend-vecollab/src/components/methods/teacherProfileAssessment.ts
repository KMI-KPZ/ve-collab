import type { TeacherProfileDimension } from './MethodSidebar';

/** the answers of the self-assessment: question id -> likert value */
export type TeacherProfileAnswers = Record<string, number>;

/** position on each teacher profile slider, from 0 (niedrig) to 1 (hoch) */
export type TeacherProfileScores = Partial<Record<TeacherProfileDimension, number>>;

/** likert scale from "stimme nicht zu" (1) to "stimme voll und ganz zu" (5) */
export const LIKERT_VALUES = [1, 2, 3, 4, 5];
const LIKERT_MIN = LIKERT_VALUES[0];
const LIKERT_MAX = LIKERT_VALUES[LIKERT_VALUES.length - 1];

/**
 * the questions of the self-assessment per dimension of the teacher profile filter,
 * in the order of the sliders. The ids match TEACHER_PROFILE_QUESTIONS of the backend,
 * the texts are translated as `teacher_profile_assessment.questions.<id>`
 * and `teacher_profile_assessment.dimensions.<key>` (namespace community).
 */
export const TEACHER_PROFILE_QUESTIONS: {
    key: string;
    dimension: TeacherProfileDimension;
    questionIds: string[];
}[] = [
    {
        key: 'digital_teaching',
        dimension: 'Digitale Lehre',
        questionIds: [
            'describe_online_methods',
            'describe_planning_aspects',
            'conduct_scenarios',
            'advise_others',
        ],
    },
    {
        key: 'it_competence',
        dimension: 'IT Kompetenz',
        questionIds: [
            'operate_learning_platforms',
            'protect_digital_data',
            'guide_web20_tools',
            'guide_learning_platforms',
        ],
    },
    {
        key: 'communication_collaboration',
        dimension: 'Kommunikation / Kollaboration',
        questionIds: [
            'identify_online_communication_issues',
            'support_learner_cooperation',
            'guide_cooperation_design',
        ],
    },
];

export const TEACHER_PROFILE_QUESTION_IDS = TEACHER_PROFILE_QUESTIONS.flatMap(
    (group) => group.questionIds
);

/** number of questions answered with a valid likert value */
export function countAnswered(answers: TeacherProfileAnswers): number {
    return TEACHER_PROFILE_QUESTION_IDS.filter((id) => LIKERT_VALUES.includes(answers[id])).length;
}

export function isAssessmentComplete(answers: TeacherProfileAnswers): boolean {
    return countAnswered(answers) === TEACHER_PROFILE_QUESTION_IDS.length;
}

/**
 * Position of the user on the slider of each dimension: the mean answer to the
 * questions of the dimension, scaled from 1–5 to 0–1.
 * Dimensions without any answer are left out.
 */
export function getTeacherProfileScores(answers: TeacherProfileAnswers): TeacherProfileScores {
    const scores: TeacherProfileScores = {};
    for (const { dimension, questionIds } of TEACHER_PROFILE_QUESTIONS) {
        const values = questionIds
            .map((id) => answers[id])
            .filter((value) => LIKERT_VALUES.includes(value));
        if (values.length === 0) continue;

        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        scores[dimension] = (mean - LIKERT_MIN) / (LIKERT_MAX - LIKERT_MIN);
    }
    return scores;
}
