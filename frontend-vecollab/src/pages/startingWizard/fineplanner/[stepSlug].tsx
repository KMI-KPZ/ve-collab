import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { IStep, ITask } from '@/pages/startingWizard/finePlanner';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import LoadingAnimation from '@/components/LoadingAnimation';
import Stage2 from '@/components/StartingWizard/FinePlanner/Stage2';
import {
    SubmitHandler,
    useFieldArray,
    useForm,
    FormProvider,
    useFormContext,
} from 'react-hook-form';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';

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

interface FormValues {
    fineStep: IFineStep;
}

export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { stepSlug } = router.query;
    const { validateAndRoute } = useValidation();
    const methods = useForm({
        mode: 'all',
        defaultValues: {
            fineStep: {
                timestamp_from: '',
                timestamp_to: '',
                name: '',
                workload: 1,
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
        },
    });

    const [fineStep, setFineStep] = useState<IFineStep>({
        timestamp_from: '',
        timestamp_to: '',
        name: '',
        workload: 0,
        social_form: '',
        learning_env: '',
        ve_approach: '',
        evaluation_tools: [''],
        tasks: [{ title: '', description: '', learning_goal: '', tools: [''] }],
    });
    const [steps, setSteps] = useState<IStep[]>([
        {
            timestamp_from: '',
            timestamp_to: '',
            name: '',
            workload: 0,
            social_form: '',
            learning_env: '',
            ve_approach: '',
            evaluation_tools: [''],
            tasks: [{ title: '', description: '', learning_goal: '', tools: [''] }],
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
                    if (data.plan.steps?.length > 0) {
                        console.log('requestStep', data.plan.steps);
                        setSteps(data.plan.steps);
                        const fineStepCopy: IFineStep | undefined = data.plan.steps.find(
                            (item: IStep) => item.name === stepSlug
                        );
                        if (fineStepCopy) {
                            setFineStep(fineStepCopy);
                            setValue('fineStep', fineStepCopy);
                            console.log(watch('fineStep'));
                        }
                    }
                }
            );
        }
    }, [session, status, router, stepSlug]);

    const {
        register,
        formState: { errors, isValid },
        handleSubmit,
        control,
        watch,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
    });

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        const stepsWithoutCurrent = steps.filter((item: IStep) => item.name !== stepSlug);
        let stepCurrent = watch('fineStep');
        stepCurrent = { ...stepCurrent, workload: data.fineStep.workload };
        await fetchPOST(
            '/planner/update_field',
            {
                plan_id: router.query.plannerId,
                field_name: 'steps',
                value: [
                    {
                        ...stepCurrent,
                        workload: data.fineStep.workload,
                        social_form: data.fineStep.social_form,
                        learning_env: data.fineStep.learning_env,
                        ve_approach: data.fineStep.ve_approach,
                    },
                    ...stepsWithoutCurrent,
                ],
            },
            session?.accessToken
        );
    };

    return (
        <>
            <HeadProgressBarSection stage={2} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <FormProvider {...methods}>
                        <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                            <div>
                                <div className={'text-center font-bold text-4xl mb-2'}>
                                    Feinplanung
                                </div>
                                <div className={'text-center mb-20'}>
                                    erweitere die Informationen zu jeder Etappe
                                </div>
                                <Stage2 fineStep={fineStep} />
                            </div>
                            <div className="flex justify-around w-full">
                                <div>
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                        onClick={() => {
                                            validateAndRoute(
                                                '/startingWizard/broadPlanner',
                                                router.query.plannerId,
                                                methods.handleSubmit(onSubmit),
                                                isValid
                                            );
                                        }}
                                    >
                                        Zurück
                                    </button>
                                </div>
                                <div>
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                        onClick={() => {
                                            validateAndRoute(
                                                '/startingWizard/finish',
                                                router.query.plannerId,
                                                methods.handleSubmit(onSubmit),
                                                isValid
                                            );
                                        }}
                                    >
                                        Weiter
                                    </button>
                                </div>
                            </div>
                        </form>
                    </FormProvider>
                )}
                {/*<SideProgressBarSection progressState={sideMenuStepsProgress} />*/}
            </div>
        </>
    );
}
