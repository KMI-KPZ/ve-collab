import React, { useCallback, useState } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ISideProgressBarStateSteps,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
    DroppableProvided,
    DraggableProvided,
} from '@hello-pangea/dnd';
import iconUpAndDown from '@/images/icons/ve-designer/upAndDownArrow.png';
import trash from '@/images/icons/ve-designer/trash.png';
import Image from 'next/image';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import Dialog from '@/components/profile/Dialog';
import { fetchGET } from '@/lib/backend';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Timestamp from '@/components/common/Timestamp';
import { MdArrowOutward, MdNewspaper } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import ButtonPrimary from '@/components/common/buttons/ButtonPrimary';
import Link from 'next/link';

interface FormValues {
    stepNames: IFineStep[];
}

const areAllFormValuesEmpty = (stepNamesObject: FormValues): boolean => {
    return stepNamesObject.stepNames.every((step) => {
        return (
            step.name === '' &&
            step.timestamp_from === '' &&
            step.timestamp_to === '' &&
            step.learning_goal === '' &&
            step.workload === 0
        );
    });
};

export const emptyStepData: IFineStep = {
    _id: undefined,
    name: '',
    timestamp_from: '',
    timestamp_to: '',
    workload: 0,
    learning_goal: '',
    learning_activity: '',
    has_tasks: false,
    tasks: [
        {
            task_formulation: '',
            work_mode: '',
            notes: '',
            tools: ['', ''],
            materials: ['', ''],
        },
    ],
    original_plan: '',
};

interface Props {
    socket: Socket;
}

StepNames.auth = true;
export default function StepNames({ socket }: Props): JSX.Element {
    const { data: session } = useSession();
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([emptyStepData]);
    const noStepPage = '/ve-designer/no-step';
    const [isImportStepsDialogOpen, setIsImportStepsDialogOpen] = useState<boolean>(false);

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const [loadingAvailPlans, setLoadingAvailPlans] = useState<boolean>(true);
    const [availPlans, setAvailPlans] = useState<IPlan[]>([]);
    const [stepsToImport, setStepsToImport] = useState<IFineStep[]>([]);

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            stepNames: [
                {
                    timestamp_from: yesterday,
                    timestamp_to: today,
                    name: 'Kennenlernen',
                    workload: 0,
                    learning_goal: '',
                },
                {
                    timestamp_from: yesterday,
                    timestamp_to: today,
                    name: 'Evaluation',
                    workload: 0,
                    learning_goal: '',
                },
            ],
        },
    });

    const { fields, append, remove, move, update, replace } = useFieldArray({
        name: 'stepNames',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            let data: { [key: string]: any } = {};

            if (plan.steps?.length > 0) {
                data.stepNames = plan.steps.map((step) => {
                    return Object.assign({}, step, {
                        timestamp_from: step.timestamp_from.split('T')[0],
                        timestamp_to: step.timestamp_to.split('T')[0],
                    });
                });
                replace(data.stepNames);
                setSteps(plan.steps);
                // DIRTY hack to initial set the size of our textareas
                setTimeout(() => {
                    plan.steps?.map((step, i) =>
                        adjustTextareaSize(
                            document.querySelector(`textarea[name='stepNames.${i}.learning_goal']`)
                        )
                    );
                }, 1);
            }
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }

            return data;
        },
        [replace]
    );

    const checkIfNamesAreUnique = (stepNames: IFineStep[]): boolean => {
        const stepNamesNames = stepNames.map((stepName) => stepName.name);
        return new Set(stepNamesNames).size !== stepNames.length;
    };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const stepNames: IFineStep[] = data.stepNames;
        let payload: IFineStep = {
            ...emptyStepData,
        };
        const stepNamesData = data.stepNames.map((step) => {
            // TODO ids lieber vergleichen
            const fineStepBackend = steps.find((fineStep) => fineStep.name === step.name);
            if (fineStepBackend !== undefined) {
                payload = fineStepBackend;
            }
            return Object.assign({}, payload, step);
        });

        const sideMenuStateSteps: ISideProgressBarStateSteps[] = stepNames.map((broadStep) => {
            return { [encodeURI(broadStep.name)]: ProgressState.notStarted };
        });

        const progressState = areAllFormValuesEmpty(data)
            ? ProgressState.notStarted
            : ProgressState.completed;

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'steps',
                value: stepNamesData,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    stepsGenerally: progressState,
                    steps: sideMenuStateSteps,
                },
            },
        ];
    };

    const validateDateRange = (fromValue: string, indexFromTo: number) => {
        const fromDate = new Date(fromValue);
        const toDate = new Date(methods.watch(`stepNames.${indexFromTo}.timestamp_to`));
        if (fromDate > toDate) {
            return 'Das Startdatum muss vor dem Enddatum liegen';
        } else {
            return true;
        }
    };

    const handleDelete = (index: number): void => {
        remove(index);
        // if (fields.length > 1) {
        //     remove(index);
        // } else {
        //     update(index, emptyStepData);
        // }
    };

    const onDragEnd = (result: DropResult): void => {
        if (result.destination) {
            move(result.source.index, result.destination.index);
        }
    };

    const openStepsImportDialog = () => {
        setIsImportStepsDialogOpen(true);
        if (availPlans.length) return;
        setLoadingAvailPlans(true);

        fetchGET('/planner/get_available', session?.accessToken)
            .then((data) => {
                setAvailPlans(data.plans as IPlan[]);
            })
            .finally(() => setLoadingAvailPlans(false));
    };
    const toggleStepToImport = (plan: IPlan, step: IFineStep) => {
        if (stepsToImport.some((s) => s._id == step._id)) {
            setStepsToImport((prev) => prev.filter((s) => s._id != step._id));
        } else {
            setStepsToImport((prev) => [
                ...prev,
                {
                    ...step,
                    original_plan: step.original_plan === '' ? plan._id : step.original_plan,
                },
            ]);
        }
    };

    const handleStepsImport = () => {
        stepsToImport.map((step) => {
            append(
                Object.assign({}, step, {
                    _id: undefined,
                    timestamp_from: new Date(step.timestamp_from).toISOString().split('T')[0],
                    timestamp_to: new Date(step.timestamp_from).toISOString().split('T')[0],
                } as IFineStep)
            );
        });
        setIsImportStepsDialogOpen(false);
        setStepsToImport([]);
    };

    const adjustTextareaSize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = '0px';
        el.style.height = el.scrollHeight + 'px';
    };

    const ImportStepsDialog = () => {
        if (loadingAvailPlans) return <LoadingAnimation />;

        const plans = availPlans.filter(
            (plan) =>
                plan.is_good_practise && plan.steps.length && plan._id != router.query.plannerId
        );
        if (!plans.length)
            return (
                <>
                    Es sind noch keine &quot;Good Practice&quot; Pläne mit Etappen zum importieren
                    vorhanden
                </>
            );

        // TODO add simple filter input?

        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div>
                    Wähle aus den &quot;Good Practice&quot; Plänen Etappen zum importieren aus
                </div>

                {plans
                    .sort((a, b) => {
                        return (
                            new Date(b.last_modified).getTime() -
                            new Date(a.last_modified).getTime()
                        );
                    })
                    .map((plan, i) => (
                        <div key={plan._id}>
                            <div className="p-2 flex items-center gap-x-4 gap-y-6 rounded-md">
                                <MdNewspaper />
                                <Link className='text-xl font-bold grow-0 group' href={`/plan/${plan._id}`} target='_blank'>
                                    {plan.name}
                                    <MdArrowOutward className='hidden text-slate-500 group-hover:inline' />
                                </Link>
                                {session?.user.preferred_username != plan.author && (
                                    <div className="text-sm text-gray-500">von {plan.author}</div>
                                )}
                                <span className="grow text-right" title="zuletzt geändert">
                                    <Timestamp timestamp={plan.last_modified} className="text-sm" />
                                </span>
                            </div>
                            {plan.steps.map((step, j) => (
                                <div
                                    key={step._id}
                                    className="ml-10 hover:cursor-pointer flex"
                                    onClick={(e) => toggleStepToImport(plan, step)}
                                    title="Add/Remove"
                                >
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        checked={stepsToImport.some((s) => s._id == step._id)}
                                        readOnly
                                    />
                                    {step.name} ({step.workload} h)
                                </div>
                            ))}
                        </div>
                    ))}
                <div className="ml-auto text-right">
                    <button
                        type="button"
                        className="py-2 px-5 mr-2 border border-ve-collab-orange rounded-lg"
                        onClick={(e) => setIsImportStepsDialogOpen(false)}
                    >
                        Abbrechen
                    </button>
                    <ButtonPrimary label={'Importieren'} onClick={() => handleStepsImport()} />
                </div>
            </div>
        );
    };

    const renderStepNamesInputs = (): JSX.Element[] => {
        return fields.map((step, index) => (
            <Draggable key={`stepNames.${index}`} draggableId={`step-${index}`} index={index}>
                {(provided: DraggableProvided) => (
                    <div key={step.id} {...provided.draggableProps} ref={provided.innerRef}>
                        <div className="shadow rounded px-2 py-4 my-4">
                            <div className="flex justify-between items-center">
                                <div className="ml-6">
                                    <div className="flex flex-wrap gap-y-2 items-center">
                                        <div>
                                            <label>von:</label>
                                            <input
                                                type="date"
                                                {...methods.register(
                                                    `stepNames.${index}.timestamp_from`,
                                                    {
                                                        required: {
                                                            value: true,
                                                            message:
                                                                'Bitte fülle das Felde "von" aus',
                                                        },
                                                        validate: (v) =>
                                                            validateDateRange(v, index),
                                                    }
                                                )}
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="ml-2">bis:</label>
                                            <input
                                                type="date"
                                                {...methods.register(
                                                    `stepNames.${index}.timestamp_to`,
                                                    {
                                                        required: {
                                                            value: true,
                                                            message:
                                                                'Bitte fülle das Felde "bis" aus',
                                                        },
                                                    }
                                                )}
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="ml-2">Name:</label>
                                            <input
                                                type="text"
                                                {...methods.register(`stepNames.${index}.name`, {
                                                    required: {
                                                        value: true,
                                                        message: 'Bitte fülle das Felde "Name" aus',
                                                    },
                                                    validate: {
                                                        unique: () => {
                                                            return (
                                                                !checkIfNamesAreUnique(
                                                                    methods.getValues('stepNames')
                                                                ) ||
                                                                'Bitte wähle einen einzigartigen Namen'
                                                            );
                                                        },
                                                    },
                                                })}
                                                placeholder="Name, z.B. Kennenlernphase"
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="ml-2">Zeitaufwand:</label>
                                            <input
                                                type="number"
                                                {...methods.register(
                                                    `stepNames.${index}.workload`,
                                                    {
                                                        validate: {
                                                            positive: (v) => {
                                                                return (
                                                                    v >= 0 ||
                                                                    'Der Zeitaufwand kann nicht negativ sein'
                                                                );
                                                            },
                                                        },
                                                        setValueAs: (v: string) => parseInt(v),
                                                    }
                                                )}
                                                placeholder="Zeitaufwand in Stunden"
                                                className="border border-gray-400 rounded-lg py-2 pl-2 mx-2 w-11"
                                            />
                                            <label className="mr-4">h</label>
                                        </div>
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <label>Lernziel(e):</label>
                                        <textarea
                                            {...methods.register(
                                                `stepNames.${index}.learning_goal`
                                            )}
                                            rows={1}
                                            placeholder="mehrere durch Komma trennen"
                                            className="border border-gray-400 rounded-lg p-2 mx-2 flex-grow"
                                            onChange={(e) => {
                                                adjustTextareaSize(e.currentTarget);
                                            }}
                                        />
                                    </div>
                                    {methods.formState.errors?.stepNames?.[index]
                                        ?.timestamp_from && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {
                                                methods.formState.errors?.stepNames?.[index]
                                                    ?.timestamp_from?.message
                                            }
                                        </p>
                                    )}
                                    {methods.formState.errors?.stepNames?.[index]?.timestamp_to && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {
                                                methods.formState.errors?.stepNames?.[index]
                                                    ?.timestamp_to?.message
                                            }
                                        </p>
                                    )}
                                    {methods.formState.errors?.stepNames?.[index]?.name && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {
                                                methods.formState.errors?.stepNames?.[index]?.name
                                                    ?.message
                                            }
                                        </p>
                                    )}
                                    {methods.formState.errors?.stepNames?.[index]?.workload && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {
                                                methods.formState.errors?.stepNames?.[index]
                                                    ?.workload?.message
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center mr-6">
                                    <Image
                                        className="mx-2"
                                        {...provided.dragHandleProps}
                                        src={iconUpAndDown}
                                        width={20}
                                        height={20}
                                        alt="arrowUpAndDown"
                                    ></Image>
                                    <Image
                                        className="mx-2 cursor-pointer"
                                        onClick={() => handleDelete(index)}
                                        src={trash}
                                        width={20}
                                        height={20}
                                        alt="deleteStep"
                                    ></Image>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Draggable>
        ));
    };

    return (
        <Wrapper
            socket={socket}
            title="Grobplanung"
            subtitle="Grobplanung des Ablaufs"
            description="Erstellt beliebig viele Etappen und legt für jede Etappe einen Zeitraum fest. Wichtig: Jede Phase braucht einen individuellen Namen (z.B. Gruppenarbeitsphase I, Gruppenarbeitsphase II). Die von euch festgelegten Etappen dienen euch als Struktur und Überblick. Ihr könnt sie dann optional in der Feinplanung detaillierter ausarbeiten."
            tooltip={{
                text: 'Ausführliche Informationen zur Etappenplanung und verschiedenen Typen und Modellen von VA findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material/left-bubble/Etappenplanung',
            }}
            methods={methods}
            // prevpage={prevpage}
            nextpage={
                `/ve-designer/step-data/${encodeURIComponent(
                    methods.getValues('stepNames')[0]?.name as string
                )}` || noStepPage
            }
            stageInMenu="steps"
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <Dialog
                isOpen={isImportStepsDialogOpen}
                title={'Etappen Import'}
                onClose={() => setIsImportStepsDialogOpen(false)}
            >
                <div className="w-[40vw]">
                    <ImportStepsDialog />
                </div>
            </Dialog>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="stepNames-items">
                    {(provided: DroppableProvided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {renderStepNamesInputs()}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div className="flex justify-center">
                <button
                    className="p-2 m-2 bg-white rounded-full shadow hover:bg-slate-50"
                    type="button"
                    title="Neue Etappe"
                    onClick={() => {
                        append(emptyStepData);
                    }}
                >
                    <RxPlus size={25} />
                </button>

                <button
                    className="px-4 m-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                    type="button"
                    title="Etappen importieren"
                    onClick={(e) => openStepsImportDialog()}
                >
                    Import
                </button>
            </div>
        </Wrapper>
    );
}
