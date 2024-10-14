import React, { useState } from 'react';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import {
    Caption4,
    GridEntry,
    GridEntryCaption,
    GridEntrySubGrid,
    showDataOrEmptySign,
} from './PlanSummary';
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
                                    {showDataOrEmptySign(
                                        convertDateToLocal(fineStep.timestamp_from)
                                    )}
                                    {' - '}
                                    {showDataOrEmptySign(convertDateToLocal(fineStep.timestamp_to))}
                                </div>
                            </div>

                            <div className="ml-4 mt-2 max-h-20 max-w-4xl text-ellipsis line-clamp-3 text-wrap">
                                {fineStep.learning_goal}
                            </div>
                        </div>

                        <hr
                            className={`mt-10 -mb-5 h-px w-9/12 bg-ve-collab-blue/50 border-0 m-auto ${
                                isLastStep ? '!h-0' : ''
                            }`}
                        />

                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity ease-in-out">
                            <ButtonLight
                                onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                                classNameExtend="mx-2 !rounded-full flex items-center text-slate-800 print:hidden"
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
                                        classNameExtend="print:hidden"
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

                    <div className="ml-4 mt-2 grid grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                        <div>
                            <GridEntryCaption>{t('plan_summary_export_from')}</GridEntryCaption>
                            <div className="ml-6">
                                {showDataOrEmptySign(convertDateToLocal(fineStep.timestamp_from))}
                            </div>
                        </div>

                        <div>
                            <GridEntryCaption>{t('plan_summary_export_to')}</GridEntryCaption>
                            <div className="ml-6">
                                {showDataOrEmptySign(convertDateToLocal(fineStep.timestamp_to))}
                            </div>
                        </div>

                        <div>
                            <GridEntryCaption>{t('plan_summary_duration')}</GridEntryCaption>
                            <div className="ml-6">
                                {showDataOrEmptySign(fineStep.workload) + ' Stunden'}
                            </div>
                        </div>

                        <GridEntry caption={t('plan_summary_learning_goals')}>
                            {showDataOrEmptySign(fineStep.learning_goal)}
                        </GridEntry>

                        <GridEntry caption={t('plan_summary_learning_activities')}>
                            {showDataOrEmptySign(fineStep.learning_activity)}
                        </GridEntry>

                        <GridEntry caption={t('plan_summary_detailed_learning_activities')}>
                            {showDataOrEmptySign(fineStep.has_tasks ? 'Ja' : 'Nein')}
                        </GridEntry>

                        {fineStep.has_tasks && (
                            <GridEntry caption={t('plan_summary_tasks')}>
                                <GridEntrySubGrid>
                                    {fineStep.tasks.map((task, taskIndex) => (
                                        <ul className="space-y-1 mr-2" key={taskIndex}>
                                            <li className="flex">
                                                <div className="w-1/2 lg:w-1/3 xl:w-1/4">
                                                    <Caption4>{t('plan_summary_task')}</Caption4>
                                                </div>
                                                <div className="w-1/2 lg:w-2/3 xl:w-3/4">
                                                    {showDataOrEmptySign(task.task_formulation)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 lg:w-1/3 xl:w-1/4">
                                                    <Caption4>
                                                        {t('plan_summary_work_mode')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2 lg:w-2/3 xl:w-3/4">
                                                    {showDataOrEmptySign(task.work_mode)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 lg:w-1/3 xl:w-1/4">
                                                    <Caption4>{t('plan_summary_notes')}</Caption4>
                                                </div>
                                                <div className="w-1/2 lg:w-2/3 xl:w-3/4">
                                                    {showDataOrEmptySign(task.notes)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 lg:w-1/3 xl:w-1/4">
                                                    <Caption4>{t('plan_summary_tools')}</Caption4>
                                                </div>
                                                <div className="w-1/2 lg:w-2/3 xl:w-3/4">
                                                    {showDataOrEmptySign(
                                                        task.tools
                                                            .filter((element) => element !== '')
                                                            .join(', ')
                                                    )}
                                                </div>
                                            </li>
                                        </ul>
                                    ))}
                                </GridEntrySubGrid>
                            </GridEntry>
                        )}

                        {fineStep.original_plan && fineStep.original_plan !== '' && (
                            <>
                                <GridEntry caption={t('plan_summary_imported_from')}>
                                    {typeof originalPlan !== 'undefined' ? (
                                        <Link href={`/plan/${originalPlan?._id}`} target="_blank">
                                            {originalPlan?.name}
                                            <MdArrowOutward className="inline" />
                                        </Link>
                                    ) : (
                                        <>{t('plan_summary_plan_no_longer_available')}</>
                                    )}
                                </GridEntry>

                                {typeof originalPlan !== 'undefined' && (
                                    <GridEntry caption={t('plan_summary_author_original_plan')}>
                                        {showDataOrEmptySign(
                                            `${originalPlan?.author.first_name} ${originalPlan?.author.last_name}`
                                        )}
                                    </GridEntry>
                                )}
                            </>
                        )}

                        <div className="my-2 col-span-4">
                            <hr
                                className={`mt-6 -mb-4 h-px w-9/12 bg-ve-collab-blue/50 border-0 m-auto ${
                                    isLastStep ? '!h-0' : ''
                                }`}
                            />
                            <div className="flex justify-center">
                                <ButtonLight
                                    onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                                    classNameExtend="mx-2 !rounded-full flex items-center text-slate-800 print:hidden"
                                >
                                    {t('show_less')}
                                    <MdKeyboardDoubleArrowUp className="inline ml-2" />
                                </ButtonLight>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
