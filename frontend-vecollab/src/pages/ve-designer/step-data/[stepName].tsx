import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Stage from '@/components/VE-designer/FinePlanner/Stage';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
    ISubmenuData,
    ISideProgressBarStateSteps,
} from '@/interfaces/ve-designer/sideProgressBar';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useGetAvailablePlans } from '@/lib/backend';
import Link from 'next/link';
import { MdArrowOutward } from 'react-icons/md';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { FineStepFormSchema } from '../../../zod-schemas/finestepSchema';
import { zodResolver } from '@hookform/resolvers/zod';

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
    learning_activity: string;
    has_tasks: boolean;
    tasks: ITaskFrontend[];
    original_plan: string;
}

export interface IFineStep {
    _id?: string;
    timestamp_from: string;
    timestamp_to: string;
    name: string;
    workload: number;
    learning_goal: string;
    learning_activity: string;
    has_tasks: boolean;
    tasks: ITask[];
    original_plan: string;
}

export const emptyTask: ITaskFrontend = {
    task_formulation: '',
    work_mode: '',
    notes: '',
    tools: [{ name: '' }, { name: '' }],
    materials: [{ name: '' }, { name: '' }],
};

export const defaultFormValueDataFineStepFrontend: IFineStepFrontend = {
    _id: '1111',
    timestamp_from: '',
    timestamp_to: '',
    name: '',
    workload: 0,
    learning_goal: '',
    learning_activity: '',
    has_tasks: false,
    tasks: [emptyTask],
    original_plan: '',
};

const areAllFormValuesEmpty = (formValues: IFineStepFrontend): boolean => {
    return (
        formValues.learning_activity === '' &&
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

interface Props {
    socket: Socket;
}

FinePlanner.auth = true;
export default function FinePlanner({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { data: session } = useSession();
    const { t } = useTranslation(['designer', 'common']); // designer is default ns

    const stepName: string = router.query.stepName as string;
    const methods = useForm<IFineStepFrontend>({
        mode: 'onChange',
        resolver: zodResolver(FineStepFormSchema),
        defaultValues: {
            ...defaultFormValueDataFineStepFrontend,
        },
    });
    const [prevpage, setPrevpage] = useState<string>('/ve-designer/step-data/');
    const [nextpage, setNextpage] = useState<string>('/ve-designer/step-data/');
    const [currentFineStep, setCurrentFineStep] = useState<IFineStepFrontend>({
        ...defaultFormValueDataFineStepFrontend,
    });

    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [sideMenuStepsData, setSideMenuStepsData] = useState<ISubmenuData[]>([]);
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const { data: availablePlans } = useGetAvailablePlans(session!.accessToken);

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            if (!plan.steps?.length) {
                return {};
            }
            let fineStepCopyTransformedTools = defaultFormValueDataFineStepFrontend;
            setSteps(plan.steps);
            const currentFineStepCopy: IFineStep | undefined = plan.steps.find(
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
                fineStepCopyTransformedTools = {
                    ...currentFineStepCopy,
                    tasks: transformedTasks,
                };
                setCurrentFineStep(fineStepCopyTransformedTools);
                setSideMenuStepsData(generateSideMenuStepsData(plan.steps));
                if (Object.keys(plan.progress).length) {
                    setSideMenuStepsProgress(plan.progress);
                }
            }

            return { ...fineStepCopyTransformedTools };
        },
        [stepName]
    );

    useEffect(() => {
        if (sideMenuStepsData.length !== 0) {
            const sideMenuStepsDataCopy: ISubmenuData[] = [...sideMenuStepsData];
            const currentSideMenuStepIndex: number = sideMenuStepsDataCopy.findIndex(
                // courseFormat generate Finestep methode rausnehmen
                (item: ISubmenuData): boolean => {
                    return item.id === encodeURIComponent(currentFineStep.name);
                } // with id (encode einfach)
            ); // -1 if not found

            setNextpage(
                currentSideMenuStepIndex < sideMenuStepsDataCopy.length - 1 &&
                    currentSideMenuStepIndex >= 0
                    ? sideMenuStepsDataCopy[currentSideMenuStepIndex + 1].link
                    : '/ve-designer/finish'
            );

            setPrevpage(
                currentSideMenuStepIndex > 0
                    ? sideMenuStepsDataCopy[currentSideMenuStepIndex - 1].link
                    : '/ve-designer/step-names'
            );
        }
    }, [sideMenuStepsData, currentFineStep]);

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
                      learning_activity: data.learning_activity,
                      has_tasks: data.has_tasks,
                      tasks: currentStepTransformBackTools,
                  }
                : step
        );

        const progressState = areAllFormValuesEmpty(data)
            ? ProgressState.notStarted
            : ProgressState.completed;

        const stepSlugEncoded = encodeURI(stepName as string);
        const updateStepsProgress = sideMenuStepsProgress.steps.map(
            (step: ISideProgressBarStateSteps) =>
                step[stepSlugEncoded] !== undefined ? { [stepSlugEncoded]: progressState } : step
        );

        return [
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
        ];
    };

    const generateSideMenuStepsData = (steps: IFineStep[]): ISubmenuData[] => {
        return steps.map((step: IFineStep) => ({
            id: encodeURIComponent(step.name),
            text: step.name,
            link: `/ve-designer/step-data/${encodeURIComponent(step.name)}`,
        }));
    };

    const originalPlan = availablePlans.find((a) => a._id == currentFineStep.original_plan);

    let description = (
        <>
            {currentFineStep.original_plan !== '' && (
                <p className="my-2">
                    <span className="font-bold">{t('step-data.imported_from')}</span>&nbsp;
                    {typeof originalPlan !== 'undefined' ? (
                        <Link className="group" href={`/plan/${originalPlan?._id}`} target="_blank">
                            {originalPlan?.name}
                            <MdArrowOutward className="hidden text-slate-500 group-hover:inline" />
                        </Link>
                    ) : (
                        <>{t('step-data.plan_no_longer_available')}</>
                    )}
                </p>
            )}
            <p className="text-xl text-slate-600">{t('step-data.fine_plan')}</p>
            <p className="mb-8">{t('step-data.description')}</p>
        </>
    );

    return (
        <Wrapper
            socket={socket}
            title={t('step-data.title', { name: currentFineStep.name })}
            description={description}
            tooltip={{
                text: t('step-data.tooltip_text'),
                link: '/learning-material/left-bubble/Etappenplanung',
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            stageInMenu="steps"
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <Stage fineStep={currentFineStep} />
        </Wrapper>
    );
}

export async function getServerSideProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'designer'])),
        },
    };
}
