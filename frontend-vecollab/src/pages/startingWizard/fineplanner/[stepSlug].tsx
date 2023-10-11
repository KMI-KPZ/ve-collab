import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchGET, fetchPOST } from '@/lib/backend';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import LoadingAnimation from '@/components/LoadingAnimation';
import Stage from '@/components/StartingWizard/FinePlanner/Stage';
import { SubmitHandler, useForm, FormProvider } from 'react-hook-form';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
    SideMenuStep,
} from '@/interfaces/startingWizard/sideProgressBar';
import { generateFineStepLinkTopMenu } from '@/pages/startingWizard/generalInformation/courseFormat';

export interface ITask {
    title: string;
    description: string;
    learning_goal: string;
    tools: string[];
}

export interface ITaskFrontend {
    title: string;
    description: string;
    learning_goal: string;
    tools: IToolsFrontend[];
}
export interface IToolsFrontend {
    name: string;
}

export interface IFineStepFrontend {
    _id?: string;
    timestamp_from: string;
    timestamp_to: string;
    name: string;
    workload: number;
    social_form: string;
    learning_env: string;
    ve_approach: string;
    tasks: ITaskFrontend[];
    evaluation_tools: string[];
    attachments?: string[];
    custom_attributes?: Record<string, string>;
}

export interface IFineStep {
    _id?: string;
    timestamp_from: string;
    timestamp_to: string;
    name: string;
    workload: number;
    social_form: string;
    learning_env: string;
    ve_approach: string;
    tasks: ITask[];
    evaluation_tools: string[];
    attachments?: string[];
    custom_attributes?: Record<string, string>;
}

export const defaultFormValueDataFineStepFrontend: IFineStepFrontend = {
    timestamp_from: '',
    timestamp_to: '',
    name: '',
    workload: 0,
    social_form: '',
    learning_env: '',
    ve_approach: '',
    evaluation_tools: ['', ''],
    tasks: [
        {
            title: '',
            description: '',
            learning_goal: '',
            tools: [{ name: '' }, { name: '' }],
        },
    ],
};

export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { stepSlug } = router.query;
    const { validateAndRoute } = useValidation();
    const methods = useForm<IFineStepFrontend>({
        mode: 'onChange',
        defaultValues: {
            ...defaultFormValueDataFineStepFrontend,
        },
    });

    const [currentFineStep, setCurrentFineStep] = useState<IFineStepFrontend>({
        ...defaultFormValueDataFineStepFrontend,
    });

    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [sideMenuStepsData, setSideMenuStepsData] = useState<SideMenuStep[]>([]);
    const [linkFineStepTopMenu, setLinkFineStepTopMenu] = useState<string>(
        '/startingWizard/finePlanner'
    );
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

        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    if (data.plan.steps?.length > 0) {
                        setSteps(data.plan.steps);
                        const currentFineStepCopy: IFineStep | undefined = data.plan.steps.find(
                            (item: IFineStep) => item.name === stepSlug
                        );

                        if (currentFineStepCopy) {
                            const transformedTasks: ITaskFrontend[] = currentFineStepCopy.tasks.map(
                                (task: ITask) => {
                                    return {
                                        ...task,
                                        tools: task.tools.map((tool) => ({
                                            name: tool,
                                        })),
                                    };
                                }
                            );
                            const fineStepCopyTransformedTools: IFineStepFrontend = {
                                ...currentFineStepCopy,
                                tasks: transformedTasks,
                            };
                            setCurrentFineStep(fineStepCopyTransformedTools);
                            methods.reset({ ...fineStepCopyTransformedTools });
                            setSideMenuStepsData(generateSideMenuStepsData(data.plan.steps));
                            setLinkFineStepTopMenu(generateFineStepLinkTopMenu(data.plan.steps));
                            setSideMenuStepsProgress(data.plan.progress);
                        }
                    }
                }
            );
        }
    }, [session, status, router, stepSlug, methods]);

    const onSubmit: SubmitHandler<IFineStepFrontend> = async (data: IFineStepFrontend) => {
        const stepsWithoutCurrent = steps.filter((item: IFineStep) => item.name !== stepSlug);
        const currentStepTransformBackTools: ITask[] = data.tasks.map((task: ITaskFrontend) => {
            return {
                ...task,
                tools: task.tools.map((tool) => tool.name),
            };
        });

        const stepCurrent: IFineStep = {
            ...data,
            workload: data.workload,
            social_form: data.social_form,
            learning_env: data.learning_env,
            ve_approach: data.ve_approach,
            tasks: currentStepTransformBackTools,
        };
        const stepSlugDecoded = decodeURI(stepSlug as string);
        const stepsWithoutCurrentProgressState = sideMenuStepsProgress.steps.filter(
            (step) => step[stepSlugDecoded] == undefined
        );
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'steps',
                        value: [stepCurrent, ...stepsWithoutCurrent],
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            steps: [
                                ...stepsWithoutCurrentProgressState,
                                { [stepSlugDecoded]: ProgressState.completed },
                            ],
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    const generateSideMenuStepsData = (steps: IFineStep[]): SideMenuStep[] => {
        return steps
            .sort((a: IFineStep, b: IFineStep) => (a.timestamp_from > b.timestamp_from ? 1 : -1))
            .map((step: IFineStep) => ({
                id: encodeURIComponent(step.name),
                text: step.name,
                link: `/startingWizard/fineplanner/${encodeURIComponent(step.name)}`,
            }));
    };

    const getNextFineStepUrl = (): string => {
        const nextFineStep =
            sideMenuStepsData.findIndex((item: SideMenuStep) => item.text === stepSlug) + 1;
        if (
            sideMenuStepsData[nextFineStep]?.link !== undefined &&
            nextFineStep <= sideMenuStepsData.length - 1
        ) {
            return sideMenuStepsData[nextFineStep]?.link;
        } else {
            return '/startingWizard/finish';
        }
    };

    const getPreviousFineStepUrl = (): string => {
        const nextFineStep =
            sideMenuStepsData.findIndex((item: SideMenuStep) => item.id === stepSlug) - 1;
        if (sideMenuStepsData[nextFineStep]?.link !== undefined) {
            return sideMenuStepsData[nextFineStep]?.link;
        } else {
            return '/startingWizard/broadPlanner';
        }
    };

    return (
        <>
            <HeadProgressBarSection stage={2} linkFineStep={linkFineStepTopMenu} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <FormProvider {...methods}>
                        <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                            <div>
                                <div className={'text-center font-bold text-4xl mb-2'}>
                                    Feinplanung
                                </div>
                                <div className={'text-center mb-20'}>
                                    erweitere die Informationen zu jeder Etappe
                                </div>
                                <Stage fineStep={currentFineStep} />
                            </div>
                            <div className="flex justify-around w-full">
                                <div>
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                        onClick={() => {
                                            validateAndRoute(
                                                getPreviousFineStepUrl(),
                                                router.query.plannerId,
                                                methods.handleSubmit(onSubmit),
                                                methods.formState.isValid
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
                                                getNextFineStepUrl(),
                                                router.query.plannerId,
                                                methods.handleSubmit(onSubmit),
                                                methods.formState.isValid
                                            );
                                        }}
                                    >
                                        Weiter
                                    </button>
                                </div>
                            </div>
                        </form>
                    </FormProvider>
                )}
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={methods.handleSubmit(onSubmit)}
                    isValid={methods.formState.isValid}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
