import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { TargetGroup } from '@/pages/startingWizard/generalInformation/targetGroups';

interface Goal {
    targetGroup: string;
    goal: string;
}

interface FormValues {
    goalsList: Goal[];
    sameGoal: boolean;
}

export default function Goals() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
        register,
        formState: { errors },
        handleSubmit,
        control,
        watch,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            goalsList: [{ targetGroup: '', goal: '' }],
            sameGoal: false,
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
                    setLoading(false);
                    const sameGoal: boolean = data.plan.goals.sameGoal;
                    const targetGroups: TargetGroup[] = data.plan.audience;
                    let goalsAndTargets: Goal[] = data.plan.goals.goalsTargetList;
                    setValue('sameGoal', sameGoal);
                    if(goalsAndTargets===undefined) {
                        goalsAndTargets = targetGroups.map((targetGroup) => {
                            return {
                                targetGroup: targetGroup.name,
                                goal: '',
                            };
                        });
                    }
                    setValue('goalsList', goalsAndTargets);
                }
            );
        }
    }, [session, status, router, setValue]);

    const allSameGoal = watch('sameGoal');

    const { fields } = useFieldArray({
        name: 'goalsList',
        control,
    });

    const onSubmit: SubmitHandler<FormValues> = async () => {
        await fetchPOST(
            '/planner/update_field',
            {
                plan_id: router.query.plannerId,
                field_name: 'goals',
                value: { goalsTargetList: watch('goalsList'), sameGoal: watch('sameGoal') },
            },
            session?.accessToken
        );
        await router.push({
            pathname: '/startingWizard/generalInformation/courseFormat',
            query: { plannerId: router.query.plannerId },
        });
    };

    const renderGoalsInputs = (): JSX.Element[] => {
        return fields.map((goal, index) => (
            <div key={goal.id} className="mt-4 flex justify-center">
                <div className="w-3/4">
                    <div className="px-2 py-2">für Zielgruppe: {goal.targetGroup}</div>
                    <textarea
                        rows={5}
                        placeholder="Ziele beschreiben"
                        className="border border-gray-500 rounded-lg w-full p-2"
                        {...register(`goalsList.${index}.goal`, {
                            maxLength: {
                                value: 500,
                                message: 'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                            },
                        })}
                    />
                    <p className="text-red-600 pt-2">
                        {errors?.goalsList?.[index]?.goal?.message}
                    </p>
                </div>
            </div>
        ));
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
                                Welche Ziele sollen die einzelnen Zielgruppen erreichen?
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="mt-4 flex justify-center">
                                <label htmlFor="name" className="px-2 py-2">
                                    alle Zielgruppen haben die gleichen Ziele?
                                </label>
                                <input
                                    type="checkbox"
                                    placeholder="Name eingeben"
                                    className="border border-gray-500 rounded-lg p-2"
                                    {...register(`sameGoal`)}
                                />
                            </div>
                            {allSameGoal && (
                                <div className="mt-4 flex justify-center">
                                    <div className="w-3/4">
                                        <div className="px-2 py-2">für alle Zielgruppen</div>
                                        <textarea
                                            rows={5}
                                            placeholder="Ziele beschreiben"
                                            className="border border-gray-500 rounded-lg w-full p-2"
                                            {...register(`goalsList.0.goal`, {
                                                maxLength: {
                                                    value: 500,
                                                    message:
                                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                                },
                                            })}
                                        />
                                        <p className="text-red-600 pt-2">
                                            {errors?.goalsList?.[0]?.goal?.message}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {!allSameGoal && <>{renderGoalsInputs()}</>}
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname:
                                            '/startingWizard/generalInformation/questionNewContent',
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
                <SideProgressBarSection />
            </div>
        </>
    );
}
