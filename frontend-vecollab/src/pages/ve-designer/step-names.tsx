import React, { useCallback, useEffect, useState } from 'react';
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

interface StepName {
    from: string;
    to: string;
    name: string;
}

interface FormValues {
    stepNames: StepName[];
}

const areAllFormValuesEmpty = (stepNames: StepName[]): boolean => {
    return stepNames.every((broadStep) => {
        return broadStep.name === '' && broadStep.from === '' && broadStep.to === '';
    });
};

export const defaultFineStepData: IFineStep = {
    name: '',
    workload: 0,
    timestamp_from: '',
    timestamp_to: '',
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
    evaluation_tools: [],
    attachments: [],
    custom_attributes: {},
};

const emptyBroadStep: StepName = {
    from: '',
    to: '',
    name: '',
};

interface Props {
    socket: Socket;
}

StepNames.auth = true;
export default function StepNames({ socket }: Props): JSX.Element {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([defaultFineStepData]);
    const noStepPage = '/ve-designer/no-step';
    // const prevpage = '/ve-designer/checklist'
    const [nextpage, setNextpage] = useState<string>('/ve-designer/no-step');

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            stepNames: [
                { from: '', to: '', name: 'Kennenlernen' },
                { from: '', to: '', name: 'Evaluation' },
            ],
        },
    });

    useEffect(() => {
        const subs = methods.watch((value, { name }) => {
            setNextpage((prev) => {
                if (!value || !value.stepNames || !value.stepNames.length) {
                    return noStepPage;
                }
                if (!methods.formState.isValid) {
                    return noStepPage;
                }
                return `/ve-designer/step-data/${encodeURIComponent(
                    value.stepNames[0]?.name as string
                )}`;
            });
        });
        return () => subs.unsubscribe();
    }, [methods]);

    const { fields, append, remove, move, update, replace } = useFieldArray({
        name: 'stepNames',
        control: methods.control,
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        if (plan.steps?.length > 0) {
            const steps: IFineStep[] = plan.steps;
            const stepNames: StepName[] = steps.map((step) => {
                const { timestamp_from, timestamp_to, name } = step;
                return {
                    from: timestamp_from.split('T')[0], // react hook form only takes '2019-12-13'
                    to: timestamp_to.split('T')[0],
                    name: name,
                };
            });
            replace(stepNames) // PROBLEM isDirty is initially true
            // methods.resetField("stepNames", {defaultValue: stepNames}) // PROBLEM: does not trigger isDirty if I just rename a step ...

            setSteps(plan.steps)
            setNextpage(prev => `/ve-designer/step-data/${encodeURIComponent(
                steps[0].name
            )}`)
        } else {
            setNextpage(prev => `/ve-designer/no-step`)
        }
        if (Object.keys(plan.progress).length) {
            setSideMenuStepsProgress(plan.progress)
        }
    }, [replace]);

    const checkIfNamesAreUnique = (stepNames: StepName[]): boolean => {
        const stepNamesNames = stepNames.map((stepName) => stepName.name);
        return new Set(stepNamesNames).size !== stepNames.length;
    };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const stepNames: StepName[] = data.stepNames;
        let payload: IFineStep = {
            ...defaultFineStepData,
        };
        const stepNamesData = stepNames.map((broadStep) => {
            // TODO ids lieber vergleichen
            const fineStepBackend = steps.find((fineStep) => fineStep.name === broadStep.name);
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
        const sideMenuStateSteps: ISideProgressBarStateSteps[] = stepNames.map((broadStep) => {
            return { [broadStep.name]: ProgressState.notStarted };
        });

        if (areAllFormValuesEmpty(data.stepNames)) return;

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
                    steps: sideMenuStateSteps,
                },
            },
        ];
    };

    const validateDateRange = (fromValue: string, indexFromTo: number) => {
        const fromDate = new Date(fromValue);
        const toDate = new Date(methods.watch(`stepNames.${indexFromTo}.to`));
        if (fromDate > toDate) {
            return 'Das Startdatum muss vor dem Enddatum liegen';
        } else {
            return true;
        }
    };

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, emptyBroadStep);
        }
    };

    const renderStepNamesInputs = (): JSX.Element[] => {
        return fields.map((step, index) => (
            <Draggable key={`stepNames.${index}`} draggableId={`step-${index}`} index={index}>
                {(provided: DraggableProvided) => (
                    <div key={step.id} {...provided.draggableProps} ref={provided.innerRef}>
                        <div className="shadow rounded px-2 py-4 my-4">
                            <div>
                                <div className="flex justify-center items-center">
                                    <label>von:</label>
                                    <input
                                        type="date"
                                        {...methods.register(`stepNames.${index}.from`, {
                                            required: {
                                                value: true,
                                                message: 'Bitte fülle das Felde "von" aus',
                                            },
                                            validate: (v) => validateDateRange(v, index),
                                        })}
                                        className="border border-gray-400 rounded-lg p-2 mx-2"
                                    />
                                    <label>bis:</label>
                                    <input
                                        type="date"
                                        {...methods.register(`stepNames.${index}.to`, {
                                            required: {
                                                value: true,
                                                message: 'Bitte fülle das Felde "bis" aus',
                                            },
                                        })}
                                        className="border border-gray-400 rounded-lg p-2 mx-2"
                                    />
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
                                                        ) || 'Bitte wähle einen einzigartigen Namen'
                                                    );
                                                },
                                            },
                                        })}
                                        placeholder="Name, z.B. Kennenlernphase"
                                        className="border border-gray-400 rounded-lg p-2 mx-2"
                                    />
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
                                {methods.formState.errors?.stepNames?.[index]?.from && (
                                    <p className="text-red-600 pt-2 flex justify-center">
                                        {
                                            methods.formState.errors?.stepNames?.[index]?.from
                                                ?.message
                                        }
                                    </p>
                                )}
                                {methods.formState.errors?.stepNames?.[index]?.to && (
                                    <p className="text-red-600 pt-2 flex justify-center">
                                        {methods.formState.errors?.stepNames?.[index]?.to?.message}
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
                            </div>
                        </div>
                    </div>
                )}
            </Draggable>
        ));
    };

    const onDragEnd = (result: DropResult): void => {
        if (result.destination) {
            move(result.source.index, result.destination.index);
        }
    };

    return (
        <Wrapper
            socket={socket}
            title="Grobplanung"
            subtitle="Grobplanung der Etappen"
            tooltip={{
                text: 'Ausführliche Informationen zur Etappenplanung und verschiedenen Typen und Modellen von VA findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material/left-bubble/Etappenplanung',
            }}
            methods={methods}
            // prevpage={prevpage}
            nextpage={nextpage}
            stageInMenu="steps"
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className={'mb-4'}>
                Erstellt beliebig viele Etappen und legt für jede Etappe einen Zeitraum fest.
                Wichtig: Jede Phase braucht einen individuellen Namen (z.B. Kennenlernphase I,
                Kennenlernphase II).
            </div>
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
                    className="p-2 m-2 bg-white rounded-full shadow"
                    type="button"
                    onClick={() => {
                        append({
                            from: '',
                            to: '',
                            name: '',
                        });
                    }}
                >
                    <RxPlus size={25} />
                </button>
            </div>
        </Wrapper>
    );
}
