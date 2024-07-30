import React, { useEffect, useState } from 'react';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useSession } from 'next-auth/react';
import { fetchGET, fetchPOST } from '@/lib/backend';
import LoadingAnimation from '../LoadingAnimation';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import Dialog from '../profile/Dialog';
import { MdNewspaper } from 'react-icons/md';
import Timestamp from '../Timestamp';
import Alert, { AlertState } from '../Alert';
import { socket } from '@/lib/socket';

interface Props {
    plan: IPlan;
}

PlanOverview.auth = true;
export function PlanOverview({ plan }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});

    useEffect(() => {
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
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
        }
    }, [session, status, plan]);

    // const [isImportStepDialogOpen, setIsImportStepDialogOpen] = useState<boolean>(false)
    const [importStepDialogOpen, setImportStepDialogOpen] = useState<{
        isOpen: boolean,
        step: undefined|IFineStep,
        plan: undefined|IPlan
    }>({
        isOpen: false,
        step: undefined,
        plan: undefined
    })

    const [loadingAvailPlans, setLoadingAvailPlans] = useState<boolean>(true)
    const [availPlans, setAvailPlans] = useState<IPlan[]>([])
    // const [stepsToImport, setStepsToImport] = useState<IFineStep[]>([])

    const openImportDialog = (step: IFineStep) => {
        // setIsImportStepDialogOpen(true)
        step = Object.assign({}, step, {_id: undefined})
        setImportStepDialogOpen({isOpen: true, step, plan: undefined})
        if (availPlans.length) return
        setLoadingAvailPlans(true)

        fetchGET('/planner/get_available', session?.accessToken)
        .then(data => {
            setAvailPlans( (data.plans as IPlan[]))
            // setMyPlans( (data.plans as IPlan[]).filter(plan => plan.write_access .author == session?.user.preferred_username))
            console.log('data.plans', data.plans);

        })
        .finally(() =>
            setLoadingAvailPlans(false)
        )

    }

    const [alert, setAlert] = useState<AlertState>({ open: false });

    const handleSelectPlan2Import = async (plan: IPlan) => {
        setImportStepDialogOpen(prev => Object.assign({}, prev, {plan}))

        console.log('Import', {plan, step: importStepDialogOpen.step})

        if ( plan.steps.some(p => p.name == importStepDialogOpen.step!.name ) ) {
            setAlert({
                message: 'Konnte nicht importieren: Plan enhält bereits eine Etappe mit diesem Namen',
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            return
        }

        // TODO move to seperate file for reusage
        const getPlanLock = () => {
            return new Promise((resolve, reject) => {
                socket.emit(
                    'try_acquire_or_extend_plan_write_lock',
                    { plan_id: plan._id },
                    async (response: any) => {
                        console.log('try_acquire_or_extend_plan_write_lock', {response});
                        if (response.success === true && response.status !== 403) {
                            resolve(true)
                        }
                        reject(false)
                    }
                )
            })
        }

        const planLock = await getPlanLock()
        console.log('lock', {planLock});
        if (!planLock) {
            setAlert({
                message: 'Konnte nicht importieren: Plan wird bereits von einem anderen Benutzer bearbeitet',
                type: 'warning',
                onClose: () => setAlert({ open: false }),
            });
            return
        }

        const res = await fetchPOST(
            '/planner/append_step',
            {
                plan_id: plan._id,
                step: importStepDialogOpen.step
            },
            session?.accessToken
        );
        if (res.success === false) {
            console.log({ res });
            setAlert({
                message: 'Fehler beim speichern',
                type: 'error',
                onClose: () => setAlert({ open: false }),
            });
            // return false;
        } else {
            setAlert({
                message: 'Etappe hinzugefügt',
                type: 'info',
                autoclose: 2000,
                onClose: () => setAlert({ open: false }),
            });
        }
        socket.emit(
            'drop_plan_lock',
            { plan_id: plan._id },
            async (response: any) => {
                console.log('drop_plan_lock', {response});
            }
        );

    }

    const ChoosePlan2ImportDialog = () => {
        if (loadingAvailPlans || !session!.user) return <LoadingAnimation />

        const plans = availPlans.filter(plan => plan.write_access.includes(session?.user.preferred_username as string))

        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div>In welchen Plan soll die Etappe importiert werden?</div>
                <div className="flex flex-col max-h-96 overflow-y-auto">

                </div>
                {plans
                    .sort((a, b) => {return (new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())})
                    .map((plan, i) => (
                        // <div key={plan._id} onClick={e => handleImportDialog(importStepDialogOpen.step!)}>{plan.name}</div>
                        <div key={plan._id}>
                            <div
                                className="p-2 flex items-center gap-x-4 gap-y-6 rounded-md hover:bg-ve-collab-blue/25 hover:cursor-pointer"
                                title="Auswählen"
                                onClick={e => handleSelectPlan2Import(plan)}
                            >
                                <MdNewspaper />
                                <div className="text-xl font-bold grow-0">{plan.name}</div>
                                {/* <div className="text-sm text-gray-500 grow">{plan.author}</div> */}
                                <span title="zuletzt geändert"><Timestamp timestamp={plan.last_modified} className='text-sm' /></span>
                            </div>
                            {/* {importStepDialogOpen.plan?._id == plan._id && (
                                <div className='ml-4'>Import "{importStepDialogOpen.step?.name}" select date ?!?</div>
                            )} */}
                        </div>
                    ))
                }
            </div>
        )
    }

    if (loading) {
        return <LoadingAnimation />;
    }

    return (
        <>
            <Alert state={alert} />

            <Dialog
                isOpen={importStepDialogOpen.isOpen}
                title={'Import Etappe'}
                onClose={() => setImportStepDialogOpen({isOpen: false, step: undefined, plan: undefined})}
            >
                <div className="w-[40vw]"><ChoosePlan2ImportDialog /></div>
            </Dialog>

            <div className="bg-white rounded-lg p-4 w-full">
                <ViewAttributes plan={plan} partnerProfileSnippets={partnerProfileSnippets}/>
                <hr className="h-px my-10 bg-gray-400 border-0" />
                <div className="text-2xl font-semibold mb-4 ml-4">Etappen</div>
                {plan.steps !== undefined && plan.steps.length > 0 ? (
                    plan.steps.map((fineStep, index) => (
                        <ViewFinestep key={index} fineStep={fineStep} handleImportStep={openImportDialog} />
                    ))
                ) : (
                    <div className="ml-4"> Noch keine erstellt</div>
                )}
                <hr className="h-px my-10 bg-gray-400 border-0" />
                <ViewAfterVE plan={plan} />
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
