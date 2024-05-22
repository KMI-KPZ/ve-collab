import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchGET, fetchPOST } from '@/lib/backend';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import LoadingAnimation from '@/components/LoadingAnimation';
import Stage from '@/components/VE-designer/FinePlanner/Stage';
import { SubmitHandler, useForm, FormProvider } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ISideProgressBarStateSteps,
    ProgressState,
    SideMenuStep,
} from '@/interfaces/ve-designer/sideProgressBar';
import SideProgressbarSectionFinePlanner from '@/components/VE-designer/SideProgressbarSectionFinePlanner';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';

export interface ITask {
    task_formulation: string;
    work_mode: string;
    notes: string;
    tools: string[];
    materials: string[];
}

export interface ITaskFrontend {
    task_formulation: string;
    work_mode: string;
    notes: string;
    tools: IToolsFrontend[];
    materials: IMaterialFrontend[];
}
export interface IToolsFrontend {
    name: string;
}

export interface IMaterialFrontend {
    name: string;
}

export interface IFineStepFrontend {
    _id?: string;
    timestamp_from: string;
    timestamp_to: string;
    name: string;
    workload: number;
    learning_goal: string;
    has_tasks: boolean;
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
    learning_goal: string;
    has_tasks: boolean;
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
    learning_goal: '',
    evaluation_tools: ['', ''],
    has_tasks: false,
    tasks: [
        {
            task_formulation: '',
            work_mode: '',
            notes: '',
            tools: [{ name: '' }, { name: '' }],
            materials: [{ name: '' }, { name: '' }],
        },
    ],
};

const areAllFormValuesEmpty = (formValues: IFineStepFrontend): boolean => {
    return (
        formValues.workload === 0 &&
        formValues.learning_goal === '' &&
        formValues.evaluation_tools.every((tool) => {
            return tool === '';
        }) &&
        formValues.tasks.every((task) => {
            return (
                task.task_formulation === '' &&
                task.work_mode === '' &&
                task.notes === '' &&
                task.tools.every((tool) => {
                    return tool.name === '';
                }) &&
                task.materials.every((materials) => {
                    return materials.name === '';
                })
            );
        })
    );
};

FinePlanner.auth = true;
export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { stepName } = router.query;
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
            router.push('/plans');
            return;
        }

        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    if (data.plan.steps?.length > 0) {
                        setSteps(data.plan.steps);
                        const currentFineStepCopy: IFineStep | undefined = data.plan.steps.find(
                            (item: IFineStep) => item.name === stepName
                        );
                        if (currentFineStepCopy) {
                            const transformedTasks: ITaskFrontend[] = currentFineStepCopy.tasks.map(
                                (task: ITask) => {
                                    return {
                                        ...task,
                                        tools: task.tools.map((tool) => ({
                                            name: tool,
                                        })),
                                        materials: task.materials.map((materials) => ({
                                            name: materials,
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
    }, [session, status, router, stepName, methods]);

    const onSubmit: SubmitHandler<IFineStepFrontend> = async (data: IFineStepFrontend) => {
        const currentStepTransformBackTools: ITask[] = data.tasks.map((task: ITaskFrontend) => {
            return {
                ...task,
                tools: task.tools.map((tool) => tool.name),
                materials: task.materials.map((materials) => materials.name),
            };
        });

        const updateStepsData = steps.map((step) =>
            step.name === stepName
                ? {
                      ...data,
                      workload: data.workload,
                      learning_goal: data.learning_goal,
                      has_tasks: data.has_tasks,
                      tasks: currentStepTransformBackTools,
                  }
                : step
        );

        const stepSlugDecoded = decodeURI(stepName as string);

        const updateStepsProgress = sideMenuStepsProgress.steps.map(
            (step: ISideProgressBarStateSteps) =>
                step[stepSlugDecoded] !== undefined
                    ? { [stepSlugDecoded]: ProgressState.completed }
                    : step
        );
        if (!areAllFormValuesEmpty(data)) {
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
        }
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
            link: `/ve-designer/step-data/${encodeURIComponent(step.name)}`,
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
            return '/ve-designer/finish';
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
            return '/ve-designer/step-names';
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
                                                <Link
                                                    target="_blank"
                                                    href={
                                                        '/learning-material/left-bubble/Etappenplanung'
                                                    }
                                                >
                                                    <PiBookOpenText size={30} color="#00748f" />
                                                </Link>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className={'text-center mb-20'}>
                                        Beschreibt nun die einzelnen Etappen genauer
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
