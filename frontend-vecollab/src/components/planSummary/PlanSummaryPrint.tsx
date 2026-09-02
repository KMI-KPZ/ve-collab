import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { format, parseISO } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import veCollabLogo from '@/images/veCollabLogo.png';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { IFineStep } from '@/pages/ve-designer/step/[stepId]';
import {
    evaluationPhaseLabelKeys,
    formatMobilityDate,
    getFilledEvaluationPhases,
    getFilledEvaluations,
    getFilledIndividualLearningGoals,
    getFilledInstitutions,
    getFilledLectures,
    getFilledPhysicalMobilities,
    getFilledTargetGroups,
    getFilledTopics,
    partnerNameOf,
} from './planContent';

interface Props {
    plan: IPlan;
    partnerProfileSnippets: { [Key: string]: BackendUserSnippet };
    // names of the plans that this plan's phases were imported from, keyed by
    // plan id
    originalPlanNames: { [planId: string]: string };
}

const PrintField = ({
    label,
    children,
    hideIfEmpty = true,
}: {
    label: string;
    children: React.ReactNode;
    hideIfEmpty?: boolean;
}) => {
    const isEmpty =
        children === null ||
        children === undefined ||
        children === '' ||
        children === false ||
        (Array.isArray(children) && children.length === 0);

    if (hideIfEmpty && isEmpty) return null;

    return (
        <div className="mb-2.5 break-inside-avoid">
            <div className="text-[9.5pt] font-bold text-slate-700">{label}</div>
            <div className="text-[10.5pt] leading-snug text-slate-900">{children}</div>
        </div>
    );
};

const PrintSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-7">
        <h2 className="mb-3 break-after-avoid border-b-2 border-ve-collab-blue pb-1 text-[15pt] font-bold text-ve-collab-blue">
            {title}
        </h2>
        {children}
    </section>
);

const PrintGroup = ({ caption, children }: { caption: string; children: React.ReactNode }) => (
    <div className="mb-4">
        <div className="mb-2 break-after-avoid text-[11pt] font-bold text-slate-800">{caption}</div>
        {children}
    </div>
);

// auto-fit collapses unused tracks, so a group with a single card gets the full
// width instead of leaving half the page empty, while groups with more cards
// still lay out two per row
const PrintCardGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(70mm,1fr))] gap-x-5 gap-y-3">
        {children}
    </div>
);

const PrintCard = ({ children }: { children: React.ReactNode }) => (
    <div className="break-inside-avoid rounded-lg border border-slate-200 bg-slate-100 px-3 pt-2.5 pb-0.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.35),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
        {children}
    </div>
);

const PrintList = ({ list }: { list: string[] }) => (
    <ul className="list-disc pl-5 text-[10.5pt] leading-snug">
        {list.map((value, index) => (
            <li key={index}>{value}</li>
        ))}
    </ul>
);

export function PlanSummaryPrint({
    plan,
    partnerProfileSnippets,
    originalPlanNames,
}: Props): JSX.Element {
    const { t } = useTranslation('common');
    const router = useRouter();
    const dateLocale = router.locale === 'de' ? de : enGB;

    const partnerName = (username: string) => partnerNameOf(partnerProfileSnippets, username);
    const formatDate = (value?: string | null) =>
        value ? format(parseISO(value), 'd. MMMM yyyy', { locale: dateLocale }) : '';

    const filledInstitutions = getFilledInstitutions(plan);
    const filledLectures = getFilledLectures(plan);
    const filledIndividualLearningGoals = getFilledIndividualLearningGoals(plan);
    const filledTargetGroups = getFilledTargetGroups(plan);
    const filledTopics = getFilledTopics(plan);
    const filledPhysicalMobilities = getFilledPhysicalMobilities(plan);
    const filledEvaluations = getFilledEvaluations(plan);

    const renderEvaluationPhases = (evaluation: IPlan['evaluation'][number]) => {
        const phases = getFilledEvaluationPhases(evaluation);

        if (phases.length === 1) {
            return (
                <PrintField label={t(evaluationPhaseLabelKeys[phases[0].key].full)}>
                    {phases[0].value}
                </PrintField>
            );
        }

        if (phases.length > 1) {
            return (
                <>
                    <div className="mt-2 mb-1 break-after-avoid text-[9.5pt] font-bold text-slate-700">
                        {t('plan_summary_evaluation_dot')}
                    </div>
                    {phases.map((phase) => (
                        <PrintField
                            key={phase.key}
                            label={t(evaluationPhaseLabelKeys[phase.key].short)}
                        >
                            {phase.value}
                        </PrintField>
                    ))}
                </>
            );
        }

        return null;
    };

    const renderStep = (fineStep: IFineStep, index: number) => {
        const originalPlanName = fineStep.original_plan
            ? originalPlanNames[fineStep.original_plan]
            : undefined;

        return (
            <div key={index} className="mb-6">
                {/* name and dates form the phase's header stay together, and
                    a page break directly after them is avoided */}
                <div className="break-inside-avoid break-after-avoid">
                    <h3 className="mb-2 break-after-avoid text-[12.5pt] font-bold text-slate-900">
                        {fineStep.name}
                    </h3>

                    <div className="mb-2 text-[10pt] text-slate-600">
                        {formatDate(fineStep.timestamp_from)} – {formatDate(fineStep.timestamp_to)}
                        {!!fineStep.workload && (
                            <>
                                {' '}
                                · {t('plan_summary_duration')} {fineStep.workload} h
                            </>
                        )}
                    </div>
                </div>

                <PrintField label={t('plan_summary_learning_goals')}>
                    {fineStep.learning_goal}
                </PrintField>

                <PrintField label={t('plan_summary_learning_activities')}>
                    {fineStep.learning_activity}
                </PrintField>

                {fineStep.has_tasks && fineStep.tasks.length > 0 && (
                    <PrintGroup caption={t('plan_summary_tasks')}>
                        <PrintCardGrid>
                            {fineStep.tasks.map((task, taskIndex) => (
                                <PrintCard key={taskIndex}>
                                    <PrintField label={t('plan_summary_task')}>
                                        {task.task_formulation}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_work_mode')}>
                                        {task.work_mode}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_notes')}>
                                        {task.notes}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_tools')}>
                                        {task.tools.filter((tool) => tool !== '').join(', ')}
                                    </PrintField>
                                </PrintCard>
                            ))}
                        </PrintCardGrid>
                    </PrintGroup>
                )}

                {fineStep.original_plan && fineStep.original_plan !== '' && (
                    <PrintField label={t('plan_summary_imported_from')}>
                        {originalPlanName ?? t('plan_summary_plan_no_longer_available')}
                    </PrintField>
                )}
            </div>
        );
    };

    return (
        <div className="mx-auto w-full max-w-[190mm] text-slate-900">
            {/* cover page */}
            <div className="flex min-h-[220mm] break-after-page flex-col px-[10mm] py-[10mm]">
                <Image src={veCollabLogo} alt="VE-Collab" width={170} unoptimized />

                <div className="my-auto">
                    <h1 className="text-[30pt] leading-tight font-bold text-slate-900">
                        {plan.name}
                    </h1>
                    <p className="mt-3 text-[14pt] text-ve-collab-blue">
                        {t('plan_summary_print_subtitle')}
                    </p>
                </div>

                <div className="text-[10.5pt] text-slate-600">
                    <div>
                        {plan.author.first_name} {plan.author.last_name}
                    </div>
                    <div>
                        {t('plan_summary_print_generated', {
                            date: format(new Date(), 'd. MMMM yyyy', { locale: dateLocale }),
                        })}
                    </div>
                </div>
            </div>

            <PrintSection title={t('plan_summary_characteristics')}>
                <PrintField label={t('plan_summary_abstract')}>{plan.abstract}</PrintField>

                {plan.partners.length > 0 && (
                    <PrintField label={t('plan_summary_partners')}>
                        <PrintList list={plan.partners.map(partnerName)} />
                    </PrintField>
                )}

                {plan.involved_parties.length > 0 && (
                    <PrintField label={t('plan_summary_externals')}>
                        <PrintList list={plan.involved_parties} />
                    </PrintField>
                )}

                {filledInstitutions.length > 0 && (
                    <PrintGroup caption={t('plan_summary_institutions')}>
                        <PrintCardGrid>
                            {filledInstitutions.map((institution, index) => (
                                <PrintCard key={index}>
                                    <PrintField label={t('plan_summary_institutions_name')}>
                                        {institution.name}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_institutions_type')}>
                                        {institution.school_type}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_institutions_country')}>
                                        {institution.country}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_institutions_department')}>
                                        {institution.department}
                                    </PrintField>
                                </PrintCard>
                            ))}
                        </PrintCardGrid>
                    </PrintGroup>
                )}

                {filledLectures.length > 0 && (
                    <PrintGroup caption={t('plan_summary_lectures')}>
                        <PrintCardGrid>
                            {filledLectures.map((lecture, index) => (
                                <PrintCard key={index}>
                                    <PrintField label={t('plan_summary_lectures_name')}>
                                        {lecture.name}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_lectures_type')}>
                                        {lecture.lecture_type}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_lectures_format')}>
                                        {lecture.lecture_format}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_lectures_participants')}>
                                        {lecture.participants_amount}
                                    </PrintField>
                                </PrintCard>
                            ))}
                        </PrintCardGrid>
                    </PrintGroup>
                )}

                {filledIndividualLearningGoals.length > 0 && (
                    <PrintGroup caption={t('plan_summary_individual_learning_goals')}>
                        <PrintCardGrid>
                            {filledIndividualLearningGoals.map((goalPerPartner, index) => (
                                <PrintCard key={index}>
                                    <PrintField
                                        label={t('plan_summary_individual_learning_goals_name')}
                                    >
                                        {partnerName(goalPerPartner.username)}
                                    </PrintField>
                                    <PrintField
                                        label={t('plan_summary_individual_learning_goals_goals')}
                                    >
                                        {goalPerPartner.learning_goal}
                                    </PrintField>
                                </PrintCard>
                            ))}
                        </PrintCardGrid>
                    </PrintGroup>
                )}

                {plan.major_learning_goals.length > 0 && (
                    <PrintField label={t('plan_summary_major_learning_goals')}>
                        <PrintList list={plan.major_learning_goals} />
                    </PrintField>
                )}

                {plan.methodical_approaches.length > 0 && (
                    <PrintField label={t('plan_summary_methodics')}>
                        <PrintList list={plan.methodical_approaches} />
                    </PrintField>
                )}

                {filledTargetGroups.length > 0 && (
                    <PrintGroup caption={t('plan_summary_target_groups')}>
                        <PrintCardGrid>
                            {filledTargetGroups.map((studyGroup, index) => (
                                <PrintCard key={index}>
                                    <PrintField label={t('plan_summary_target_groups_name')}>
                                        {studyGroup.name}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_target_groups_semester')}>
                                        {studyGroup.semester}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_target_groups_experience')}>
                                        {studyGroup.experience}
                                    </PrintField>
                                    <PrintField
                                        label={t('plan_summary_target_groups_academic_course')}
                                    >
                                        {studyGroup.academic_course}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_target_groups_languages')}>
                                        {studyGroup.languages.join(', ')}
                                    </PrintField>
                                </PrintCard>
                            ))}
                        </PrintCardGrid>
                    </PrintGroup>
                )}

                {filledTopics.length > 0 && (
                    <PrintField label={t('plan_summary_topics')}>
                        <PrintList list={filledTopics} />
                    </PrintField>
                )}

                {plan.languages.length > 0 && (
                    <PrintField label={t('plan_summary_languages')}>
                        <PrintList list={plan.languages} />
                    </PrintField>
                )}

                <PrintField label={t('plan_summary_formats')}>{plan.realization}</PrintField>

                <PrintField label={t('plan_summary_phys_mobility')} hideIfEmpty={false}>
                    {plan.physical_mobility ? t('yes') : t('no')}
                </PrintField>

                {filledPhysicalMobilities.length > 0 && (
                    <PrintGroup caption={t('plan_summary_phys_mobility_meets')}>
                        <PrintCardGrid>
                            {filledPhysicalMobilities.map((mobility, index) => (
                                <PrintCard key={index}>
                                    <PrintField label={t('plan_summary_phys_mobility_location')}>
                                        {mobility.location}
                                    </PrintField>
                                    <PrintField label={t('plan_summary_phys_mobility_date')}>
                                        {formatMobilityDate(mobility)}
                                    </PrintField>
                                </PrintCard>
                            ))}
                        </PrintCardGrid>
                    </PrintGroup>
                )}

                <PrintField label={t('plan_summary_learning_env')}>{plan.learning_env}</PrintField>

                {filledEvaluations.length > 0 && (
                    <PrintGroup caption={t('plan_summary_evaluation')}>
                        <PrintCardGrid>
                            {filledEvaluations.map((evaluation, index) => (
                                <PrintCard key={index}>
                                    <PrintField label={t('plan_summary_evaluation_group_of')}>
                                        {partnerName(evaluation.username)}
                                    </PrintField>
                                    <PrintField
                                        label={t('plan_summary_evaluation_is_graded')}
                                        hideIfEmpty={false}
                                    >
                                        {evaluation.is_graded ? t('yes') : t('no')}
                                    </PrintField>
                                    {evaluation.is_graded && (
                                        <>
                                            <PrintField
                                                label={t('plan_summary_evaluation_task_type')}
                                            >
                                                {evaluation.task_type}
                                            </PrintField>
                                            <PrintField
                                                label={t('plan_summary_evaluation_assessment_type')}
                                            >
                                                {evaluation.assessment_type}
                                            </PrintField>
                                        </>
                                    )}
                                    {renderEvaluationPhases(evaluation)}
                                </PrintCard>
                            ))}
                        </PrintCardGrid>
                    </PrintGroup>
                )}
            </PrintSection>

            <PrintSection title={t('plan_summary_phases')}>
                {plan.steps !== undefined && plan.steps.length > 0 ? (
                    plan.steps.map((fineStep, index) => renderStep(fineStep, index))
                ) : (
                    <div className="text-[10.5pt]">{t('plan_summary_no_phases')}</div>
                )}
            </PrintSection>

            <PrintSection title={t('plan_summary_gpb_documentation')}>
                <PrintField label={t('plan_summary_is_good_practise')} hideIfEmpty={false}>
                    {plan.is_good_practise ? t('yes') : t('no')}
                </PrintField>

                <PrintField label={t('plan_summary_underlying_ve_model')}>
                    {plan.underlying_ve_model}
                </PrintField>

                <PrintField label={t('plan_summary_reflection')}>{plan.reflection}</PrintField>

                <PrintField label={t('plan_summary_reflection_file')}>
                    {plan.evaluation_file ? plan.evaluation_file.file_name : ''}
                </PrintField>

                <PrintField label={t('plan_summary_literature')}>{plan.literature}</PrintField>

                {plan.literature_files && plan.literature_files.length > 0 && (
                    <PrintField label={t('plan_summary_literature_files')}>
                        <PrintList list={plan.literature_files.map((file) => file.file_name)} />
                    </PrintField>
                )}
            </PrintSection>
        </div>
    );
}
