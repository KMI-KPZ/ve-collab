import WhiteBox from '@/components/Layout/WhiteBox';
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
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

interface StepName {
    from: string;
    to: string;
    name: string;
}

interface FormValues {
    stepNames: StepName[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.stepNames.every((broadStep) => {
        return broadStep.name === '' && broadStep.from === '' && broadStep.to === '';
    });
};

export const defaultFineStepData: IFineStep = {
    name: '',
    workload: 0,
    timestamp_from: '',
    timestamp_to: '',
    learning_goal: '',
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

StepNames.auth = true;
export default function StepNames() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([defaultFineStepData]);
    const prevpage = '/ve-designer/checklist'
    const [nextpage, setNextpage] = useState<string>('/ve-designer/step-data/');

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            stepNames: [
                { from: '', to: '', name: 'Kennenlernen' },
                { from: '', to: '', name: 'Evaluation' },
            ],
        }
    });

    useEffect(() => {
        const subs = methods.watch((value, {name}) => {
            setNextpage(prev => `/ve-designer/step-data/${encodeURIComponent(
                (value && value.stepNames)
                    ? value.stepNames[0]?.name as string
                    : prev
            )}`)
        })
        return () => subs.unsubscribe()
    }, [methods]);


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
            methods.setValue('stepNames', stepNames);

            setNextpage(prev => `/ve-designer/step-data/${encodeURIComponent(
                steps[0].name
            )}`)
        }
    }, [methods]);

    const { fields, append, remove, move, update } = useFieldArray({
        name: 'stepNames',
        control: methods.control,
    });

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

        if (areAllFormValuesEmpty(data)) return

        // setNextpage(prev => `/ve-designer/step-data/${encodeURIComponent(
        //     methods.watch('stepNames')[0].name
        // )}`)
        // await new Promise(res => setTimeout(res, 5000));

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
        ]
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
                        <WhiteBox>
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
                        </WhiteBox>
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
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            setProgress={setSideMenuStepsProgress}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="flex justify-center">
                <div
                    className={
                        'text-center font-bold text-4xl mb-2 relative w-fit'
                    }
                >
                    Grobplanung des Ablaufs
                    <Tooltip tooltipsText="Ausführliche Informationen zur Etappenplanung und verschiedenen Typen und Modellen von VA findest du hier in den Selbstlernmaterialien …">
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
                Erstellt beliebig viele Etappen und legt für jede Etappe
                einen Zeitraum fest. Wichtig: Jede Phase braucht einen
                individuellen Namen (z.B. Kennenlernphase I, Kennenlernphase
                II).
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="stepNames-items">
                    {(provided: DroppableProvided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {renderStepNamesInputs()}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div className="flex justify-center">
                <button
                    className="p-4 bg-white rounded-3xl shadow-2xl"
                    type="button"
                    onClick={() => {
                        append({
                            from: '',
                            to: '',
                            name: '',
                        });
                    }}
                >
                    <RxPlus size={30} />
                </button>
            </div>
        </Wrapper>
    );
}
