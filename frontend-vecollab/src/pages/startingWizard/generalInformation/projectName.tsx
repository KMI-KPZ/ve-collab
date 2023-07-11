import LoadingAnimation from '@/components/LoadingAnimation';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';

interface FormData {
    name: string;
}

export default function EssentialInformation() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    const {
        watch,
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<FormData>({ mode: 'onChange' });

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
                    setLoading(false);
                    setValue('name', data.plan.name);
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const onSubmit: SubmitHandler<FormData> = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'name',
                        value: watch('name'),
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            name: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
        await router.push({
            pathname: '/startingWizard/generalInformation/partners',
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
                            <div className={'text-center font-bold text-4xl mb-20'}>
                                Gib deinem Projekt einen Namen
                            </div>
                            <div className="m-7 flex justify-center">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Name eingeben"
                                        className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                        {...register('name', {
                                            maxLength: {
                                                value: 50,
                                                message:
                                                    'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                            },
                                            pattern: {
                                                value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                                message:
                                                    'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?-',
                                            },
                                        })}
                                    />
                                    <p className="text-red-600 pt-2">{errors.name?.message}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg invisible"
                                >
                                    Zurück
                                </button>
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
