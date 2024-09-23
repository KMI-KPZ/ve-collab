import React, { useEffect, useState } from 'react';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useSession } from 'next-auth/react';
import { fetchPOST, useGetAvailablePlans, useGetProfileSnippets } from '@/lib/backend';
import LoadingAnimation from '../common/LoadingAnimation';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import Dialog from '../profile/Dialog';
import { MdEdit, MdNewspaper } from 'react-icons/md';
import Timestamp from '../common/Timestamp';
import Alert, { AlertState } from '../common/dialogs/Alert';
import { socket } from '@/lib/socket';
import { FormProvider, useForm } from 'react-hook-form';
import Link from 'next/link';
import { dropPlanLock, getPlanLock } from '../VE-designer/PlanSocket';
import { useTranslation } from 'next-i18next';

interface Props {
    plan: IPlan;
    openAllBoxes?: boolean;
}

interface FormValues {
    step: IFineStep;
}

PlanSummary.auth = true;
export function PlanSummary({ plan, openAllBoxes }: Props): JSX.Element {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [alert, setAlert] = useState<AlertState>({ open: false });
    const methods = useForm<FormValues>({ mode: 'onChange' });

    const [importStep2Plan, setImportStep2Plan] = useState<{
        isOpen: boolean;
        step?: IFineStep;
        plan?: IPlan;
    }>({
        isOpen: false,
    });
    const [loadingImport, setLoadingImport] = useState<boolean>(false);
    const { data: availablePlans } = useGetAvailablePlans(session!.accessToken);
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

    const openImportDialog = (step: IFineStep) => {
        step._id = undefined;
        setImportStep2Plan({ isOpen: true, step, plan: undefined });
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

    const handleImportStep2Plan = async (data: FormValues) => {
        setLoadingImport(true);
        const step = { ...importStep2Plan.step, ...data.step };

        if (importStep2Plan.plan!.steps.some((p) => p.name == step!.name)) {
            setAlert({
                message: t('plan_summary_import_error_step_name_exists'),
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            setLoadingImport(false);
            return;
        }

        const planLock = await getPlanLock(socket, importStep2Plan.plan!._id)
        if (planLock.reason === 'plan_locked') {
            setAlert({
                message: t('plan_summary_import_error_plan_locked'),
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            setLoadingImport(false);
            return;
        }

        const res = await fetchPOST(
            '/planner/append_step',
            {
                plan_id: importStep2Plan.plan!._id,
                step: step,
            },
            session?.accessToken
        );
        if (res.success === true) {
            setImportStep2Plan((prev) => ({ ...prev, isOpen: false }));
        } else {
            console.log({ res });
            setAlert({
                message: t('plan_summary_error_save'),
                type: 'error',
                onClose: () => setAlert({ open: false }),
            });
        }

        await dropPlanLock(socket, importStep2Plan.plan!._id);
        setLoadingImport(false);
    };

    const validateDateRange = (fromValue: string, toValue: string) => {
        methods.clearErrors('step.timestamp_from');
        methods.clearErrors('step.timestamp_to');
        return new Date(fromValue) > new Date(toValue)
            ? t('plan_summary_import_validation_error_dates')
            : true;
    };

    const validateUniqueStepName = (stepName: string) => {
        if (importStep2Plan.plan?.steps.some((p) => p.name == stepName)) {
            return t('plan_summary_import_validation_error_unique_steps');
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
                    {t('plan_summary_import_choose_plan_text', {
                        name: importStep2Plan.step?.name,
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
                            className="p-2 flex items-center gap-x-4 gap-y-6 rounded-md hover:bg-ve-collab-blue/25 hover:cursor-pointer"
                            title={t('choose')}
                            onClick={(e) => {
                                setImportStep2Plan((prev) => ({ ...prev, plan }));
                            }}
                        >
                            <MdNewspaper />
                            <div className="text-xl font-bold grow-0">{plan.name}</div>
                            <span title={t('last_modified')}>
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
                {importStep2Plan.plan!.steps?.length > 0 && (
                    <div className="flex items-start">
                        <span className="mr-2 p-2 font-bold">
                            {t('plan_summary_import_phases')}
                        </span>
                        <div className="flex flex-wrap gap-y-2">
                            {importStep2Plan.plan!.steps?.map((planStep) => (
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
                <div className="mt-2">{t('plan_summary_import_check_data_text')}</div>

                <FormProvider {...methods}>
                    <form>
                        <div className="ml-6 mt-3 items-center flex flex-wrap flex-row gap-y-2">
                            <label className="text-right basis-1/4">
                                {t('plan_summary_import_name')}
                            </label>
                            <div className="grow basis-3/4">
                                <input
                                    type="text"
                                    {...methods.register(`step.name`, {
                                        required: {
                                            value: true,
                                            message: t(
                                                'plan_summary_import_name_validation_required'
                                            ),
                                        },
                                        validate: (v) => validateUniqueStepName(v),
                                    })}
                                    placeholder={t('plan_summary_import_name_placeholder')}
                                    className="border border-gray-400 rounded-lg p-2 mx-2"
                                />
                            </div>

                            <label className="text-right  basis-1/4">
                                {t('plan_summary_import_from')}
                            </label>
                            <div className="basis-3/4">
                                <input
                                    type="date"
                                    {...methods.register(`step.timestamp_from`, {
                                        required: {
                                            value: true,
                                            message: t(
                                                'plan_summary_import_from_validation_required'
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
                                {t('plan_summary_import_to')}
                            </label>
                            <div className="basis-3/4">
                                <input
                                    type="date"
                                    {...methods.register(`step.timestamp_to`, {
                                        required: {
                                            value: true,
                                            message: t(
                                                'plan_summary_import_to_validation_required'
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
                            {loadingImport && <LoadingAnimation size="small" />}
                            <button
                                className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                                onClick={(e) => {
                                    setImportStep2Plan((prev) => ({ ...prev, plan: undefined }));
                                }}
                            >
                                {t('back')}
                            </button>
                            <button
                                type="button"
                                className="px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
                                onClick={methods.handleSubmit(
                                    // valid
                                    async (data: any) => {
                                        await handleImportStep2Plan(data);
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

    const Dialog_Step2PlanSuccess = () => {
        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div>
                    {t('plan_summary_import_success_text', { name: importStep2Plan.step?.name })}
                </div>

                <div className="mt-4 flex flex-row">
                    <Link
                        className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                        href={{
                            pathname: '/ve-designer/step-names',
                            query: { plannerId: importStep2Plan.plan?._id },
                        }}
                    >
                        <MdEdit className="inline" />
                        {t('plan_summary_import_edit_plan')}
                    </Link>
                    <button
                        type="button"
                        className="px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
                        onClick={(e) => {
                            setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined });
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

            {/* dialog to select target plan */}
            <Dialog
                isOpen={importStep2Plan.isOpen && importStep2Plan.plan === undefined}
                title={t('plan_summary_import_choose_plan_title')}
                onClose={() =>
                    setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined })
                }
            >
                <div className="w-[40vw]">
                    <Dialog_Step2PlanChoose />
                </div>
            </Dialog>

            {/* dialog to set date and name of step for import */}
            <Dialog
                isOpen={importStep2Plan.isOpen && importStep2Plan.plan !== undefined}
                title={t('plan_summary_import_into_title', { name: importStep2Plan.plan?.name })}
                onClose={() =>
                    setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined })
                }
            >
                <div className="w-[40vw]">
                    <Dialog_Step2PlanConfirm />
                </div>
            </Dialog>

            {/* import success dialog */}
            <Dialog
                isOpen={
                    !importStep2Plan.isOpen &&
                    importStep2Plan.plan !== undefined &&
                    importStep2Plan.step !== undefined
                }
                title={t('plan_summary_import_into_title', { name: importStep2Plan.plan?.name })}
                onClose={() =>
                    setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined })
                }
            >
                <div className="w-[40vw]">
                    <Dialog_Step2PlanSuccess />
                </div>
            </Dialog>

            <div className="bg-white rounded-lg p-4 w-full">
                <ViewAttributes
                    plan={plan}
                    partnerProfileSnippets={partnerProfileSnippets}
                    openAllBoxes={openAllBoxes}
                />
                <hr className="h-px my-10 bg-gray-400 border-0" />
                <div className="text-2xl font-semibold mb-4 ml-4">{t('plan_summary_phases')}</div>
                {plan.steps !== undefined && plan.steps.length > 0 ? (
                    plan.steps.map((fineStep, index) => (
                        <ViewFinestep
                            key={index}
                            openAllBoxes={openAllBoxes}
                            fineStep={fineStep}
                            handleImportStep={openImportDialog}
                            availablePlans={availablePlans}
                        />
                    ))
                ) : (
                    <div className="ml-4">{t('plan_summary_no_phases')}</div>
                )}
                <hr className="h-px my-10 bg-gray-400 border-0" />
                <ViewAfterVE plan={plan} openAllBoxes={openAllBoxes} />
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
