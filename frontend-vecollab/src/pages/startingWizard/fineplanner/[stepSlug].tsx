import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { IStep, ITask } from '@/pages/startingWizard/finePlanner';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import LoadingAnimation from '@/components/LoadingAnimation';
import Stage2 from '@/components/StartingWizard/FinePlanner/Stage2';
import { SubmitHandler, useForm, FormProvider } from 'react-hook-form';
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

export const defaultFormValueDataFineStep: IFineStep = {
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
};

export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { stepSlug } = router.query;
    const { validateAndRoute } = useValidation();
    const methods = useForm<IFineStep>({
        mode: 'all',
        defaultValues: {
            ...defaultFormValueDataFineStep,
        },
    });

    const [fineStep, setFineStep] = useState<IFineStep>({
        ...defaultFormValueDataFineStep,
    });
    const [steps, setSteps] = useState<IStep[]>([
        {
            ...defaultFormValueDataFineStep,
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
        /*        if (!router.query.plannerId) {
            router.push('/overviewProjects');
            return;
        }*/

        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    if (data.plan.steps?.length > 0) {
                        setSteps(data.plan.steps);
                        const fineStepCopy: IFineStep | undefined = data.plan.steps.find(
                            (item: IStep) => item.name === stepSlug
                        );
                        if (fineStepCopy) {
                            setFineStep(fineStepCopy);
                            /*methods.setValue('fineStep', { ...fineStepCopy });*/
                            methods.reset({ ...fineStepCopy });
                        }
                    }
                }
            );
        }
    }, [session, status, router, stepSlug, methods]);

    const onSubmit: SubmitHandler<IFineStep> = async (data) => {
        const stepsWithoutCurrent = steps.filter((item: IStep) => item.name !== stepSlug);
        let stepCurrent: IFineStep = methods.getValues();
        console.log(data.tasks);
        await fetchPOST(
            '/planner/update_field',
            {
                plan_id: router.query.plannerId,
                field_name: 'steps',
                value: [
                    {
                        ...stepCurrent,
                        workload: data.workload,
                        social_form: data.social_form,
                        learning_env: data.learning_env,
                        ve_approach: data.ve_approach,
                        tasks: data.tasks,
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
                                                methods.formState.isValid
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
                                                methods.formState.isValid
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
