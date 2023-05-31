import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { Step } from '@/pages/startingWizard/finePlanner';

interface BroadStep {
    from: string;
    to: string;
    name: string;
}

interface FormValues {
    broadSteps: BroadStep[];
}

export default function BroadPlanner() {
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
        /*        defaultValues: {
            broadSteps: [
                {
                    from: '',
                    to: '',
                    name: '',
                },
            ],
        },*/
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
                    if (data.plan.steps?.length > 0) {
                        const steps: Step[] = data.plan.steps;
                        const broadSteps: BroadStep[] = steps.map((step) => {
                            const { timestamp_from, timestamp_to, name } = step;
                            return {
                                from: timestamp_from.split('T')[0], // only takes '2019-12-12'
                                to: timestamp_to.split('T')[0],
                                name: name,
                            };
                        });
                        setValue('broadSteps', broadSteps);
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const { fields, append, remove } = useFieldArray({
        name: 'broadSteps',
        control,
    });

    const onSubmit: SubmitHandler<FormValues> = async () => {
        let broadSteps: BroadStep[] = watch('broadSteps');
        for (const step of broadSteps) {
            let payload = {
                name: step.name,
                workload: 0,
                timestamp_from: step.from,
                timestamp_to: step.to,
                social_form: null,
                learning_env: null,
                ve_approach: null,
                tasks: [],
                evaluation_tools: [],
                attachments: [],
                custom_attributes: {},
            };
            await fetchPOST(
                '/planner/append_step',
                { plan_id: router.query.plannerId, step: payload },
                session?.accessToken
            );
        }

        await router.push({
            pathname: '/startingWizard/finePlanner',
            query: { plannerId: router.query.plannerId },
        });
    };

    /*    const handleSubmit = async () => {
        steps.forEach(async (step) => {
            let payload = {
                name: step.name,
                workload: 0,
                timestamp_from: step.from,
                timestamp_to: step.to,
                social_form: null,
                learning_env: null,
                ve_approach: null,
                tasks: [],
                evaluation_tools: [],
                attachments: [],
                custom_attributes: {},
            };
            await fetchPOST(
                '/planner/append_step',
                { plan_id: router.query.plannerId, step: payload },
                session?.accessToken
            );
        });
    };*/
    const renderBroadStepsInputs = (): JSX.Element[] => {
        return fields.map((step, index) => (
            <WhiteBox key={index}>
                <div className="flex justify-center items-center">
                    <label htmlFor="from" className="">
                        von:
                    </label>
                    <input
                        type="date"
                        {...register(`broadSteps.${index}.from`)}
                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                    />
                    <p className="text-red-600 pt-2">
                        {errors?.broadSteps?.[index]?.from?.message}
                    </p>
                    <label htmlFor="to" className="">
                        bis:
                    </label>
                    <input
                        type="date"
                        {...register(`broadSteps.${index}.to`)}
                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                    />
                    <p className="text-red-600 pt-2">{errors?.broadSteps?.[index]?.to?.message}</p>
                    <input
                        type="text"
                        {...register(`broadSteps.${index}.name`)}
                        placeholder="Name, z.B. Kennenlernphase"
                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                    />
                    <p className="text-red-600 pt-2">
                        {errors?.broadSteps?.[index]?.name?.message}
                    </p>
                </div>
            </WhiteBox>
        ));
    };

    return (
        <>
            <HeadProgressBarSection stage={1} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                    >
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Plane den groben Ablauf
                            </div>
                            <div className={'text-center mb-20'}>
                                erstelle beliebig viele Etappen, setze deren Daten und vergib für
                                jede einen individuellen Namen
                            </div>
                            {renderBroadStepsInputs()}
                            <div className={'w-3/4 mx-7 mt-3 flex justify-end'}>
                                <button type="button" onClick={() => remove(fields.length - 1)}>
                                    <RxMinus size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        append({
                                            from: '',
                                            to: '',
                                            name: '',
                                        });
                                    }}
                                >
                                    <RxPlus size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname:
                                            '/startingWizard/generalInformation/formalConditions',
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
