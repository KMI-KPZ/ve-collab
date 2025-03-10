import React, { useCallback, useState } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { IFineStep } from '@/pages/ve-designer/step/[stepId]';
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
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepNamesFormSchema } from '../../zod-schemas/stepNamesSchema';
import CustomHead from '@/components/metaData/CustomHead';
import PlanIcon from '@/components/plans/PlanIcon';

interface FormValues {
    stepNames: IFineStep[];
}

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
    original_plan: undefined,
};

interface Props {
    socket: Socket;
}

StepNames.auth = true;
StepNames.noAuthPreview = <StepNamesNoAuthPreview />;
export default function StepNames({ socket }: Props): JSX.Element {
    const { data: session } = useSession();
    const { t } = useTranslation(['designer', 'common']); // designer is default ns

    const router = useRouter();
    const [steps, setSteps] = useState<IFineStep[]>([emptyStepData]);
    const [isImportStepsDialogOpen, setIsImportStepsDialogOpen] = useState<boolean>(false);

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const [loadingAvailPlans, setLoadingAvailPlans] = useState<boolean>(true);
    const [availPlans, setAvailPlans] = useState<IPlan[]>([]);

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(StepNamesFormSchema),
        // TODO may load default values only on first visit of a plan?!
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

    const { fields, append, remove, move, replace } = useFieldArray({
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
                    plan.steps?.map((_, i) =>
                        adjustTextareaSize(
                            document.querySelector(`textarea[name='stepNames.${i}.learning_goal']`)
                        )
                    );
                }, 1);
            }

            return data;
        },
        [replace]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const stepNames: IFineStep[] = data.stepNames;
        const stepNamesData = stepNames.map((step) => {
            if (step._id == '') step._id = undefined;

            const prevData = steps.find((fineStep) => fineStep._id === step._id);

            const payload: IFineStep =
                prevData !== undefined ? { ...prevData } : { ...emptyStepData };

            return { ...payload, ...step };
        });

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'steps',
                value: stepNamesData,
            },
        ];
    };

    const handleDelete = (index: number): void => {
        // if (fields.length > 1) {
        // } else {
        //     update(index, emptyStepData);
        // }
        remove(index);
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

    const ImportStepsDialog = () => {
        const [stepsToImport, setStepsToImport] = useState<IFineStep[]>([]);

        const toggleStepToImport = (plan: IPlan, step: IFineStep) => {
            if (stepsToImport.some((s) => s._id == step._id)) {
                setStepsToImport((prev) => prev.filter((s) => s._id != step._id));
            } else {
                setStepsToImport((prev) => [
                    ...prev,
                    {
                        ...step,
                        original_plan: !step.original_plan ? plan._id : step.original_plan,
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

        // show good practice plans if:
        //  - they have steps
        //  - they are not "read_only" OR I have write access
        const plans = availPlans.filter(
            (plan) =>
                plan.is_good_practise &&
                plan.steps.length &&
                plan._id != router.query.plannerId &&
                (!plan.is_good_practise_ro ||
                    plan.write_access.includes(session?.user.preferred_username as string))
        );

        if (loadingAvailPlans) return <LoadingAnimation />;
        if (!plans.length) return <>{t('step-names.no_good_practice_plans')}</>;

        // TODO add simple filter input?

        return (
            <div>
                <div className="flex flex-col max-h-96 overflow-y-auto content-scrollbar">
                    <div>{t('step-names.select_steps_to_import')}</div>

                    {plans
                        .sort((a, b) => {
                            return (
                                new Date(b.last_modified).getTime() -
                                new Date(a.last_modified).getTime()
                            );
                        })
                        .map((plan, i) => (
                            <div key={i}>
                                <div className="p-2 flex items-center gap-x-4 gap-y-6 rounded-md">
                                    <PlanIcon />
                                    <Link
                                        className="text-xl font-bold grow-0 group"
                                        href={`/plan/${plan._id}`}
                                        target="_blank"
                                    >
                                        {plan.name}
                                        <MdArrowOutward className="hidden text-slate-500 group-hover:inline" />
                                    </Link>
                                    {session?.user.preferred_username != plan.author.username && (
                                        <div className="text-sm text-gray-500">
                                            {t('step-names.by')} {plan.author.first_name}{' '}
                                            {plan.author.last_name}
                                        </div>
                                    )}
                                    <span
                                        className="grow text-right"
                                        title={t('step-names.last_modified')}
                                    >
                                        <Timestamp
                                            timestamp={plan.last_modified}
                                            className="text-sm"
                                        />
                                    </span>
                                </div>
                                {plan.steps.map((step, j) => (
                                    <div
                                        key={j}
                                        className="ml-10 hover:cursor-pointer flex"
                                        onClick={() => toggleStepToImport(plan, step)}
                                        title={t('step-names.add_remove')}
                                    >
                                        <input
                                            type="checkbox"
                                            className="mr-2"
                                            // BUGFIX: compare name and _id, because we had some finesteps with duplicated _ids ...
                                            checked={stepsToImport.some(
                                                (s) => s._id == step._id && s.name == step.name
                                            )}
                                            readOnly
                                        />
                                        {step.name} ({step.workload} h)
                                    </div>
                                ))}
                            </div>
                        ))}
                </div>
                <div className="ml-auto text-right pt-4">
                    <button
                        type="button"
                        className="py-2 px-5 mr-2 border border-ve-collab-orange rounded-lg cursor-pointer"
                        onClick={() => setIsImportStepsDialogOpen(false)}
                    >
                        {t('common:cancel')}
                    </button>
                    <ButtonPrimary label={t('common:import')} onClick={() => handleStepsImport()} />
                </div>
            </div>
        );
    };

    const adjustTextareaSize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = '0px';
        el.style.height = el.scrollHeight + 'px';
    };

    const renderStepNamesInputs = (): JSX.Element[] => {
        return fields.map((step, index) => (
            <Draggable key={`stepNames.${index}`} draggableId={`step-${index}`} index={index}>
                {(provided: DraggableProvided) => (
                    <div key={step.id} {...provided.draggableProps} ref={provided.innerRef}>
                        <div className="shadow-sm rounded-sm px-2 py-4 my-4">
                            <div className="flex justify-between items-center">
                                <div className="ml-6">
                                    <div className="flex flex-wrap gap-y-2 gap-x-2 items-center">
                                        <div>
                                            <label>{t('step-names.from')}</label>
                                            <input
                                                type="date"
                                                {...methods.register(
                                                    `stepNames.${index}.timestamp_from`,
                                                    {
                                                        deps: `stepNames.${index}.timestamp_to`,
                                                        onChange: (e) => {
                                                            if (
                                                                !methods.watch(
                                                                    `stepNames.${index}.timestamp_to`
                                                                )
                                                            ) {
                                                                const newDate = new Date(
                                                                    e.target.value
                                                                );
                                                                newDate.setDate(
                                                                    newDate.getDate() + 1
                                                                );
                                                                methods.setValue(
                                                                    `stepNames.${index}.timestamp_to`,
                                                                    newDate
                                                                        .toISOString()
                                                                        .split('T')[0]
                                                                );
                                                            }
                                                        },
                                                    }
                                                )}
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label>{t('step-names.to')}</label>
                                            <input
                                                type="date"
                                                {...methods.register(
                                                    `stepNames.${index}.timestamp_to`,
                                                    {
                                                        deps: `stepNames.${index}.timestamp_from`,
                                                    }
                                                )}
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label>{t('step-names.name')}</label>
                                            <input
                                                type="text"
                                                {...methods.register(`stepNames.${index}.name`)}
                                                placeholder={t('step-names.name_placeholder')}
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label>{t('step-names.time')}</label>
                                            <input
                                                type="number"
                                                min={0}
                                                {...methods.register(
                                                    `stepNames.${index}.workload`,
                                                    { valueAsNumber: true }
                                                )}
                                                placeholder={t('step-names.time_placeholder')}
                                                className="border border-gray-400 rounded-lg py-2 pl-2 mx-2 w-11"
                                            />
                                            <label className="mr-4">h</label>
                                        </div>
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <label>{t('step-names.learning_objectives')}</label>
                                        <textarea
                                            {...methods.register(
                                                `stepNames.${index}.learning_goal`
                                            )}
                                            rows={1}
                                            placeholder={t(
                                                'step-names.learning_objectives_placeholder'
                                            )}
                                            className="border border-gray-400 rounded-lg p-2 mx-2 grow"
                                            onChange={(e) => {
                                                adjustTextareaSize(e.currentTarget);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="hidden"
                                            {...methods.register(`stepNames.${index}._id`)}
                                        />
                                        <input
                                            type="hidden"
                                            {...methods.register(
                                                `stepNames.${index}.original_plan`
                                            )}
                                        />
                                    </div>
                                    {methods.formState.errors?.stepNames?.[index]
                                        ?.timestamp_from && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {t(
                                                methods.formState.errors?.stepNames?.[index]
                                                    ?.timestamp_from?.message!
                                            )}
                                        </p>
                                    )}
                                    {methods.formState.errors?.stepNames?.[index]?.timestamp_to && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {t(
                                                methods.formState.errors?.stepNames?.[index]
                                                    ?.timestamp_to?.message!
                                            )}
                                        </p>
                                    )}
                                    {methods.formState.errors?.stepNames?.[index]?.name && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {t(
                                                methods.formState.errors?.stepNames?.[index]?.name
                                                    ?.message!
                                            )}
                                        </p>
                                    )}
                                    {methods.formState.errors?.stepNames?.[index]?.workload && (
                                        <p className="text-red-600 pt-2 flex justify-center">
                                            {t(
                                                methods.formState.errors?.stepNames?.[index]
                                                    ?.workload?.message!
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center mr-6">
                                    <Image
                                        className="mx-2 cursor-grab"
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
        <>
            <CustomHead
                pageTitle={t('step-names.title')}
                pageSlug={'ve-designer/steps'}
                pageDescription={t('step-names.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('step-names.title')}
                subtitle={t('step-names.subtitle')}
                description={t('step-names.description')}
                tooltip={{
                    text: t('step-names.tooltip_text'),
                    link: '/learning-material/2/VA-Planung',
                }}
                methods={methods}
                nextpage={
                    methods.getValues('stepNames').length
                        ? `/ve-designer/step/1`
                        : `/ve-designer/finish`
                }
                stageInMenu="steps"
                idOfProgress="stepsGenerally"
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <Dialog
                    isOpen={isImportStepsDialogOpen}
                    title={t('step-names.import_phases')}
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
                        className="p-2 m-2 bg-white rounded-full shadow-sm cursor-pointer hover:bg-slate-50"
                        type="button"
                        title={t('step-names.new_phase')}
                        onClick={() => {
                            append(emptyStepData);
                        }}
                    >
                        <RxPlus size={25} />
                    </button>

                    <button
                        className="px-4 m-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue cursor-pointer hover:bg-ve-collab-blue/20"
                        type="button"
                        title={t('step-names.import_phases')}
                        onClick={() => openStepsImportDialog()}
                    >
                        {t('common:import')}
                    </button>
                </div>
            </Wrapper>
        </>
    );
}

export function StepNamesNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const methods = useForm<FormValues>({});

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('step-names.title')}
                pageSlug={'ve-designer/steps'}
                pageDescription={t('step-names.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('step-names.title')}
                subtitle={t('step-names.subtitle')}
                description={t('step-names.description')}
                tooltip={{
                    text: t('step-names.tooltip_text'),
                    link: '/learning-material/2/VA-Planung',
                }}
                methods={methods}
                nextpage={`/ve-designer/finish`}
                stageInMenu="steps"
                idOfProgress="stepsGenerally"
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview={true}
            >
                {Array(3)
                    .fill(null)
                    .map((_, index) => (
                        <div key={index} className="shadow-sm rounded-sm px-2 py-4 my-4">
                            <div className="flex justify-between items-center">
                                <div className="ml-6">
                                    <div className="flex flex-wrap gap-y-2 gap-x-2 items-center">
                                        <div>
                                            <label>{t('step-names.from')}</label>
                                            <input
                                                type="date"
                                                disabled
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label>{t('step-names.to')}</label>
                                            <input
                                                type="date"
                                                disabled
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label>{t('step-names.name')}</label>
                                            <input
                                                type="text"
                                                value={t(`common:no_auth.step${index + 1}`)}
                                                disabled
                                                placeholder={t('step-names.name_placeholder')}
                                                className="border border-gray-400 rounded-lg p-2 mx-2"
                                            />
                                        </div>
                                        <div>
                                            <label>{t('step-names.time')}</label>
                                            <input
                                                type="number"
                                                disabled
                                                placeholder={t('step-names.time_placeholder')}
                                                className="border border-gray-400 rounded-lg py-2 pl-2 mx-2 w-11"
                                            />
                                            <label className="mr-4">h</label>
                                        </div>
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <label>{t('step-names.learning_objectives')}</label>
                                        <textarea
                                            disabled
                                            rows={1}
                                            placeholder={t(
                                                'step-names.learning_objectives_placeholder'
                                            )}
                                            className="border border-gray-400 rounded-lg p-2 mx-2 grow"
                                            onChange={() => {}}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center mr-6">
                                    <Image
                                        className="mx-2"
                                        src={iconUpAndDown}
                                        width={20}
                                        height={20}
                                        alt="arrowUpAndDown"
                                    ></Image>
                                    <Image
                                        className="mx-2 cursor-pointer"
                                        onClick={() => {}}
                                        src={trash}
                                        width={20}
                                        height={20}
                                        alt="deleteStep"
                                    ></Image>
                                </div>
                            </div>
                        </div>
                    ))}

                <div className="flex justify-center">
                    <button
                        className="p-2 m-2 bg-white rounded-full shadow-sm hover:bg-slate-50"
                        type="button"
                        title={t('step-names.new_phase')}
                        onClick={() => {}}
                        disabled
                    >
                        <RxPlus size={25} />
                    </button>

                    <button
                        className="px-4 m-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                        type="button"
                        title={t('step-names.import_phases')}
                        onClick={() => {}}
                        disabled
                    >
                        {t('common:import')}
                    </button>
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-white/65 to-white pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'designer'])),
        },
    };
}
