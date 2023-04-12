import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { PlanIdContext } from '@/pages/_app';

interface Task {
    title: string;
    description: string;
    learning_goal: string;
    tools: string[];
}

interface Step {
    _id?: string;
    timestamp_from: string;
    timestamp_to: string;
    name: string;
    workload: number;
    social_form: string;
    learning_env: string;
    ve_approach: string;
    tasks: Task[];
    evaluation_tools: string[];
}

export default function FinePlanner() {
    const [steps, setSteps] = useState<Step[]>([
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

    const { planId, setPlanId } = useContext(PlanIdContext);
    const { data: session } = useSession();

    //console.log(planId)

    const router = useRouter();
    useEffect(() => {
        if (!planId) {
            router.push('/overviewProjects');
        }
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken).then((data) => {
            console.log(data);

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
                                { title: '', description: '', learning_goal: '', tools: ['', ''] },
                            ],
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
                        tasks: [{ title: '', description: '', learning_goal: '', tools: ['', ''] }],
                    },
                ]);
            }
        });
    }, [planId, session?.accessToken, router]);

    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST(
            '/planner/update_field',
            { plan_id: planId, field_name: 'steps', value: steps },
            session?.accessToken
        );
        console.log(response);
        console.log(steps);
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

    const modifyWorkload = (index: number, value: number) => {
        let newSteps = [...steps];
        newSteps[index].workload = value;
        setSteps(newSteps);
    };
    const modifySocialFrom = (index: number, value: string) => {
        let newSteps = [...steps];
        newSteps[index].social_form = value;
        setSteps(newSteps);
    };
    const modifyLearningEnv = (index: number, value: string) => {
        let newSteps = [...steps];
        newSteps[index].learning_env = value;
        setSteps(newSteps);
    };
    const modifyVeApproach = (index: number, value: string) => {
        let newSteps = [...steps];
        newSteps[index].ve_approach = value;
        setSteps(newSteps);
    };
    const modifyTaskTitle = (stepIndex: number, taskIndex: number, value: string) => {
        let newSteps = [...steps];
        newSteps[stepIndex].tasks[taskIndex].title = value;
        setSteps(newSteps);
    };
    const modifyTaskDescription = (stepIndex: number, taskIndex: number, value: string) => {
        let newSteps = [...steps];
        newSteps[stepIndex].tasks[taskIndex].description = value;
        setSteps(newSteps);
    };
    const modifyTaskLearningGoal = (stepIndex: number, taskIndex: number, value: string) => {
        let newSteps = [...steps];
        newSteps[stepIndex].tasks[taskIndex].learning_goal = value;
        setSteps(newSteps);
    };
    const modifyTaskTool = (
        stepIndex: number,
        taskIndex: number,
        toolIndex: number,
        value: string
    ) => {
        let newSteps = [...steps];
        newSteps[stepIndex].tasks[taskIndex].tools[toolIndex] = value;
        setSteps(newSteps);
    };

    //console.log(steps)

    return (
        <>
            <HeadProgressBarSection stage={2} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>Feinplanung</div>
                        <div className={'text-center mb-20'}>
                            erweitere die Informationen zu jeder Etappe
                        </div>
                        {steps.map((step, index) => (
                            <WhiteBox key={index}>
                                <div className="w-[60rem]">
                                    <div className="flex justify-center items-center">
                                        <div className="mx-2">Etappe: {step.name}</div>
                                        <div className="mx-2">
                                            {step.timestamp_from} - {step.timestamp_to}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex">
                                        <div className="w-1/6 flex items-center">
                                            <label htmlFor="workload" className="px-2 py-2">
                                                Workload (in Stunden)
                                            </label>
                                        </div>
                                        <div className="w-5/6">
                                            <input
                                                type="number"
                                                name="workload"
                                                value={step.workload}
                                                onChange={(e) =>
                                                    modifyWorkload(index, Number(e.target.value))
                                                }
                                                placeholder="in Stunden"
                                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex">
                                        <div className="w-1/6 flex items-center">
                                            <label htmlFor="social_form" className="px-2 py-2">
                                                Sozialform
                                            </label>
                                        </div>
                                        <div className="w-5/6">
                                            <input
                                                type="text"
                                                name="social_form"
                                                value={step.social_form}
                                                onChange={(e) =>
                                                    modifySocialFrom(index, e.target.value)
                                                }
                                                placeholder="wie arbeiten die Studierenden zusammen, z.B. Partner-/Gruppenarbeit, individuell"
                                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex">
                                        <div className="w-1/6 flex items-center">
                                            <label htmlFor="learning_env" className="px-2 py-2">
                                                digitale Lernumgebung
                                            </label>
                                        </div>
                                        <div className="w-5/6">
                                            <textarea
                                                rows={5}
                                                name="learning_env"
                                                value={step.learning_env}
                                                onChange={(e) =>
                                                    modifyLearningEnv(index, e.target.value)
                                                }
                                                placeholder="Struktur und Inhalte der ausgewählten Umgebung (LMS, social Media, kooperatives Dokument usw.)"
                                                className="border border-gray-500 rounded-lg w-full p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex">
                                        <div className="w-1/6 flex items-center">
                                            <label htmlFor="ve_approach" className="px-2 py-2">
                                                VE-Ansatz
                                            </label>
                                        </div>
                                        <div className="w-5/6">
                                            <input
                                                type="text"
                                                name="ve_approach"
                                                value={step.ve_approach}
                                                onChange={(e) =>
                                                    modifyVeApproach(index, e.target.value)
                                                }
                                                placeholder="Welche Ansätze werden verfolgt? (z. B. aufgabenorientierter Ansatz, kulturbezogenes Lernen)"
                                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex">
                                        <div className="w-1/6 flex items-center">
                                            <label htmlFor="tasks" className="px-2 py-2">
                                                Aufgabenstellungen
                                            </label>
                                        </div>
                                        <div className="w-5/6">
                                            {step.tasks.map((task, taskIndex) => (
                                                <div
                                                    key={taskIndex}
                                                    className={
                                                        'p-4 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl'
                                                    }
                                                >
                                                    <div className="mt-2 flex">
                                                        <div className="w-1/6 flex items-center">
                                                            <label
                                                                htmlFor="title"
                                                                className="px-2 py-2"
                                                            >
                                                                Titel
                                                            </label>
                                                        </div>
                                                        <div className="w-5/6">
                                                            <input
                                                                type="text"
                                                                name="title"
                                                                value={task.title}
                                                                onChange={(e) =>
                                                                    modifyTaskTitle(
                                                                        index,
                                                                        taskIndex,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Aufgabentitel"
                                                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex">
                                                        <div className="w-1/6 flex items-center">
                                                            <label
                                                                htmlFor="description"
                                                                className="px-2 py-2"
                                                            >
                                                                Beschreibung
                                                            </label>
                                                        </div>
                                                        <div className="w-5/6">
                                                            <textarea
                                                                rows={5}
                                                                name="description"
                                                                value={task.description}
                                                                onChange={(e) =>
                                                                    modifyTaskDescription(
                                                                        index,
                                                                        taskIndex,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Beschreibe die Aufgabe detailierter"
                                                                className="border border-gray-500 rounded-lg w-full p-2"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex">
                                                        <div className="w-1/6 flex items-center">
                                                            <label
                                                                htmlFor="learning_goal"
                                                                className="px-2 py-2"
                                                            >
                                                                Lernziele
                                                            </label>
                                                        </div>
                                                        <div className="w-5/6">
                                                            <textarea
                                                                rows={5}
                                                                name="learning_goal"
                                                                value={task.learning_goal}
                                                                onChange={(e) =>
                                                                    modifyTaskLearningGoal(
                                                                        index,
                                                                        taskIndex,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Welche Lernziele werden mit der Aufgabe verfolgt?"
                                                                className="border border-gray-500 rounded-lg w-full p-2"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2">
                                                        <div className="flex">
                                                            <div className="w-1/6 flex items-center">
                                                                <label
                                                                    htmlFor="tools"
                                                                    className="px-2 py-2"
                                                                >
                                                                    Tools & Medien
                                                                </label>
                                                            </div>
                                                            <div className="w-5/6">
                                                                {task.tools.map(
                                                                    (tool, toolIndex) => (
                                                                        <input
                                                                            key={toolIndex}
                                                                            type="text"
                                                                            name="tools"
                                                                            value={tool}
                                                                            onChange={(e) =>
                                                                                modifyTaskTool(
                                                                                    index,
                                                                                    taskIndex,
                                                                                    toolIndex,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder="Welche Tools können verwendet werden?"
                                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2 my-1"
                                                                        />
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={'mx-7 flex justify-end'}>
                                                        <button
                                                            onClick={(e) =>
                                                                removeToolInputField(
                                                                    e,
                                                                    index,
                                                                    taskIndex
                                                                )
                                                            }
                                                        >
                                                            <RxMinus size={20} />
                                                        </button>
                                                        <button
                                                            onClick={(e) =>
                                                                addToolInputField(
                                                                    e,
                                                                    index,
                                                                    taskIndex
                                                                )
                                                            }
                                                        >
                                                            <RxPlus size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={'mx-7 flex justify-end'}>
                                        <button onClick={(e) => removeTask(e, index)}>
                                            <RxMinus size={20} />
                                        </button>
                                        <button onClick={(e) => addTask(e, index)}>
                                            <RxPlus size={20} />
                                        </button>
                                    </div>
                                </div>
                            </WhiteBox>
                        ))}
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={'/startingWizard/broadPlanner'}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={'/startingWizard/finish'}>
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
            </div>
        </>
    );
}
