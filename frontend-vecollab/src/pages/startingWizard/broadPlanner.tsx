import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ISideProgressBarStateSteps,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { generateFineStepLinkTopMenu } from '@/pages/startingWizard/generalInformation/courseFormat';

interface BroadStep {
    from: string;
    to: string;
    name: string;
}

interface FormValues {
    broadSteps: BroadStep[];
}

export const defaultFineStepData: IFineStep = {
    name: '',
    workload: 0,
    timestamp_from: '',
    timestamp_to: '',
    social_form: '',
    learning_env: '',
    ve_approach: '',
    tasks: [
        {
            title: '',
            description: '',
            learning_goal: '',
            tools: ['', ''],
        },
    ],
    evaluation_tools: [],
    attachments: [],
    custom_attributes: {},
};

export default function BroadPlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const { validateAndRoute } = useValidation();
    const [allSteps, setAllSteps] = useState<IFineStep[]>([defaultFineStepData]);
    const [linkFineStepTopMenu, setLinkFineStepTopMenu] = useState<string>(
        '/startingWizard/finePlanner'
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
        register,
        formState: { errors, isValid },
        handleSubmit,
        control,
        setValue,
        watch,
        getValues,
    } = useForm<FormValues>({
        mode: 'onChange',
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
                    setAllSteps(data.plan.steps);
                    setValue('broadSteps', [
                        {
                            from: '',
                            to: '',
                            name: '',
                        },
                    ]);
                    if (data.plan.steps?.length > 0) {
                        const steps: IFineStep[] = data.plan.steps;
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
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setLinkFineStepTopMenu(generateFineStepLinkTopMenu(data.plan.steps));
                }
            );
        }
    }, [session, status, router, setValue]);

    const { fields, append, remove } = useFieldArray({
        name: 'broadSteps',
        control,
    });

    const checkIfNamesAreUnique = (broadSteps: BroadStep[]): boolean => {
        const broadStepNames = broadSteps.map((broadStep) => broadStep.name);
        return new Set(broadStepNames).size !== broadSteps.length;
    };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const broadSteps: BroadStep[] = data.broadSteps;
        let payload: IFineStep = {
            ...defaultFineStepData,
        };
        const broadStepsData = broadSteps.map((broadStep) => {
            const fineStepBackend = allSteps.find((fineStep) => fineStep.name === broadStep.name);
            if (fineStepBackend !== undefined) {
                payload = fineStepBackend;
            }
            return {
                ...payload,
                name: broadStep.name,
                timestamp_from: broadStep.from,
                timestamp_to: broadStep.to,
            };
        });
        const sideMenuStateSteps: ISideProgressBarStateSteps[] = broadSteps.map((broadStep) => {
            return { [broadStep.name]: ProgressState.notStarted };
        });
        const sideMenuStates: ISideProgressBarStates = {
            ...sideMenuStepsProgress,
            steps: sideMenuStateSteps,
        };
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'steps',
                        value: broadStepsData,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: sideMenuStates,
                    },
                ],
            },
            session?.accessToken
        );
    };

    const getEarliestSideMenuStepLink = (): string => {
        const broadSteps: BroadStep[] = watch('broadSteps');
        if (broadSteps === undefined || broadSteps.length === 0) {
            return '/startingWizard/broadPlanner';
        }
        const sortedBroadSteps = broadSteps
            .sort((a: BroadStep, b: BroadStep) => (a.from > b.from ? 1 : -1))
            .map((step: BroadStep) => ({
                id: encodeURIComponent(step.name),
                text: step.name,
                link: `/startingWizard/fineplanner/${encodeURIComponent(step.name)}`,
            }));
        return sortedBroadSteps[0].link;
    };

    const validateDateRange = (fromValue: string, indexFromTo: number) => {
        const fromDate = new Date(fromValue);
        const toDate = new Date(watch(`broadSteps.${indexFromTo}.to`));
        if (fromDate > toDate) {
            return 'Das Startdatum muss vor dem Enddatum liegen';
        } else {
            return true;
        }
    };

    const renderBroadStepsInputs = (): JSX.Element[] => {
        return fields.map((step, index) => (
            <WhiteBox key={index}>
                <div>
                    <div className="flex justify-center items-center">
                        <label>von:</label>
                        <input
                            type="date"
                            {...register(`broadSteps.${index}.from`, {
                                required: {
                                    value: true,
                                    message: 'Bitte fülle das Felde "von" aus',
                                },
                                validate: (v) => validateDateRange(v, index),
                            })}
                            className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                        />
                        <label>bis:</label>
                        <input
                            type="date"
                            {...register(`broadSteps.${index}.to`, {
                                required: {
                                    value: true,
                                    message: 'Bitte fülle das Felde "bis" aus',
                                },
                            })}
                            className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                        />
                        <input
                            type="text"
                            {...register(`broadSteps.${index}.name`, {
                                required: {
                                    value: true,
                                    message: 'Bitte fülle das Felde "Name" aus',
                                },
                                validate: {
                                    unique: () => {
                                        return (
                                            !checkIfNamesAreUnique(getValues('broadSteps')) ||
                                            'Bitte wähle einen einzigartigen Namen'
                                        );
                                    },
                                },
                            })}
                            placeholder="Name, z.B. Kennenlernphase"
                            className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                        />
                    </div>
                    {errors?.broadSteps?.[index]?.from && (
                        <p className="text-red-600 pt-2 flex justify-center">
                            {errors?.broadSteps?.[index]?.from?.message}
                        </p>
                    )}
                    {errors?.broadSteps?.[index]?.to && (
                        <p className="text-red-600 pt-2 flex justify-center">
                            {errors?.broadSteps?.[index]?.to?.message}
                        </p>
                    )}
                    {errors?.broadSteps?.[index]?.name && (
                        <p className="text-red-600 pt-2 flex justify-center">
                            {errors?.broadSteps?.[index]?.name?.message}
                        </p>
                    )}
                </div>
            </WhiteBox>
        ));
    };

    return (
        <>
            <HeadProgressBarSection stage={1} linkFineStep={linkFineStepTopMenu} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
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
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/generalInformation/formalConditions',
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
                                            isValid
                                        );
                                    }}
                                >
                                    Zurück
                                </button>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            getEarliestSideMenuStepLink(),
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
                                            isValid
                                        );
                                    }}
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={handleSubmit(onSubmit)}
                    isValid={isValid}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
