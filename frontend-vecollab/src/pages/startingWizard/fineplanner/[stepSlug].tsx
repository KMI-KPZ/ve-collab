import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchGET, fetchPOST } from '@/lib/backend';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import LoadingAnimation from '@/components/LoadingAnimation';
import Stage from '@/components/StartingWizard/FinePlanner/Stage';
import { SubmitHandler, useForm, FormProvider } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ISideProgressBarStateSteps,
    ProgressState,
    SideMenuStep,
} from '@/interfaces/startingWizard/sideProgressBar';
import SideProgressbarSectionFinePlanner from '@/components/StartingWizard/SideProgressbarSectionFinePlanner';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { FiInfo } from 'react-icons/fi';

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

FinePlanner.auth = true;
export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { stepSlug } = router.query;
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
                            setSideMenuStepsProgress(data.plan.progress);
                        }
                    }
                }
            );
        }
    }, [session, status, router, stepSlug, methods]);

    const onSubmit: SubmitHandler<IFineStepFrontend> = async (data: IFineStepFrontend) => {
        const currentStepTransformBackTools: ITask[] = data.tasks.map((task: ITaskFrontend) => {
            return {
                ...task,
                tools: task.tools.map((tool) => tool.name),
            };
        });

        const updateStepsData = steps.map((step) =>
            step.name === stepSlug
                ? {
                      ...data,
                      workload: data.workload,
                      social_form: data.social_form,
                      learning_env: data.learning_env,
                      ve_approach: data.ve_approach,
                      tasks: currentStepTransformBackTools,
                  }
                : step
        );

        const stepSlugDecoded = decodeURI(stepSlug as string);

        const updateStepsProgress = sideMenuStepsProgress.steps.map(
            (step: ISideProgressBarStateSteps) =>
                step[stepSlugDecoded] !== undefined
                    ? { [stepSlugDecoded]: ProgressState.completed }
                    : step
        );

        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'steps',
                        value: [...updateStepsData],
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            steps: [...updateStepsProgress],
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    const combinedSubmitRouteAndUpdate = async (data: IFineStepFrontend, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    const generateSideMenuStepsData = (steps: IFineStep[]): SideMenuStep[] => {
        return steps.map((step: IFineStep) => ({
            id: encodeURIComponent(step.name),
            text: step.name,
            link: `/startingWizard/fineplanner/${encodeURIComponent(step.name)}`,
        }));
    };

    const getNextFineStepUrl = (): string => {
        const sideMenuStepsDataCopy: SideMenuStep[] = [...sideMenuStepsData];
        const currentSideMenuStepIndex: number = sideMenuStepsDataCopy.findIndex(
            // courseFormat generate Finestep methode rausnehmen
            (item: SideMenuStep): boolean => item.text === currentFineStep.name // with id (encode einfach)
        ); // -1 if not found
        if (
            currentSideMenuStepIndex < sideMenuStepsDataCopy.length - 1 &&
            currentSideMenuStepIndex >= 0
        ) {
            return sideMenuStepsDataCopy[currentSideMenuStepIndex + 1].link;
        } else {
            return '/startingWizard/finish';
        }
    };

    const getPreviousFineStepUrl = (): string => {
        const sideMenuStepsDataCopy: SideMenuStep[] = [...sideMenuStepsData];
        const currentSideMenuStepIndex: number = sideMenuStepsDataCopy.findIndex(
            (item: SideMenuStep): boolean => item.text === currentFineStep.name
        );
        if (currentSideMenuStepIndex > 0) {
            return sideMenuStepsDataCopy[currentSideMenuStepIndex - 1].link;
        } else {
            return '/startingWizard/broadPlanner';
        }
    };

    return (
        <div className="flex bg-pattern-left-blue-small bg-no-repeat">
            <div className="flex flex-grow justify-center">
                <div className="flex flex-col">
                    <HeadProgressBarSection stage={2} linkFineStep={steps[0]?.name} />
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <FormProvider {...methods}>
                            <form className="gap-y-6 w-full p-12 max-w-7xl items-center flex flex-col flex-grow justify-between">
                                <div>
                                    <div className="flex justify-center">
                                        <div
                                            className={
                                                'text-center font-bold text-4xl mb-2 relative w-fit'
                                            }
                                        >
                                            Feinplanung
                                            <Tooltip tooltipsText="Mehr Aspekte der Feinplanung findest du hier in den Selbstlernmaterialien …">
                                                <Link target="_blank" href={'/content/VE-Planung'}>
                                                    <FiInfo size={30} color="#00748f" />
                                                </Link>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className={'text-center mb-20'}>
                                        erweitere die Informationen zu jeder Etappe
                                    </div>
                                    <Stage fineStep={currentFineStep} />
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    getPreviousFineStepUrl()
                                                )
                                            )}
                                        >
                                            Zurück
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    getNextFineStepUrl()
                                                )
                                            )}
                                        >
                                            Weiter
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </FormProvider>
                    )}
                </div>
            </div>
            <SideProgressbarSectionFinePlanner
                progressState={sideMenuStepsProgress}
                handleValidation={methods.handleSubmit(onSubmit)}
                isValid={true}
                sideMenuStepsData={sideMenuStepsData}
            />
        </div>
    );
}
