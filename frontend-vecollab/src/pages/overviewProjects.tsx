import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface PlanPreview {
    _id: string;
    name: string;
}

export default function Overview() {
    const [plans, setPlans] = useState<PlanPreview[]>([]);

    const { data: session } = useSession();

    const router = useRouter();

    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);
        await router.push({
            pathname: '/startingWizard/generalInformation/1projectName',
            query: { plannerId: newPlanner.inserted_id },
        });
    };

    useEffect(() => {
        fetchGET(`/planner/get_all`, session?.accessToken).then((data) => {
            if (data.plans) {
                setPlans(data.plans);
            }
        });
    }, [session?.accessToken]);

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
                            <div key={index} className="m-2">
                                <div className="rounded-lg shadow-md bg-gray-100 w-52 relative">
                                    <div className="p-4">
                                        <h2 className="text-xl font-bold leading-tight text-gray-800">
                                            {plan.name}
                                        </h2>
                                        <p className="text-sm text-gray-500">Max Mustermann</p>
                                        <p className="text-gray-700 mt-3 text-sm">28.04.2023</p>
                                    </div>
                                    <Link
                                        href={{
                                            pathname:
                                                '/startingWizard/generalInformation/1projectName',
                                            query: { plannerId: plan._id },
                                        }}
                                    >
                                        <button className="absolute bottom-0 right-0 bg-ve-collab-orange rounded-lg p-2 flex justify-center items-center">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                height="15"
                                                width="15"
                                            >
                                                <path
                                                    fill="#fff"
                                                    d="M13.4697 17.9697C13.1768 18.2626 13.1768 18.7374 13.4697 19.0303C13.7626 19.3232 14.2374 19.3232 14.5303 19.0303L20.3232 13.2374C21.0066 12.554 21.0066 11.446 20.3232 10.7626L14.5303 4.96967C14.2374 4.67678 13.7626 4.67678 13.4697 4.96967C13.1768 5.26256 13.1768 5.73744 13.4697 6.03033L18.6893 11.25H4C3.58579 11.25 3.25 11.5858 3.25 12C3.25 12.4142 3.58579 12.75 4 12.75H18.6893L13.4697 17.9697Z"
                                                ></path>
                                            </svg>
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-around w-full">
                        {session && (
                            <div>
                                    <button onClick={createAndForwardNewPlanner} className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg">
                                        neuen Plan starten
                                    </button>
                            </div>
                        )}
                        {!session && (
                            <div>
                            <Link href={'/startingWizard/generalInformation/1projectName'}>
                                <button disabled className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg">
                                    Logge dich ein, um einen neuen Plan zu erstellen!
                                </button>
                            </Link>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
