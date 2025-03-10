import React, { useEffect, useState } from 'react';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useSession } from 'next-auth/react';
import { fetchPOST, useGetAvailablePlans, useGetProfileSnippets } from '@/lib/backend';
import LoadingAnimation from '../common/LoadingAnimation';
import { IFineStep } from '@/pages/ve-designer/step/[stepId]';
import Dialog from '../profile/Dialog';
import { MdEdit } from 'react-icons/md';
import Timestamp from '../common/Timestamp';
import Alert, { AlertState } from '../common/dialogs/Alert';
import { socket } from '@/lib/socket';
import { FormProvider, useForm } from 'react-hook-form';
import Link from 'next/link';
import { dropPlanLock, getPlanLock } from '../VE-designer/PlanSocket';
import { useTranslation } from 'next-i18next';
import PlanIcon from '../plans/PlanIcon';
import { FaMedal } from 'react-icons/fa';

interface Props {
    plan: IPlan;
    openAllBoxes?: boolean;
    isSingleView?: boolean;
}

interface FormValues {
    step: IFineStep;
}

PlanSummary.auth = true;
export function PlanSummary({ plan, openAllBoxes, isSingleView }: Props): JSX.Element {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [alert, setAlert] = useState<AlertState>({ open: false });
    const methods = useForm<FormValues>({ mode: 'onChange' });

    const [exportStep2Plan, setExportStep2Plan] = useState<{
        isOpen: boolean;
        step?: IFineStep;
        plan?: IPlan;
    }>({
        isOpen: false,
    });
    const [loadingExport, setLoadingExport] = useState<boolean>(false);
    const { data: availablePlans } = useGetAvailablePlans({});
    const { data: partnerUserSnippets, isLoading } = useGetProfileSnippets(
        [...plan.partners, plan.author.username],
        session!.accessToken
    );

    useEffect(() => {
        if (!partnerUserSnippets?.length) return;

        let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
        partnerUserSnippets.map((user) => {
            partnerSnippets[user.username] = user;
        });
        setPartnerProfileSnippets(partnerSnippets);
    }, [partnerUserSnippets]);

    const openExportDialog = (step: IFineStep) => {
        step._id = undefined;
        setExportStep2Plan({ isOpen: true, step, plan: undefined });
        methods.setValue('step.name', step.name, { shouldValidate: true, shouldDirty: false });
        methods.setValue(
            'step.timestamp_from',
            new Date(step.timestamp_from).toISOString().split('T')[0],
            { shouldValidate: true, shouldDirty: false }
        );
        methods.setValue(
            'step.timestamp_to',
            new Date(step.timestamp_to).toISOString().split('T')[0],
            { shouldValidate: true, shouldDirty: false }
        );
    };

    const handleExportStep2Plan = async (data: FormValues) => {
        setLoadingExport(true);
        const step = { ...exportStep2Plan.step, ...data.step };

        if (exportStep2Plan.plan!.steps.some((p) => p.name == step!.name)) {
            setAlert({
                message: t('plan_summary_export_error_step_name_exists'),
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            setLoadingExport(false);
            return;
        }

        const planLock = await getPlanLock(socket, exportStep2Plan.plan!._id);
        if (planLock.reason === 'plan_locked') {
            setAlert({
                message: t('plan_summary_export_error_plan_locked'),
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            setLoadingExport(false);
            return;
        }

        const res = await fetchPOST(
            '/planner/append_step',
            {
                plan_id: exportStep2Plan.plan!._id,
                step: step,
            },
            session?.accessToken
        );
        if (res.success === true) {
            setExportStep2Plan((prev) => ({ ...prev, isOpen: false }));
        } else {
            setAlert({
                message: t('plan_summary_error_save'),
                type: 'error',
                onClose: () => setAlert({ open: false }),
            });
        }

        await dropPlanLock(socket, exportStep2Plan.plan!._id);
        setLoadingExport(false);
    };

    const validateDateRange = (fromValue: string, toValue: string) => {
        methods.clearErrors('step.timestamp_from');
        methods.clearErrors('step.timestamp_to');
        return new Date(fromValue) > new Date(toValue)
            ? t('plan_summary_export_validation_error_dates')
            : true;
    };

    const validateUniqueStepName = (stepName: string) => {
        if (exportStep2Plan.plan?.steps.some((p) => p.name == stepName)) {
            return t('plan_summary_export_validation_error_unique_steps');
        }
        return true;
    };

    const Dialog_Step2PlanChoose = () => {
        if (!availablePlans.length || !session!.user) return <LoadingAnimation />;
        const plans = availablePlans.filter(
            (p) =>
                p.write_access.includes(session?.user.preferred_username as string) &&
                p._id != plan._id
        );

        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div>
                    {t('plan_summary_export_choose_plan_text', {
                        name: exportStep2Plan.step?.name,
                    })}
                </div>
                {plans
                    .sort((a, b) => {
                        return (
                            new Date(b.last_modified).getTime() -
                            new Date(a.last_modified).getTime()
                        );
                    })
                    .map((plan, i) => (
                        <div
                            key={plan._id}
                            className="p-2 flex items-center justify-start gap-x-4 gap-y-6 rounded-md hover:bg-ve-collab-blue/25 hover:cursor-pointer"
                            title={t('common:choose')}
                            onClick={(e) => {
                                setExportStep2Plan((prev) => ({ ...prev, plan }));
                            }}
                        >
                            <PlanIcon />

                            <div className="text-xl font-bold grow-0 truncate">{plan.name}</div>
                            {plan.is_good_practise && (
                                <div className="mx-2 text-ve-collab-blue rounded-full p-1 border border-ve-collab-blue">
                                    <FaMedal title={t('common:plans_marked_as_good_practise')} />
                                </div>
                            )}
                            {plan.steps.length > 1 && (
                                <div className="text-nowrap">({plan.steps.length} Etappen)</div>
                            )}
                            {plan.steps.length == 1 && <div>({plan.steps.length} Etappe)</div>}
                            {session?.user.preferred_username != plan.author.username && (
                                <div className="text-sm text-gray-500">
                                    von {plan.author.first_name} {plan.author.last_name}
                                </div>
                            )}
                            <span className="grow text-right" title="zuletzt geändert">
                                <Timestamp timestamp={plan.last_modified} className="text-sm" />
                            </span>
                        </div>
                    ))}
            </div>
        );
    };

    const Dialog_Step2PlanConfirm = () => {
        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                {exportStep2Plan.plan!.steps?.length > 0 && (
                    <div className="flex items-start">
                        <span className="mr-2 p-2 font-bold">
                            {t('plan_summary_export_phases')}
                        </span>
                        <div className="flex flex-wrap gap-y-2">
                            {exportStep2Plan.plan!.steps?.map((planStep) => (
                                <div
                                    key={planStep._id}
                                    title={`von ${planStep.timestamp_from} bis ${planStep.timestamp_from}`}
                                    className="rounded-full bg-slate-50 mx-2 p-2 decoration-dotted"
                                >
                                    {planStep.name} ({planStep.workload}h)
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="mt-2">{t('plan_summary_export_check_data_text')}</div>

                <FormProvider {...methods}>
                    <form>
                        <div className="ml-6 mt-3 items-center flex flex-wrap flex-row gap-y-2">
                            <label className="text-right basis-1/4">
                                {t('plan_summary_export_name')}
                            </label>
                            <div className="grow basis-3/4">
                                <input
                                    type="text"
                                    {...methods.register(`step.name`, {
                                        required: {
                                            value: true,
                                            message: t(
                                                'plan_summary_export_name_validation_required'
                                            ),
                                        },
                                        validate: (v) => validateUniqueStepName(v),
                                    })}
                                    placeholder={t('plan_summary_export_name_placeholder')}
                                    className="border border-gray-400 rounded-lg p-2 mx-2"
                                />
                            </div>

                            <label className="text-right  basis-1/4">
                                {t('plan_summary_export_from')}
                            </label>
                            <div className="basis-3/4">
                                <input
                                    type="date"
                                    {...methods.register(`step.timestamp_from`, {
                                        required: {
                                            value: true,
                                            message: t(
                                                'plan_summary_export_from_validation_required'
                                            ),
                                        },
                                        validate: (v) =>
                                            validateDateRange(
                                                v,
                                                methods.watch('step.timestamp_to')
                                            ),
                                    })}
                                    className="border border-gray-400 rounded-lg p-2 mx-2"
                                />
                            </div>

                            <label className="text-right  basis-1/4">
                                {t('plan_summary_export_to')}
                            </label>
                            <div className="basis-3/4">
                                <input
                                    type="date"
                                    {...methods.register(`step.timestamp_to`, {
                                        required: {
                                            value: true,
                                            message: t(
                                                'plan_summary_export_to_validation_required'
                                            ),
                                        },
                                        validate: (v) =>
                                            validateDateRange(
                                                methods.watch('step.timestamp_from'),
                                                v
                                            ),
                                    })}
                                    className="border border-gray-400 rounded-lg p-2 mx-2"
                                />
                            </div>
                        </div>
                        <div className="text-red-600 pt-2 flex justify-center">
                            {methods.formState.errors?.step?.name &&
                                t(methods.formState.errors?.step?.name?.message!)}
                            {methods.formState.errors?.step?.timestamp_from &&
                                t(methods.formState.errors?.step?.timestamp_from?.message!)}
                            {methods.formState.errors?.step?.timestamp_to &&
                                t(methods.formState.errors?.step?.timestamp_to?.message!)}
                        </div>
                        <div className="text-right mt-2">
                            {loadingExport && <LoadingAnimation size="small" />}
                            <button
                                className="mx-2 px-4 py-2 shadow-sm border border-ve-collab-orange text-ve-collab-orange rounded-full cursor-pointer"
                                onClick={(e) => {
                                    setExportStep2Plan((prev) => ({ ...prev, plan: undefined }));
                                }}
                            >
                                {t('back')}
                            </button>
                            <button
                                type="button"
                                className="px-4 py-2 shadow-sm bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange cursor-pointer"
                                onClick={methods.handleSubmit(
                                    // valid
                                    async (data: any) => {
                                        await handleExportStep2Plan(data);
                                    }
                                )}
                            >
                                {t('ok')}
                            </button>
                        </div>
                    </form>
                </FormProvider>
            </div>
        );
    };

    const Dialog_ExportStep2PlanSuccess = () => {
        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div>
                    {t('plan_summary_export_success_text', { name: exportStep2Plan.step?.name })}
                </div>

                <div className="mt-4 flex flex-row">
                    <Link
                        className="mx-2 px-4 py-2 shadow-sm border border-ve-collab-orange text-ve-collab-orange rounded-full"
                        href={{
                            pathname: '/ve-designer/step-names',
                            query: { plannerId: exportStep2Plan.plan?._id },
                        }}
                    >
                        <MdEdit className="inline" />
                        {t('plan_summary_export_edit_plan')}
                    </Link>
                    <button
                        type="button"
                        className="px-4 py-2 shadow-sm bg-ve-collab-orange text-white rounded-full cursor-pointer hover:bg-ve-collab-orange"
                        onClick={(e) => {
                            setExportStep2Plan({ isOpen: false, step: undefined, plan: undefined });
                        }}
                    >
                        {t('close')}
                    </button>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return <LoadingAnimation />;
    }

    const Separator = () => <hr className="h-px w-full mx-auto my-8 bg-slate-300 border-0" />;
    // const Separator_Fancy = () => (
    //     <div className="h-2 w-full bg-white my-8 border-0 m-auto"
    //         style={{
    //             background: 'repeating-linear-gradient(135deg, #fff, #fff 6px, #7fb9c7 6px, #7fb9c7 12px)'
    //         }}
    //     />
    // )

    return (
        <>
            <Alert state={alert} />

            {/* dialog to select target plan for export a step */}
            <Dialog
                isOpen={exportStep2Plan.isOpen && exportStep2Plan.plan === undefined}
                title={t('plan_summary_export_choose_plan_title')}
                onClose={() =>
                    setExportStep2Plan({ isOpen: false, step: undefined, plan: undefined })
                }
            >
                <div className="w-[40vw]">
                    <Dialog_Step2PlanChoose />
                </div>
            </Dialog>

            {/* dialog to set date and name of step for export a step */}
            <Dialog
                isOpen={exportStep2Plan.isOpen && exportStep2Plan.plan !== undefined}
                title={t('plan_summary_export_into_title', { name: exportStep2Plan.plan?.name })}
                onClose={() =>
                    setExportStep2Plan({ isOpen: false, step: undefined, plan: undefined })
                }
            >
                <div className="w-[40vw]">
                    <Dialog_Step2PlanConfirm />
                </div>
            </Dialog>

            {/* export success dialog */}
            <Dialog
                isOpen={
                    !exportStep2Plan.isOpen &&
                    exportStep2Plan.plan !== undefined &&
                    exportStep2Plan.step !== undefined
                }
                title={t('plan_summary_export_into_title', { name: exportStep2Plan.plan?.name })}
                onClose={() =>
                    setExportStep2Plan({ isOpen: false, step: undefined, plan: undefined })
                }
            >
                <div className="w-[40vw]">
                    <Dialog_ExportStep2PlanSuccess />
                </div>
            </Dialog>

            <div className="bg-white rounded-lg px-6 py-4 xl:px-8 xl:py-6 w-full @container">
                <ViewAttributes
                    plan={plan}
                    partnerProfileSnippets={partnerProfileSnippets}
                    openAllBoxes={isSingleView || openAllBoxes}
                    isSingleView={isSingleView}
                />

                <Separator />

                <div className="text-2xl font-semibold mb-4 underline decoration-ve-collab-blue/50 decoration-4 underline-offset-6">
                    {t('plan_summary_phases')}
                </div>

                {plan.steps !== undefined && plan.steps.length > 0 ? (
                    plan.steps.map((fineStep, index) => (
                        <ViewFinestep
                            key={index}
                            index={index}
                            openAllBoxes={openAllBoxes}
                            plan={plan}
                            fineStep={fineStep}
                            handleImportStep={openExportDialog}
                            availablePlans={availablePlans}
                        />
                    ))
                ) : (
                    <div className="ml-4">{t('plan_summary_no_phases')}</div>
                )}

                <Separator />

                <ViewAfterVE
                    plan={plan}
                    openAllBoxes={isSingleView || openAllBoxes}
                    isSingleView={isSingleView}
                />
            </div>
        </>
    );
}

export const showDataOrEmptySign = (data: any) => {
    if (data === null || data === undefined || data === '') {
        return '/';
    } else {
        return data;
    }
};

export const GridEntry = ({
    caption,
    children,
}: {
    caption: string;
    children: React.ReactNode;
}) => (
    <>
        <div className="col-span-3 lg:col-span-4">
            <GridEntryCaption>{caption}</GridEntryCaption>
        </div>
        <div className="col-span-3 lg:col-span-4 ml-6 -mt-6">{children}</div>
    </>
);

export const GridEntryCaption = ({ children }: { children: string }) => (
    <h3 className="font-bold font-konnect tracking-wide text-slate-800 underline decoration-ve-collab-orange-light decoration-2 underline-offset-2">
        {children}
    </h3>
);

export const Caption4 = ({ children }: { children: string }) => (
    <h4 className="font-semibold text-slate-700 px-1">{children}</h4>
);

interface ColProp {
    caption: string;
    value: React.ReactNode;
}

export const GridEntry2Col = ({ col1, col2 }: { col1: ColProp; col2: ColProp }) => (
    <>
        <div className="col-span-3 lg:col-span-2">
            <GridEntryCaption>{col1.caption}</GridEntryCaption>
            <div className="ml-6 my-2">{col1.value}</div>
        </div>

        <div className="col-span-3 lg:col-span-2">
            <GridEntryCaption>{col2.caption}</GridEntryCaption>
            <div className="ml-6">{col2.value}</div>
        </div>
    </>
);

export const GridEntrySubGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid xl:grid-cols-2 gap-x-4 gap-y-6">{children}</div>
);

export const GridEntrySubGridLarge = ({ children }: { children: React.ReactNode }) => (
    <div className="grid @7xl:grid-cols-2 gap-x-4 gap-y-6">{children}</div>
);

export const GridEntryList = ({ list }: { list: any[] }) => (
    <ul className="flex flex-col space-y-2">
        {list.map((value, index) => (
            <li className="before:content-['•'] before:mr-2" key={index}>
                {showDataOrEmptySign(value)}
            </li>
        ))}
    </ul>
);
