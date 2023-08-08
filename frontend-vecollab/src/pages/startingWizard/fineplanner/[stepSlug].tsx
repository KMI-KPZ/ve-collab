import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { IStep, ITask } from '@/pages/startingWizard/finePlanner';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import LoadingAnimation from '@/components/LoadingAnimation';
import Stage2 from '@/components/StartingWizard/FinePlanner/Stage2';

/*interface IFineStep {
    _id: string;
    attachments: [];
    custom_attributes: {};
    duration: number;
    evaluation_tools: [];
    learning_env: null;
    name: string;
    social_form: null;
    tasks: [];
    timestamp_from: Date;
    timestamp_to: Date;
    ve_approach: null;
    workload: number;
}*/

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

export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { stepSlug } = router.query;
    const [fineStep, setFineStep] = useState<IFineStep>({
        timestamp_from: '',
        timestamp_to: '',
        name: '',
        workload: 0,
        social_form: '',
        learning_env: '',
        ve_approach: '',
        evaluation_tools: ['', ''],
        tasks: [{ title: '', description: '', learning_goal: '', tools: ['', ''] }],
    });
    const [steps, setSteps] = useState<IFineStep[]>([
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

                    console.log(steps);
                    const fineStepCopy: IFineStep | undefined = steps.find(
                        (item: IStep) => item.name === stepSlug
                    );
                    console.log(fineStepCopy);
                    if (fineStepCopy) {
                        setFineStep(fineStepCopy);
                    }
                }
            );
        }
    }, [session, status, router, stepSlug]);

    const handleSubmit = async () => {
        await fetchPOST(
            '/planner/update_field',
            // TODO filter
            { plan_id: router.query.plannerId, field_name: 'steps', value: steps },
            session?.accessToken
        );
    };

    const addTask = (e: FormEvent) => {
        e.preventDefault();
        let copyFineStep = fineStep;
        copyFineStep.tasks = [
            ...fineStep.tasks,
            { title: '', description: '', learning_goal: '', tools: ['', ''] },
        ];
        setFineStep(copyFineStep);
    };

    const removeTask = (e: FormEvent) => {
        e.preventDefault();
        let copyFineStep = fineStep;
        fineStep.tasks.pop();
        setFineStep(copyFineStep);
    };

    const addToolInputField = (e: FormEvent, taskIndex: number) => {
        e.preventDefault();
        let copyFineStep = fineStep;
        fineStep.tasks[taskIndex].tools.push('');
        setFineStep(copyFineStep);
    };

    const removeToolInputField = (e: FormEvent, taskIndex: number) => {
        e.preventDefault();
        let copyFineStep = fineStep;
        fineStep.tasks[taskIndex].tools.pop();
        setFineStep(copyFineStep);
    };

    const modifyTaskTool = (taskIndex: number, toolIndex: number, value: string) => {
        setFineStep((prevState) => ({
            ...prevState,
            tasks: [
                ...prevState.tasks.filter((task, _taskIndex: number) => _taskIndex < taskIndex),
                {
                    ...prevState.tasks[taskIndex],
                    tools: [
                        ...prevState.tasks[taskIndex].tools.filter(
                            (tool, _toolIndex: number) => _toolIndex < toolIndex
                        ),
                        value,
                        ...prevState.tasks[taskIndex].tools.filter(
                            (tool, _toolIndex: number) => _toolIndex > toolIndex
                        ),
                    ],
                },
                ...prevState.tasks.filter((task, _taskIndex: number) => _taskIndex > taskIndex),
            ],
        }));
    };
    const modifyTask = (taskIndex: number, valueName: string, value: string) => {
        setFineStep((prevState) => ({
            ...prevState,
            tasks: [
                ...prevState.tasks.filter((task, _taskIndex: number) => _taskIndex < taskIndex),
                { ...prevState.tasks[taskIndex], [valueName]: value },
                ...prevState.tasks.filter((task, _taskIndex: number) => _taskIndex > taskIndex),
            ],
        }));
    };

    const modifyStep = <T,>(valueName: string, value: T) => {
        setSteps((prevState) => ({ ...prevState, [valueName]: value }));
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
                            <Stage2
                                fineStep={fineStep}
                                modifyTaskTool={modifyTaskTool}
                                modifyTask={modifyTask}
                                modifyStep={modifyStep}
                                removeToolInputField={removeToolInputField}
                                addToolInputField={addToolInputField}
                                addTask={addTask}
                                removeTask={removeTask}
                            />
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
