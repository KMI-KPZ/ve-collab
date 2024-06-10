import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Stage from '@/components/VE-designer/FinePlanner/Stage';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ISideProgressBarStateSteps,
    ProgressState,
    ISubmenuData,
} from '@/interfaces/ve-designer/sideProgressBar';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

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
    const router = useRouter();
    const { stepName } = router.query;
    const methods = useForm<IFineStepFrontend>({
        mode: 'onChange',
        defaultValues: {
            ...defaultFormValueDataFineStepFrontend,
        },
    });
    const [prevpage, setPrevpage] = useState<string>('/ve-designer/step-data/')
    const [nextpage, setNextpage] = useState<string>('/ve-designer/step-data/')
    const [currentFineStep, setCurrentFineStep] = useState<IFineStepFrontend>({
        ...defaultFormValueDataFineStepFrontend,
    });

    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [sideMenuStepsData, setSideMenuStepsData] = useState<ISubmenuData[]>([]);
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    const setPlanerData = useCallback((plan: IPlan) => {
        if (!plan.steps?.length) return

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
            const fineStepCopyTransformedTools: IFineStepFrontend = {
                ...currentFineStepCopy,
                tasks: transformedTasks,
            };
            setCurrentFineStep(fineStepCopyTransformedTools);
            methods.reset({ ...fineStepCopyTransformedTools });
            setSideMenuStepsData(generateSideMenuStepsData(plan.steps));
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress)
            }
        }
    },[methods, stepName]);

    useEffect(() => {
        const sideMenuStepsDataCopy: ISubmenuData[] = [...sideMenuStepsData];
        const currentSideMenuStepIndex: number = sideMenuStepsDataCopy.findIndex(
            // courseFormat generate Finestep methode rausnehmen
            (item: ISubmenuData): boolean => item.text === currentFineStep.name // with id (encode einfach)
        ); // -1 if not found

        setNextpage(
            currentSideMenuStepIndex < sideMenuStepsDataCopy.length - 1 &&
            currentSideMenuStepIndex >= 0
                ? sideMenuStepsDataCopy[currentSideMenuStepIndex + 1].link
                : '/ve-designer/finish'
        )

        setPrevpage(
            currentSideMenuStepIndex > 0
                ? sideMenuStepsDataCopy[currentSideMenuStepIndex - 1].link
                : '/ve-designer/step-names'
        )
    }, [sideMenuStepsData, currentFineStep])

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

        if (areAllFormValuesEmpty(data)) return

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
        ]
    };

    const generateSideMenuStepsData = (steps: IFineStep[]): ISubmenuData[] => {
        return steps.map((step: IFineStep) => ({
            id: encodeURIComponent(step.name),
            text: step.name,
            link: `/ve-designer/step-data/${encodeURIComponent(step.name)}`,
        }));
    };

    return (
        <Wrapper
            title={`Etappe: ${currentFineStep.name}`}
            subtitle='Beschreibung der Etappe'
            tooltip={{
                text: 'Mehr Aspekte der Feinplanung findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material/left-bubble/Etappenplanung'
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            stageInMenu='steps'
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <Stage fineStep={currentFineStep} />
        </Wrapper>
    );
}
