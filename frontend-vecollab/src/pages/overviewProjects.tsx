import { fetchDELETE, fetchPOST, useGetAvailablePlans } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import SuccessAlert from '@/components/SuccessAlert';
import PlannerOverviewItem from '@/components/Plannner/PlannerOverviewItem';
import Link from 'next/link';
import LoadingAnimation from '@/components/LoadingAnimation';

// authentication is required on this page
Overview.auth = true;
export default function Overview() {
    const { data: session } = useSession();

    const router = useRouter();

    const [successPopupOpen, setSuccessPopupOpen] = useState(false);

    // since using swr plans is the new state based on the backend, which
    // can be refetched by calling mutate()
    const { plans, isLoading, error, mutate } = useGetAvailablePlans(session!.accessToken);

    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);
        await router.push({
            pathname: '/startingWizard/generalInformation/projectName',
            query: { plannerId: newPlanner.inserted_id },
        });
    };

    const deletePlan = async (planId: string) => {
        const response = await fetchDELETE(
            `/planner/delete?_id=${planId}`,
            {},
            session?.accessToken
        );
        if (response.success === true) {
            mutate(); // refresh plans
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
                        {isLoading ? (
                            <LoadingAnimation />
                        ) : (
                            <>
                                {plans.map((plan, index) => (
                                    <PlannerOverviewItem
                                        key={index}
                                        plan={plan}
                                        deleteCallback={deletePlan}
                                        refetchPlansCallback={mutate}
                                    />
                                ))}
                            </>
                        )}
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
