import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import Stage from '@/components/StartingWizard/FinePlanner/Stage';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
} from '@/interfaces/startingWizard/sideProgressBar';

export interface ITask {
    title: string;
    description: string;
    learning_goal: string;
    tools: string[];
}

export interface IStep {
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

export default function FinePlanner() {
    const [steps, setSteps] = useState<IStep[]>([
        {
            timestamp_from: '',
            timestamp_to: '',
            name: '',
            workload: 0,
            social_form: '',
            learning_env: '',
            ve_approach: '',
            evaluation_tools: ['', ''],
            tasks: [{ title: '', description: '', learning_goal: '', tools: ['', ''] }],
        },
    ]);

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
                    if (data.plan) {
                        if (data.plan.steps.length > 0) {
                            let list = data.plan.steps.map((step: any) => ({
                                ...step,
                                timestamp_from: step.timestamp_from.split('T')[0],
                                timestamp_to: step.timestamp_to.split('T')[0],
                                tasks:
                                    step.tasks.length === 0
                                        ? [
                                              {
                                                  title: '',
                                                  description: '',
                                                  learning_goal: '',
                                                  tools: ['', ''],
                                              },
                                          ]
                                        : step.tasks,
                            }));
                            setSteps(list);
                        } else {
                            setSteps([
                                {
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
                                            tools: ['', ''],
                                        },
                                    ],
                                    attachments: [''],
                                    custom_attributes: { '': '' },
                                },
                            ]);
                        }
                    } else {
                        setSteps([
                            {
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
                                        tools: ['', ''],
                                    },
                                ],
                                attachments: [''],
                                custom_attributes: { '': '' },
                            },
                        ]);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router]);

    const handleSubmit = async () => {
        await fetchPOST(
            '/planner/update_field',
            { plan_id: router.query.plannerId, field_name: 'steps', value: steps },
            session?.accessToken
        );
    };

    const addTask = (e: FormEvent, stepIndex: number) => {
        e.preventDefault();
        let copy = [...steps];
        copy[stepIndex].tasks = [
            ...copy[stepIndex].tasks,
            { title: '', description: '', learning_goal: '', tools: ['', ''] },
        ];
        setSteps(copy);
    };

    const removeTask = (e: FormEvent, stepIndex: number) => {
        e.preventDefault();
        let copy = [...steps];
        copy[stepIndex].tasks.pop();
        setSteps(copy);
    };

    const addToolInputField = (e: FormEvent, stepIndex: number, taskIndex: number) => {
        e.preventDefault();
        let copy = [...steps];
        copy[stepIndex].tasks[taskIndex].tools.push('');
        setSteps(copy);
    };

    const removeToolInputField = (e: FormEvent, stepIndex: number, taskIndex: number) => {
        e.preventDefault();
        let copy = [...steps];
        copy[stepIndex].tasks[taskIndex].tools.pop();
        setSteps(copy);
    };

    const modifyTaskTool = (
        stepIndex: number,
        taskIndex: number,
        toolIndex: number,
        value: string
    ) => {
        setSteps((prevState) => [
            ...prevState.filter((step, _stepIndex: number) => _stepIndex < stepIndex),
            {
                ...prevState[stepIndex],
                tasks: [
                    ...prevState[stepIndex].tasks.filter(
                        (task, _taskIndex: number) => _taskIndex < taskIndex
                    ),
                    {
                        ...prevState[stepIndex].tasks[taskIndex],
                        tools: [
                            ...prevState[stepIndex].tasks[taskIndex].tools.filter(
                                (tool, _toolIndex: number) => _toolIndex < toolIndex
                            ),
                            value,
                            ...prevState[stepIndex].tasks[taskIndex].tools.filter(
                                (tool, _toolIndex: number) => _toolIndex > toolIndex
                            ),
                        ],
                    },
                    ...prevState[stepIndex].tasks.filter(
                        (task, _taskIndex: number) => _taskIndex > taskIndex
                    ),
                ],
            },
            ...prevState.filter((step, _stepIndex: number) => _stepIndex > stepIndex),
        ]);
    };
    const modifyTask = (stepIndex: number, taskIndex: number, valueName: string, value: string) => {
        setSteps((prevState) => [
            ...prevState.filter((step, _stepIndex: number) => _stepIndex < stepIndex),
            {
                ...prevState[stepIndex],
                tasks: [
                    ...prevState[stepIndex].tasks.filter(
                        (task, _taskIndex: number) => _taskIndex < taskIndex
                    ),
                    { ...prevState[stepIndex].tasks[taskIndex], [valueName]: value },
                    ...prevState[stepIndex].tasks.filter(
                        (task, _taskIndex: number) => _taskIndex > taskIndex
                    ),
                ],
            },
            ...prevState.filter((step, _stepIndex: number) => _stepIndex > stepIndex),
        ]);
    };

    const modifyStep = <T,>(stepIndex: number, valueName: string, value: T) => {
        setSteps((prevState) => [
            ...prevState.filter((step, _stepIndex: number) => _stepIndex < stepIndex),
            { ...prevState[stepIndex], [valueName]: value },
            ...prevState.filter((step, _stepIndex: number) => _stepIndex > stepIndex),
        ]);
    };

    return (
        <>
            <HeadProgressBarSection stage={2} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>Feinplanung</div>
                            <div className={'text-center mb-20'}>
                                erweitere die Informationen zu jeder Etappe
                            </div>
                            {steps.map((step, stepIndex) => (
                                <Stage
                                    key={stepIndex}
                                    step={step}
                                    stepIndex={stepIndex}
                                    modifyTaskTool={modifyTaskTool}
                                    modifyTask={modifyTask}
                                    modifyStep={modifyStep}
                                    removeToolInputField={removeToolInputField}
                                    addToolInputField={addToolInputField}
                                    addTask={addTask}
                                    removeTask={removeTask}
                                />
                            ))}
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/broadPlanner',
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
                                <Link
                                    href={{
                                        pathname: '/startingWizard/finish',
                                        query: { plannerId: router.query.plannerId },
                                    }}
                                >
                                    <button
                                        type="submit"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                        onClick={handleSubmit}
                                    >
                                        Weiter
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </form>
                )}
                {/*<SideProgressBarSection progressState={sideMenuStepsProgress} />*/}
            </div>
        </>
    );
}
