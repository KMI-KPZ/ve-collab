import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { FormProvider, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ISideProgressBarStateSteps,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
    DroppableProvided,
    DraggableProvided,
} from '@hello-pangea/dnd';
import iconUpAndDown from '@/images/icons/startingWizard/upAndDownArrow.png';
import trash from '@/images/icons/startingWizard/trash.png';
import Image from 'next/image';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';
import SideProgressBarSectionBroadPlannerWithReactHookForm from '@/components/StartingWizard/SideProgressBarSectionBroadPlannerWithReactHookForm';
import PopupSaveData from '@/components/StartingWizard/PopupSaveData';

interface BroadStep {
    from: string;
    to: string;
    name: string;
}

interface FormValues {
    broadSteps: BroadStep[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.broadSteps.every((broadStep) => {
        return broadStep.name === '' && broadStep.from === '' && broadStep.to === '';
    });
};

export const defaultFineStepData: IFineStep = {
    name: '',
    workload: 0,
    timestamp_from: '',
    timestamp_to: '',
    learning_env: '',
    learning_goal: '',
    tasks: [
        {
            title: '',
            learning_goal: '',
            task_formulation: '',
            social_form: '',
            description: '',
            tools: ['', ''],
            media: ['', ''],
        },
    ],
    evaluation_tools: [],
    attachments: [],
    custom_attributes: {},
};

const emptyBroadStep: BroadStep = {
    from: '',
    to: '',
    name: '',
};

BroadPlanner.auth = true;
export default function BroadPlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([defaultFineStepData]);
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    const methods = useForm<FormValues>({
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
                    setSteps(data.plan.steps);
                    methods.setValue('broadSteps', [emptyBroadStep]);
                    if (data.plan.steps?.length > 0) {
                        const steps: IFineStep[] = data.plan.steps;
                        const broadSteps: BroadStep[] = steps.map((step) => {
                            const { timestamp_from, timestamp_to, name } = step;
                            return {
                                from: timestamp_from.split('T')[0], // react hook form only takes '2019-12-13'
                                to: timestamp_to.split('T')[0],
                                name: name,
                            };
                        });
                        methods.setValue('broadSteps', broadSteps);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router, methods]);

    const { fields, append, remove, move, update } = useFieldArray({
        name: 'broadSteps',
        control: methods.control,
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
        const sideMenuStateSteps: ISideProgressBarStateSteps[] = broadSteps.map((broadStep) => {
            return { [broadStep.name]: ProgressState.notStarted };
        });

        if (!areAllFormValuesEmpty(data)) {
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
                            value: {
                                ...sideMenuStepsProgress,
                                steps: sideMenuStateSteps,
                            },
                        },
                    ],
                },
                session?.accessToken
            );
        }
    };

    const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    const validateDateRange = (fromValue: string, indexFromTo: number) => {
        const fromDate = new Date(fromValue);
        const toDate = new Date(methods.watch(`broadSteps.${indexFromTo}.to`));
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

    const renderBroadStepsInputs = (): JSX.Element[] => {
        return fields.map((step, index) => (
            <Draggable key={`broadSteps.${index}`} draggableId={`step-${index}`} index={index}>
                {(provided: DraggableProvided) => (
                    <div key={step.id} {...provided.draggableProps} ref={provided.innerRef}>
                        <WhiteBox>
                            <div>
                                <div className="flex justify-center items-center">
                                    <label>von:</label>
                                    <input
                                        type="date"
                                        {...methods.register(`broadSteps.${index}.from`, {
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
                                        {...methods.register(`broadSteps.${index}.to`, {
                                            required: {
                                                value: true,
                                                message: 'Bitte fülle das Felde "bis" aus',
                                            },
                                        })}
                                        className="border border-gray-400 rounded-lg p-2 mx-2"
                                    />
                                    <input
                                        type="text"
                                        {...methods.register(`broadSteps.${index}.name`, {
                                            required: {
                                                value: true,
                                                message: 'Bitte fülle das Felde "Name" aus',
                                            },
                                            validate: {
                                                unique: () => {
                                                    return (
                                                        !checkIfNamesAreUnique(
                                                            methods.getValues('broadSteps')
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
                                {methods.formState.errors?.broadSteps?.[index]?.from && (
                                    <p className="text-red-600 pt-2 flex justify-center">
                                        {
                                            methods.formState.errors?.broadSteps?.[index]?.from
                                                ?.message
                                        }
                                    </p>
                                )}
                                {methods.formState.errors?.broadSteps?.[index]?.to && (
                                    <p className="text-red-600 pt-2 flex justify-center">
                                        {methods.formState.errors?.broadSteps?.[index]?.to?.message}
                                    </p>
                                )}
                                {methods.formState.errors?.broadSteps?.[index]?.name && (
                                    <p className="text-red-600 pt-2 flex justify-center">
                                        {
                                            methods.formState.errors?.broadSteps?.[index]?.name
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
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/startingWizard/generalInformation/formalConditions',
                        query: {
                            plannerId: router.query.plannerId,
                        },
                    });
                }}
                handleCancel={() => setIsPopupOpen(false)}
            />
            <div className="flex bg-pattern-left-blue-small bg-no-repeat">
                <div className="flex flex-grow justify-center">
                    <div className="flex flex-col">
                        <HeadProgressBarSection stage={1} linkFineStep={steps[0]?.name} />
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-between">
                                <div>
                                    <div className="flex justify-center">
                                        <div
                                            className={
                                                'text-center font-bold text-4xl mb-2 relative w-fit'
                                            }
                                        >
                                            Plane den groben Ablauf
                                            <Tooltip tooltipsText="Ausführliche Informationen zur Etappenplanung und verschiedenen Typen und Modellen von VA findest du hier in den Selbstlernmaterialien …">
                                                <Link target="_blank" href={'/learning-material/left-bubble/Etappenplanung'}>
                                                    <PiBookOpenText size={30} color="#00748f" />
                                                </Link>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className={'text-center mb-20'}>
                                        erstelle beliebig viele Etappen, setze deren Daten und
                                        vergib für jede einen individuellen Namen
                                    </div>
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        <Droppable droppableId="broadsteps-items">
                                            {(provided: DroppableProvided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {renderBroadStepsInputs()}
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
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit(
                                                async (data) => {
                                                    await combinedSubmitRouteAndUpdate(
                                                        data,
                                                        '/startingWizard/generalInformation/formalConditions'
                                                    );
                                                },
                                                async () => setIsPopupOpen(true)
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
                                                    `/startingWizard/fineplanner/${encodeURIComponent(
                                                        methods.watch('broadSteps')[0].name
                                                    )}`
                                                )
                                            )}
                                        >
                                            Weiter
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
                <SideProgressBarSectionBroadPlannerWithReactHookForm
                    progressState={sideMenuStepsProgress}
                    onSubmit={onSubmit}
                />
            </div>
        </FormProvider>
    );
}
