import React, { useEffect, useState } from 'react';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useSession } from 'next-auth/react';
import {
    fetchPOST,
    useGetAvailablePlans,
    useGetPlanAsScormById,
    useGetProfileSnippets,
} from '@/lib/backend';
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
    showTitle?: boolean;
}

interface FormValues {
    step: IFineStep;
}

PlanSummary.auth = true;
export function PlanSummary({ plan, showTitle = true }: Props): JSX.Element {
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
    const tabs = [
        { id: 'overview', name: t('plan_summary_characteristics') },
        { id: 'phases', name: t('plan_summary_phases') },
        { id: 'followup', name: t('plan_summary_gpb_documentation') },
        { id: 'download', name: t('plan_summary_download_scorm_title') },
    ];
    const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
    // TODO add filter and load more
    const { data: availablePlans } = useGetAvailablePlans({});
    const { data: partnerUserSnippets, isLoading } = useGetProfileSnippets(
        [...plan.partners, plan.author.username],
        session!.accessToken
    );
    const { data: zipPlan, isLoading: isLoadingScorm } = useGetPlanAsScormById(plan._id);

    useEffect(() => {
        if (!partnerUserSnippets?.length) return;

        let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
        partnerUserSnippets.map((user) => {
            partnerSnippets[user.username] = user;
        });
        setPartnerProfileSnippets(partnerSnippets);
    }, [partnerUserSnippets]);

    const downloadZip = (zipData: Blob | undefined, fileName: string = 'plan.zip') => {
        if (!zipData) return;

        const url = window.URL.createObjectURL(zipData);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

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

        step.original_plan = plan._id;

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
                    .map((plan, _) => (
                        <div
                            key={plan._id}
                            className="p-2 flex items-center justify-start gap-x-4 gap-y-6 rounded-md hover:bg-ve-collab-blue/25 hover:cursor-pointer"
                            title={t('common:choose')}
                            onClick={() => {
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
                                onClick={() => {
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
                            pathname: `/ve-designer/steps`,
                            query: { plannerId: exportStep2Plan.plan?._id },
                        }}
                    >
                        <MdEdit className="inline" />
                        {t('plan_summary_export_edit_plan')}
                    </Link>
                    <button
                        type="button"
                        className="px-4 py-2 shadow-sm bg-ve-collab-orange text-white rounded-full cursor-pointer hover:bg-ve-collab-orange"
                        onClick={() => {
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

            <div className="bg-white rounded-lg w-full">
                {showTitle && (
                    <div className="px-6 pt-4 xl:px-8 xl:pt-6 font-bold text-2xl">{plan.name}</div>
                )}

                <div className="sticky top-0 z-10 bg-white px-6 xl:px-8 py-3 shadow-[0_2px_6px_-3px_rgba(0,0,0,0.15)]">
                    <div className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                    activeTab === tab.id
                                        ? 'bg-ve-collab-blue text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                                }`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 xl:px-8 xl:py-6">
                    {activeTab === 'overview' && (
                        <ViewAttributes
                            plan={plan}
                            partnerProfileSnippets={partnerProfileSnippets}
                        />
                    )}

                    {activeTab === 'phases' &&
                        (plan.steps !== undefined && plan.steps.length > 0 ? (
                            plan.steps.map((fineStep, index) => (
                                <ViewFinestep
                                    key={index}
                                    index={index}
                                    plan={plan}
                                    fineStep={fineStep}
                                    handleImportStep={openExportDialog}
                                    availablePlans={availablePlans}
                                />
                            ))
                        ) : (
                            <div className="ml-4">{t('plan_summary_no_phases')}</div>
                        ))}

                    {activeTab === 'followup' && <ViewAfterVE plan={plan} />}

                    {activeTab === 'download' && (
                        <>
                            <p className="mb-6">{t('plan_summary_download_scorm_text')}</p>
                            <button
                                onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                                    downloadZip(zipPlan, 'plan-scorm.zip');
                                    e.preventDefault();
                                }}
                                disabled={isLoadingScorm}
                                className="bg-white hover:bg-slate-100 rounded-full! px-8! text-slate-800 print:hidden p-2 cursor-pointer shadow-[0_4px_6px_-1px_rgba(0,0,0,0.35),0_2px_4px_-1px_rgba(0,0,0,0.25)]"
                            >
                                Download
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export const Field = ({
    label,
    children,
    hideIfEmpty = true,
    compact = false,
}: {
    label: string;
    children: React.ReactNode;
    hideIfEmpty?: boolean;
    compact?: boolean;
}) => {
    const isEmpty =
        children === null ||
        children === undefined ||
        children === '' ||
        children === false ||
        (Array.isArray(children) && children.length === 0);

    if (hideIfEmpty && isEmpty) return null;

    return (
        <div className={compact ? 'mb-3' : 'mb-6'}>
            <h3
                className={
                    compact
                        ? 'font-semibold text-slate-700'
                        : 'font-bold font-konnect tracking-wide text-lg text-slate-800 underline decoration-ve-collab-orange-light decoration-2 underline-offset-2'
                }
            >
                {label}
            </h3>
            <div className="mt-1 text-slate-800 leading-relaxed">{children}</div>
        </div>
    );
};

export const FieldGroup = ({
    caption,
    children,
}: {
    caption: string;
    children: React.ReactNode;
}) => (
    <div className="mb-6">
        <h3 className="font-bold font-konnect tracking-wide text-lg text-slate-800 underline decoration-ve-collab-orange-light decoration-2 underline-offset-2 mb-3">
            {caption}
        </h3>
        <div className="flex flex-wrap gap-4">{children}</div>
    </div>
);

export const FieldCard = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-lg bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.35),0_2px_4px_-1px_rgba(0,0,0,0.25)] p-4 flex-1 basis-64 min-w-64">
        {children}
    </div>
);

export const FieldList = ({ list }: { list: string[] }) => (
    <ul className="flex flex-col space-y-1">
        {list.map((value, index) => (
            <li className="before:content-['•'] before:mr-2" key={index}>
                {value}
            </li>
        ))}
    </ul>
);
