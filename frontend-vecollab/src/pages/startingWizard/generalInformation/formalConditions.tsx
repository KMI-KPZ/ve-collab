import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { SubmitHandler, useForm } from 'react-hook-form';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';

interface FormValues {
    technology: boolean;
    examinationRegulations: boolean;
    more: boolean;
}

export default function FormalConditions() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    const { register, handleSubmit } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            technology: undefined,
            examinationRegulations: undefined,
            more: undefined,
        },
    });

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router]);

    const onSubmit: SubmitHandler<FormValues> = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            formalities: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
        await router.push({
            pathname: '/startingWizard/broadPlanner',
            query: { plannerId: router.query.plannerId },
        });
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                    >
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Checkt die folgenden formalen Rahmenbedingungen
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="mx-7 mt-7 flex justify-center">
                                <div className="w-1/2">
                                    <div className="flex my-3">
                                        <div className="w-1/2">
                                            <p className="px-2 py-2">Technik</p>
                                        </div>
                                        <div className="w-1/2 flex justify-center items-center">
                                            <input
                                                type="checkbox"
                                                {...register(`technology`)}
                                                className="border border-gray-500 rounded-lg w-4 h-4 p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex my-3">
                                        <div className="w-1/2">
                                            <p className="px-2 py-2">Prüfungsordnung</p>
                                        </div>
                                        <div className="w-1/2 flex justify-center items-center">
                                            <input
                                                type="checkbox"
                                                {...register(`examinationRegulations`)}
                                                className="border border-gray-500 rounded-lg w-4 h-4 p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex my-3">
                                        <div className="w-1/2">
                                            <p className="px-2 py-2">...</p>
                                        </div>
                                        <div className="w-1/2 flex justify-center items-center">
                                            <input
                                                type="checkbox"
                                                {...register(`more`)}
                                                className="border border-gray-500 rounded-lg w-4 h-4 p-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/tools',
                                        query: { plannerId: router.query.plannerId },
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    >
                                        Zurück
                                    </button>
                                </Link>
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection progressState={sideMenuStepsProgress} />
            </div>
        </>
    );
}
