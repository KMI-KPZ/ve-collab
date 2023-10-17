import { fetchDELETE, fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SuccessAlert from '@/components/SuccessAlert';
import PlannerOverviewItem from '@/components/Plannner/PlannerOverviewItem';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import Link from 'next/link';

export default function Overview() {
    const [plans, setPlans] = useState<PlanPreview[]>([]);

    const { data: session, status } = useSession();

    const router = useRouter();

    const [successPopupOpen, setSuccessPopupOpen] = useState(false);

    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);
        await router.push({
            pathname: '/startingWizard/generalInformation/projectName',
            query: { plannerId: newPlanner.inserted_id },
        });
    };

    const getAllPlans = useCallback(async () => {
        return fetchGET(`/planner/get_available`, session?.accessToken).then((data) => {
            if (data.plans) {
                console.log(data.plans);
                setPlans(data.plans);
            }
        });
    }, [session]);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            getAllPlans();
        }
    }, [session, status, router, getAllPlans]);

    const deletePlan = async (planId: string) => {
        const response = await fetchDELETE(
            `/planner/delete?_id=${planId}`,
            {},
            session?.accessToken
        );
        if (response.success === true) {
            getAllPlans();
        }
        setSuccessPopupOpen(true);
        setTimeout(() => {
            setSuccessPopupOpen((successPopupOpen) => false);
        }, 2000);
    };

    return (
        <>
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <div className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-content">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>Übersicht</div>
                        <div className={'text-center mb-20'}>
                            hier findest du alle deine vorhandenen Pläne
                        </div>
                    </div>
                    <div className="flex flex-wrap">
                        {plans.map((plan, index) => (
                            <PlannerOverviewItem
                                key={index}
                                plan={plan}
                                deleteCallback={deletePlan}
                                refetchPlansCallback={getAllPlans}
                            />
                        ))}
                    </div>
                    <div className="flex justify-around w-full">
                        {session && (
                            <div>
                                <button
                                    onClick={createAndForwardNewPlanner}
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    neuen Plan starten
                                </button>
                            </div>
                        )}
                        {!session && (
                            <div>
                                <button
                                    disabled
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Logge dich ein, um einen neuen Plan zu erstellen!
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-around w-full mt-4">
                        <div>
                            Noch auf der Suche nach neuen Partner:innen für den nächsten VE?
                            <div className="flex justify-center my-2">
                                <Link href={'/matching'}>
                                    <button
                                        className={
                                            'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                        }
                                    >
                                        Nimm hier am Matching teil!
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {successPopupOpen && <SuccessAlert message={'Gelöscht'} />}
        </>
    );
}
