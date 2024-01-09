import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import WhiteBox from '@/components/Layout/WhiteBox';

interface FormValues {
    courseFormat: string;
    physicalMobility: boolean;
}

export function generateFineStepLinkTopMenu(fineSteps: IFineStep[]): string {
    if (fineSteps.length > 0) {
        fineSteps.sort((a: IFineStep, b: IFineStep) =>
            a.timestamp_from > b.timestamp_from ? 1 : -1
        );
        return `/startingWizard/fineplanner/${encodeURIComponent(fineSteps[0].name)}`;
    }
    return '/startingWizard/finePlanner';
}

export default function Realization() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [linkFineStepTopMenu, setLinkFineStepTopMenu] = useState<string>(
        '/startingWizard/finePlanner'
    );
    const { validateAndRoute } = useValidation();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    const {
        register,
        formState: { errors, isValid },
        handleSubmit,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            courseFormat: '',
        },
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
                    if (data.plan.realization !== null) {
                        setValue('courseFormat', data.plan.realization);
                    }

                    setLinkFineStepTopMenu(generateFineStepLinkTopMenu(data.plan.steps));

                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'realization',
                        value: data.courseFormat,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            realization: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={linkFineStepTopMenu} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="flex flex-col w-full p-12 max-w-screen-2xl items-center justify-start">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                In welchem Format / welchen Formaten wird der VE umgesetzt?
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="mx-7 mt-7 flex justify-center">
                                <select
                                    placeholder="Name eingeben"
                                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                    {...register('courseFormat')}
                                >
                                    <option value="synchron">synchron</option>
                                    <option value="asynchron">asynchron</option>
                                    <option value="asynchron und synchron ">
                                        asynchron und synchron{' '}
                                    </option>
                                </select>
                                <p className="text-red-600 pt-2">{errors?.courseFormat?.message}</p>
                            </div>
                        </div>
                        <h2 className="flex font-bold mt-16 "> Zusatzfrage: </h2>
                        <WhiteBox>
                            <div className="flex gap-y-6 p-12 items-center justify-start">
                                <p className="w-1/2">
                                    Wird der VE durch eine physische Mobilität ergänzt / begleitet?
                                </p>
                                <div className="flex w-1/2 gap-x-5">
                                    <div className="flex my-1">
                                        <div>
                                            <label className="px-2 py-2">Ja</label>
                                        </div>
                                        <div>
                                            <input
                                                {...register(`physicalMobility`)}
                                                type="radio"
                                                value="true"
                                                className="border border-gray-500 rounded-lg p-2"
                                            />
                                            <p className="text-red-600 pt-2">
                                                {errors.physicalMobility?.message}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex my-1">
                                        <div>
                                            <label className="px-2 py-2">Nein</label>
                                        </div>
                                        <div>
                                            <input
                                                {...register(`physicalMobility`)}
                                                type="radio"
                                                value="false"
                                                className="border border-gray-500 rounded-lg p-2"
                                            />
                                            <p className="text-red-600 pt-2">
                                                {errors.physicalMobility?.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </WhiteBox>
                        <div className="flex justify-around w-full mt-10">
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/generalInformation/questionNewContent',
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
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
                                            '/startingWizard/generalInformation/learningPlatform',
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
                                            isValid
                                        );
                                    }}
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={handleSubmit(onSubmit)}
                    isValid={isValid}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
