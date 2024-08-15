import React, { useEffect, useState } from 'react';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useSession } from 'next-auth/react';
import { fetchPOST, useGetAvailablePlans } from '@/lib/backend';
import LoadingAnimation from '../LoadingAnimation';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import Dialog from '../profile/Dialog';
import { MdEdit, MdNewspaper } from 'react-icons/md';
import Timestamp from '../Timestamp';
import Alert, { AlertState } from '../Alert';
import { socket } from '@/lib/socket';
import { FormProvider, useForm } from 'react-hook-form';
import Link from 'next/link';
import { dropPlanLock } from '../VE-designer/Wrapper';
import { useRouter } from 'next/router';

interface Props {
    plan: IPlan;
    openAllBoxes?: boolean;
}

interface FormValues {
    step: IFineStep;
}

PlanOverview.auth = true;
export function PlanOverview({ plan, openAllBoxes }: Props): JSX.Element {
    const { data: session } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [alert, setAlert] = useState<AlertState>({ open: false });
    const methods = useForm<FormValues>({ mode: 'onChange' });

    const [importStep2Plan, setImportStep2Plan] = useState<{
        isOpen: boolean,
        step?: IFineStep,
        plan?: IPlan
    }>({
        isOpen: false
    })
    const [loadingImport, setLoadingImport] = useState<boolean>(false)
    const { data: availablePlans } = useGetAvailablePlans(session!.accessToken)
    // TODO. const { data: partnerProfileSnippets } = useGetProfileSnippets(session!.accessToken)

    useEffect(() => {
        if (!session) return

        // fetch profile snippets to be able to display the full name instead of username only
        fetchPOST(
            '/profile_snippets',
            { usernames: [...plan.partners, plan.author] },
            session.accessToken
        ).then((snippets: BackendProfileSnippetsResponse) => {
            let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
            snippets.user_snippets.forEach((element: BackendUserSnippet) => {
                partnerSnippets[element.username] = element;
            });
            setPartnerProfileSnippets(partnerSnippets);
        }).finally(() => {
            setLoading(false);
        });
    }, [session, plan]);

    useEffect(() => {
        if (!session || !plan) return

        // fetch profile snippets to be able to display the full name instead of username only
        fetchPOST(
            '/profile_snippets',
            { usernames: [...plan.partners, plan.author] },
            session.accessToken
        ).then((snippets: BackendProfileSnippetsResponse) => {
            let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
            snippets.user_snippets.forEach((element: BackendUserSnippet) => {
                partnerSnippets[element.username] = element;
            });
            setPartnerProfileSnippets(partnerSnippets);
            setLoading(false);
        });
    }, [session, plan]);

    const openImportDialog = (step: IFineStep) => {
        step._id = undefined
        setImportStep2Plan({ isOpen: true, step, plan: undefined })
        methods.setValue('step.name', step.name, { shouldValidate: true, shouldDirty: false });
        methods.setValue('step.timestamp_from', new Date(step.timestamp_from).toISOString().split('T')[0], { shouldValidate: true, shouldDirty: false });
        methods.setValue('step.timestamp_to', new Date(step.timestamp_to).toISOString().split('T')[0], { shouldValidate: true, shouldDirty: false });
    }

    const handleImportStep2Plan = async (data: FormValues) => {
        setLoadingImport(true)
        const step = {...importStep2Plan.step, ...data.step}

        if (importStep2Plan.plan!.steps.some(p => p.name == step!.name)) {
            setAlert({
                message: 'Konnte nicht importieren: Plan enhält bereits eine Etappe mit diesem Namen',
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            setLoadingImport(false)
            return
        }

        // TODO move to seperate file for reusage
        const getPlanLock = () => {
            return new Promise((resolve, reject) => {
                socket.emit(
                    'try_acquire_or_extend_plan_write_lock',
                    { plan_id: importStep2Plan.plan!._id },
                    async (response: any) => {
                        // console.log('try_acquire_or_extend_plan_write_lock', { response });
                        if (response.success === true && response.status !== 403) {
                            return resolve(true)
                        }
                        reject(false)
                    }
                )
            })
        }

        const planLock = await getPlanLock()
        if (!planLock) {
            setAlert({
                message: 'Konnte nicht importieren: Plan wird bereits von einem anderen Benutzer bearbeitet',
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            setLoadingImport(false)
            return
        }

        const res = await fetchPOST(
            '/planner/append_step',
            {
                plan_id: importStep2Plan.plan!._id,
                step: step
            },
            session?.accessToken
        );
        if (res.success === true) {
            setImportStep2Plan(prev => ({...prev, isOpen: false}))
        } else {
            console.log({ res });
            setAlert({
                message: 'Fehler beim speichern',
                type: 'error',
                onClose: () => setAlert({ open: false }),
            });
        }

        await dropPlanLock(socket, importStep2Plan.plan!._id)
        setLoadingImport(false)
    }

    const validateDateRange = (fromValue: string, toValue: string) => {
        methods.clearErrors('step.timestamp_from')
        methods.clearErrors('step.timestamp_to')
        return (new Date(fromValue)) > (new Date(toValue)) ? 'Das Startdatum muss vor dem Enddatum liegen' : true
    };

    const validateUniqueStepName = (stepName: string) => {
        if (importStep2Plan.plan?.steps.some(p => p.name == stepName)) {
            return "Eine Etappe mit diesem Namen existiert in diesem Plan bereits. Wähle einen anderen Namen."
        }
        return true
    }

    const Dialog_Step2PlanChoose = () => {
        if (!availablePlans.length || !session!.user) return <LoadingAnimation />
        const plans = availablePlans.filter(p =>
            p.write_access.includes(session?.user.preferred_username as string)
            && p._id != plan._id
        )

        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div>In welchen Plan soll die Etappe &quot;{importStep2Plan.step?.name}&quot; importiert werden?</div>
                {plans
                    .sort((a, b) => { return (new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()) })
                    .map((plan, i) => (
                        <div
                            key={plan._id}
                            className="p-2 flex items-center gap-x-4 gap-y-6 rounded-md hover:bg-ve-collab-blue/25 hover:cursor-pointer"
                            title="Auswählen"
                            onClick={e => {
                                setImportStep2Plan(prev => ({...prev, plan}))
                            }}
                        >
                            <MdNewspaper />
                            <div className="text-xl font-bold grow-0">{plan.name}</div>
                            <span title="zuletzt geändert"><Timestamp timestamp={plan.last_modified} className='text-sm' /></span>
                        </div>
                    ))
                }
            </div>
        )
    }

    const Dialog_Step2PlanConfirm = () => {
        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                {importStep2Plan.plan!.steps?.length > 0 && (
                    <div className='flex items-start'>
                        <span className='mr-2 p-2 font-bold'>Etappen:</span>
                        <div className='flex flex-wrap gap-y-2'>
                            {importStep2Plan.plan!.steps?.map(planStep => (
                                <div key={planStep._id}
                                    title={`von ${planStep.timestamp_from} bis ${planStep.timestamp_from}`}
                                    className='rounded-full bg-slate-50 mx-2 p-2 decoration-dotted'
                                >
                                    {planStep.name} ({planStep.workload}h)
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className='mt-2'>Überprüfe die Daten der Etappe um sie in den Plan zu importieren</div>

                <FormProvider {...methods}>
                    <form>
                        <div className='ml-6 mt-3 items-center flex flex-wrap flex-row gap-y-2'>
                            <label className="text-right basis-1/4">Name:</label>
                            <div className='grow basis-3/4'><input
                                type="text"
                                {...methods.register(`step.name`, {
                                    required: {
                                        value: true,
                                        message: 'Bitte fülle das Felde "Name" aus',
                                    },
                                    validate: (v) => validateUniqueStepName(v),
                                })}
                                placeholder="Name, z.B. Kennenlernphase"
                                className="border border-gray-400 rounded-lg p-2 mx-2"
                            /></div>

                            <label className="text-right  basis-1/4">von:</label>
                            <div className='basis-3/4'><input
                                type="date"
                                {...methods.register(`step.timestamp_from`, {
                                    required: {
                                        value: true,
                                        message: 'Bitte fülle das Felde "von" aus',
                                    },
                                    validate: (v) => validateDateRange(v, methods.watch('step.timestamp_to') ),
                                })}
                                className="border border-gray-400 rounded-lg p-2 mx-2"
                            /></div>

                            <label className="text-right  basis-1/4">bis:</label>
                            <div className='basis-3/4'><input
                                type="date"
                                {...methods.register(`step.timestamp_to`, {
                                    required: {
                                        value: true,
                                        message: 'Bitte fülle das Felde "bis" aus',
                                    },
                                    validate: (v) => validateDateRange(methods.watch('step.timestamp_from'), v)
                                })}
                                className="border border-gray-400 rounded-lg p-2 mx-2"
                            /></div>
                        </div>
                        <div className="text-red-600 pt-2 flex justify-center">
                            {methods.formState.errors?.step?.name && (
                                methods.formState.errors?.step?.name?.message
                            )}
                            {methods.formState.errors?.step?.timestamp_from && (
                                methods.formState.errors?.step?.timestamp_from?.message
                            )}
                            {methods.formState.errors?.step?.timestamp_to && (
                                methods.formState.errors?.step?.timestamp_to?.message
                            )}
                        </div>
                        <div className='text-right mt-2'>
                            {loadingImport && (<LoadingAnimation size='small' />)}
                            <button
                                className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                                onClick={(e) => {
                                    setImportStep2Plan(prev => ({...prev, plan: undefined}))
                                }}
                            >
                                Zurück
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
                                OK
                            </button>
                        </div>
                    </form>
                </FormProvider>
            </div>
        )
    }

    const Dialog_Step2PlanSuccess = () => {
        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div>Etappe  &quot;{importStep2Plan.step?.name}&quot; hinzugefügt</div>

                <div className='mt-4 flex flex-row'>
                    <Link
                        className='mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full'
                        href={{
                            pathname: '/ve-designer/step-names',
                            query: { plannerId: importStep2Plan.plan?._id }
                        }}
                    >
                        <MdEdit className="inline" /> Den Plan bearbeiten
                    </Link>
                    <button
                        type="button"
                        className="px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
                        onClick={(e) => {
                            setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined })
                        }}
                    >
                        Schließen
                    </button>
                </div>

            </div>
        );
    }

    if (loading) {
        return <LoadingAnimation />;
    }

    return (
        <>
            <Alert state={alert} />

            {/* dialog to select target plan */}
            <Dialog
                isOpen={importStep2Plan.isOpen && importStep2Plan.plan === undefined}
                title={`Plan auswählen`}
                onClose={() => setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined })}
            >
                <div className="w-[40vw]"><Dialog_Step2PlanChoose /></div>
            </Dialog>

            {/* dialog to set date and name of step for import */}
            <Dialog
                isOpen={importStep2Plan.isOpen && importStep2Plan.plan !== undefined}
                title={`Import in "${importStep2Plan.plan?.name}"`}
                onClose={() => setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined })}
            >
                <div className="w-[40vw]"><Dialog_Step2PlanConfirm /></div>
            </Dialog>

            {/* import success dialog */}
            <Dialog
                isOpen={!importStep2Plan.isOpen && importStep2Plan.plan !== undefined && importStep2Plan.step !== undefined}
                title={`Import in "${importStep2Plan.plan?.name}"`}
                onClose={() => setImportStep2Plan({ isOpen: false, step: undefined, plan: undefined })}
            >
                <div className="w-[40vw]"><Dialog_Step2PlanSuccess /></div>
            </Dialog>

            <div className="bg-white rounded-lg p-4 w-full">
                <ViewAttributes plan={plan} partnerProfileSnippets={partnerProfileSnippets} openAllBoxes={openAllBoxes} />
                <hr className="h-px my-10 bg-gray-400 border-0" />
                <div className="text-2xl font-semibold mb-4 ml-4">Etappen</div>
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
                    <div className="ml-4"> Noch keine erstellt</div>
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
