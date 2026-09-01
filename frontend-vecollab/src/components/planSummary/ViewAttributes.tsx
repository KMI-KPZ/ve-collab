import React from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Field, FieldCard, FieldGroup, FieldList } from './PlanSummary';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';

interface Props {
    plan: IPlan;
    partnerProfileSnippets: { [Key: string]: BackendUserSnippet };
}
export default function ViewAttributes({ plan, partnerProfileSnippets }: Props): JSX.Element {
    const { t } = useTranslation('common');

    const partnerName = (username: string) =>
        partnerProfileSnippets[username]
            ? `${partnerProfileSnippets[username].first_name} ${partnerProfileSnippets[username].last_name}`
            : username;

    // the VE-designer wizard auto-creates a stub entry for several of these
    // list fields as soon as their form step is opened (e.g. one target group,
    // one evaluation/learning-goal per partner), even if the user never fills
    // anything in. filter those stubs out here so an unfilled section doesn't
    // render as an empty card in the summary.
    const hasText = (value?: string | null) => !!value && value.trim() !== '';

    const filledInstitutions = plan.institutions.filter(
        (institution) =>
            hasText(institution.name) ||
            hasText(institution.school_type) ||
            hasText(institution.country) ||
            hasText(institution.department)
    );

    const filledLectures = plan.lectures.filter(
        (lecture) =>
            hasText(lecture.name) ||
            hasText(lecture.lecture_type) ||
            hasText(lecture.lecture_format) ||
            !!lecture.participants_amount
    );

    const filledIndividualLearningGoals = plan.individual_learning_goals.filter((goal) =>
        hasText(goal.learning_goal)
    );

    const filledTargetGroups = plan.target_groups.filter(
        (studyGroup) =>
            hasText(studyGroup.name) ||
            hasText(studyGroup.semester) ||
            hasText(studyGroup.experience) ||
            hasText(studyGroup.academic_course) ||
            studyGroup.languages.length > 0
    );

    const filledTopics = plan.topics.filter(hasText);

    // physical mobility meetings are irrelevant whenever physical mobility
    // itself wasn't planned, regardless of any stub data left in the list
    const filledPhysicalMobilities = plan.physical_mobility
        ? plan.physical_mobilities.filter(
              (mobility) =>
                  hasText(mobility.location) ||
                  hasText(mobility.timestamp_from) ||
                  hasText(mobility.timestamp_to)
          )
        : [];

    const filledEvaluations = plan.evaluation.filter(
        (evaluation) =>
            evaluation.is_graded ||
            hasText(evaluation.task_type) ||
            hasText(evaluation.assessment_type) ||
            hasText(evaluation.evaluation_before) ||
            hasText(evaluation.evaluation_while) ||
            hasText(evaluation.evaluation_after)
    );

    return (
        <div>
            <Field label={t('plan_summary_abstract')}>{plan.abstract}</Field>

            {(plan.partners.length > 0 || plan.involved_parties.length > 0) && (
                <div className="flex flex-wrap gap-x-12 gap-y-6">
                    {plan.partners.length > 0 && (
                        <Field label={t('plan_summary_partners')}>
                            <FieldList list={plan.partners.map(partnerName)} />
                        </Field>
                    )}

                    {plan.involved_parties.length > 0 && (
                        <Field label={t('plan_summary_externals')}>
                            <FieldList list={plan.involved_parties} />
                        </Field>
                    )}
                </div>
            )}

            {filledInstitutions.length > 0 && (
                <FieldGroup caption={t('plan_summary_institutions')}>
                    {filledInstitutions.map((institution, index) => (
                        <FieldCard key={index}>
                            <Field compact label={t('plan_summary_institutions_name')}>
                                {institution.name}
                            </Field>
                            <Field compact label={t('plan_summary_institutions_type')}>
                                {institution.school_type}
                            </Field>
                            <Field compact label={t('plan_summary_institutions_country')}>
                                {institution.country}
                            </Field>
                            <Field compact label={t('plan_summary_institutions_department')}>
                                {institution.department}
                            </Field>
                        </FieldCard>
                    ))}
                </FieldGroup>
            )}

            {filledLectures.length > 0 && (
                <FieldGroup caption={t('plan_summary_lectures')}>
                    {filledLectures.map((lecture, index) => (
                        <FieldCard key={index}>
                            <Field compact label={t('plan_summary_lectures_name')}>
                                {lecture.name}
                            </Field>
                            <Field compact label={`${t('plan_summary_lectures_type')}`}>
                                {lecture.lecture_type}
                            </Field>
                            <Field compact label={t('plan_summary_lectures_format')}>
                                {lecture.lecture_format}
                            </Field>
                            <Field compact label={t('plan_summary_lectures_participants')}>
                                {lecture.participants_amount}
                            </Field>
                        </FieldCard>
                    ))}
                </FieldGroup>
            )}

            {filledIndividualLearningGoals.length > 0 && (
                <FieldGroup caption={t('plan_summary_individual_learning_goals')}>
                    {filledIndividualLearningGoals.map((goalPerPartner, index) => (
                        <FieldCard key={index}>
                            <Field compact label={t('plan_summary_individual_learning_goals_name')}>
                                {partnerName(goalPerPartner.username)}
                            </Field>
                            <Field
                                compact
                                label={t('plan_summary_individual_learning_goals_goals')}
                            >
                                {goalPerPartner.learning_goal}
                            </Field>
                        </FieldCard>
                    ))}
                </FieldGroup>
            )}

            {plan.major_learning_goals.length > 0 && (
                <Field label={t('plan_summary_major_learning_goals')}>
                    <FieldList list={plan.major_learning_goals} />
                </Field>
            )}

            {plan.methodical_approaches.length > 0 && (
                <Field label={t('plan_summary_methodics')}>
                    <FieldList list={plan.methodical_approaches} />
                </Field>
            )}

            {filledTargetGroups.length > 0 && (
                <FieldGroup caption={t('plan_summary_target_groups')}>
                    {filledTargetGroups.map((studyGroup, index) => (
                        <FieldCard key={index}>
                            <Field compact label={t('plan_summary_target_groups_name')}>
                                {studyGroup.name}
                            </Field>
                            <Field compact label={t('plan_summary_target_groups_semester')}>
                                {studyGroup.semester}
                            </Field>
                            <Field compact label={t('plan_summary_target_groups_experience')}>
                                {studyGroup.experience}
                            </Field>
                            <Field compact label={t('plan_summary_target_groups_academic_course')}>
                                {studyGroup.academic_course}
                            </Field>
                            <Field compact label={t('plan_summary_target_groups_languages')}>
                                {studyGroup.languages.join(', ')}
                            </Field>
                        </FieldCard>
                    ))}
                </FieldGroup>
            )}

            {filledTopics.length > 0 && (
                <Field label={t('plan_summary_topics')}>
                    <FieldList list={filledTopics} />
                </Field>
            )}

            {plan.languages.length > 0 && (
                <Field label={t('plan_summary_languages')}>
                    <FieldList list={plan.languages} />
                </Field>
            )}

            <div className="flex flex-wrap gap-x-12 gap-y-6">
                <Field label={t('plan_summary_formats')}>{plan.realization}</Field>

                <Field label={t('plan_summary_phys_mobility')} hideIfEmpty={false}>
                    {plan.physical_mobility ? t('yes') : t('no')}
                </Field>
            </div>

            {filledPhysicalMobilities.length > 0 && (
                <FieldGroup caption={t('plan_summary_phys_mobility_meets')}>
                    {filledPhysicalMobilities.map((mobility, index) => (
                        <FieldCard key={index}>
                            <Field compact label={t('plan_summary_phys_mobility_location')}>
                                {mobility.location}
                            </Field>
                            <Field compact label={t('plan_summary_phys_mobility_date')}>
                                {mobility.timestamp_from || mobility.timestamp_to
                                    ? `${
                                          mobility.timestamp_from
                                              ? mobility.timestamp_from.split('T')[0]
                                              : ''
                                      } - ${
                                          mobility.timestamp_to
                                              ? mobility.timestamp_to.split('T')[0]
                                              : ''
                                      }`
                                    : ''}
                            </Field>
                        </FieldCard>
                    ))}
                </FieldGroup>
            )}

            <Field label={t('plan_summary_learning_env')}>{plan.learning_env}</Field>

            {filledEvaluations.length > 0 && (
                <FieldGroup caption={t('plan_summary_evaluation')}>
                    {filledEvaluations.map((evaluation, index) => (
                        <FieldCard key={index}>
                            <Field compact label={t('plan_summary_evaluation_group_of')}>
                                {partnerName(evaluation.username)}
                            </Field>
                            <Field
                                compact
                                label={t('plan_summary_evaluation_is_graded')}
                                hideIfEmpty={false}
                            >
                                {evaluation.is_graded ? t('yes') : t('no')}
                            </Field>
                            {evaluation.is_graded && (
                                <>
                                    <Field compact label={t('plan_summary_evaluation_task_type')}>
                                        {evaluation.task_type}
                                    </Field>
                                    <Field
                                        compact
                                        label={t('plan_summary_evaluation_assessment_type')}
                                    >
                                        {evaluation.assessment_type}
                                    </Field>
                                </>
                            )}
                            {(() => {
                                const evaluationPhases = [
                                    {
                                        key: 'before',
                                        label: t('plan_summary_evaluation_before'),
                                        fullLabel: t('plan_summary_evaluation_before_full'),
                                        value: evaluation.evaluation_before,
                                    },
                                    {
                                        key: 'while',
                                        label: t('plan_summary_evaluation_while'),
                                        fullLabel: t('plan_summary_evaluation_while_full'),
                                        value: evaluation.evaluation_while,
                                    },
                                    {
                                        key: 'after',
                                        label: t('plan_summary_evaluation_after'),
                                        fullLabel: t('plan_summary_evaluation_after_full'),
                                        value: evaluation.evaluation_after,
                                    },
                                ].filter((phase) => hasText(phase.value));

                                if (evaluationPhases.length === 1) {
                                    return (
                                        <Field compact label={evaluationPhases[0].fullLabel}>
                                            {evaluationPhases[0].value}
                                        </Field>
                                    );
                                }

                                if (evaluationPhases.length > 1) {
                                    return (
                                        <>
                                            <h4 className="font-semibold text-slate-700 mt-3">
                                                {t('plan_summary_evaluation_dot')}
                                            </h4>
                                            {evaluationPhases.map((phase) => (
                                                <Field compact key={phase.key} label={phase.label}>
                                                    {phase.value}
                                                </Field>
                                            ))}
                                        </>
                                    );
                                }

                                return null;
                            })()}
                        </FieldCard>
                    ))}
                </FieldGroup>
            )}
        </div>
    );
}
