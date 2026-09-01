import React, { useState } from 'react';
import { IFineStep } from '@/pages/ve-designer/step/[stepId]';
import { Field, FieldCard, FieldGroup } from './PlanSummary';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import Link from 'next/link';
import {
    MdArrowOutward,
    MdImportExport,
    MdKeyboardDoubleArrowDown,
    MdKeyboardDoubleArrowUp,
} from 'react-icons/md';
import { useTranslation } from 'next-i18next';
import { useSession } from 'next-auth/react';
import ButtonLight from '../common/buttons/ButtongLight';

interface Props {
    index: number;
    plan: IPlan;
    fineStep: IFineStep;
    openAllBoxes?: boolean;
    handleImportStep?: (step: IFineStep) => void;
    availablePlans: IPlan[];
}

export default function ViewFinestep({
    index,
    plan,
    fineStep,
    openAllBoxes,
    availablePlans,
    handleImportStep,
}: Props): JSX.Element {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    // TODO BUG available plan has a default limit of 10
    const originalPlan = availablePlans.find((a) => a._id == fineStep.original_plan);

    const canExport =
        !plan.is_good_practise_ro ||
        plan.write_access.includes(session?.user.preferred_username as string);

    const convertDateToLocal = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const [isOpenStepSection, setIsOpenStepSection] = useState<boolean>(
        openAllBoxes ? true : false
    );

    const isLastStep = index + 1 == plan.steps.length;

    return (
        <div className="mb-4">
            {!isOpenStepSection ? (
                <>
                    <div className="group">
                        <div className="flex flex-col">
                            <h3
                                className="my-2 w-fit font-bold text-xl cursor-pointer before:content-['•'] before:mr-2"
                                onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                            >
                                {fineStep.name}
                            </h3>
                            <div className="ml-4 italic text-slate-800 self-start">
                                <div className="my-2 text-nowrap">
                                    {convertDateToLocal(fineStep.timestamp_from)}
                                    {' - '}
                                    {convertDateToLocal(fineStep.timestamp_to)}
                                </div>
                            </div>

                            <div className="ml-4 mt-2 max-h-20 max-w-4xl text-ellipsis line-clamp-3 text-wrap">
                                {fineStep.learning_goal}
                            </div>
                        </div>

                        <hr
                            className={`mt-10 -mb-5 h-px w-9/12 bg-ve-collab-blue/50 border-0 m-auto ${
                                isLastStep ? 'h-0!' : ''
                            }`}
                        />

                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity ease-in-out">
                            <ButtonLight
                                onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                                className="mx-2 rounded-full! flex items-center text-slate-800 print:hidden"
                            >
                                {t('show_all')}
                                <MdKeyboardDoubleArrowDown className="inline ml-2" />
                            </ButtonLight>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="group">
                        <div className="flex flex-wrap justify-between items-center">
                            <div className="">
                                <h3
                                    className="my-2  grow font-bold text-xl cursor-pointer before:content-['•'] before:mr-2"
                                    onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                                >
                                    {fineStep.name}
                                </h3>
                            </div>

                            {typeof handleImportStep !== 'undefined' && canExport == true && (
                                <div className="ml-auto">
                                    <ButtonLight
                                        className="print:hidden"
                                        title={t('plan_summary_btn_export_title')}
                                        onClick={() => {
                                            handleImportStep(fineStep);
                                        }}
                                    >
                                        <MdImportExport className="inline mr-2" />
                                        {t('plan_summary_btn_export')}
                                    </ButtonLight>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="ml-4 mt-2">
                        <Field label={t('plan_summary_export_from')} compact hideIfEmpty={false}>
                            {convertDateToLocal(fineStep.timestamp_from)}
                        </Field>

                        <Field label={t('plan_summary_export_to')} compact hideIfEmpty={false}>
                            {convertDateToLocal(fineStep.timestamp_to)}
                        </Field>

                        <Field label={t('plan_summary_duration')} compact hideIfEmpty={false}>
                            {fineStep.workload} Stunden
                        </Field>

                        <Field label={t('plan_summary_learning_goals')}>
                            {fineStep.learning_goal}
                        </Field>

                        <Field label={t('plan_summary_learning_activities')}>
                            {fineStep.learning_activity}
                        </Field>

                        <Field label={t('plan_summary_detailed_learning_activities')} hideIfEmpty={false}>
                            {fineStep.has_tasks ? 'Ja' : 'Nein'}
                        </Field>

                        {fineStep.has_tasks && fineStep.tasks.length > 0 && (
                            <FieldGroup caption={t('plan_summary_tasks')}>
                                {fineStep.tasks.map((task, taskIndex) => (
                                    <FieldCard key={taskIndex}>
                                        <Field compact label={t('plan_summary_task')}>
                                            {task.task_formulation}
                                        </Field>
                                        <Field compact label={t('plan_summary_work_mode')}>
                                            {task.work_mode}
                                        </Field>
                                        <Field compact label={t('plan_summary_notes')}>
                                            {task.notes}
                                        </Field>
                                        <Field compact label={t('plan_summary_tools')}>
                                            {task.tools
                                                .filter((element) => element !== '')
                                                .join(', ')}
                                        </Field>
                                    </FieldCard>
                                ))}
                            </FieldGroup>
                        )}

                        {fineStep.original_plan && fineStep.original_plan !== '' && (
                            <>
                                <Field label={t('plan_summary_imported_from')} hideIfEmpty={false}>
                                    {typeof originalPlan !== 'undefined' ? (
                                        <Link href={`/plan/${originalPlan?._id}`} target="_blank">
                                            {originalPlan?.name}
                                            <MdArrowOutward className="inline" />
                                        </Link>
                                    ) : (
                                        <>{t('plan_summary_plan_no_longer_available')}</>
                                    )}
                                </Field>

                                {typeof originalPlan !== 'undefined' && (
                                    <Field
                                        label={t('plan_summary_author_original_plan')}
                                        hideIfEmpty={false}
                                    >
                                        {`${originalPlan?.author.first_name} ${originalPlan?.author.last_name}`}
                                    </Field>
                                )}
                            </>
                        )}

                        <hr
                            className={`mt-6 -mb-4 h-px w-9/12 bg-ve-collab-blue/50 border-0 m-auto ${
                                isLastStep ? 'h-0!' : ''
                            }`}
                        />
                        <div className="flex justify-center">
                            <ButtonLight
                                onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                                className="mx-2 rounded-full! flex items-center text-slate-800 print:hidden"
                            >
                                {t('show_less')}
                                <MdKeyboardDoubleArrowUp className="inline ml-2" />
                            </ButtonLight>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
