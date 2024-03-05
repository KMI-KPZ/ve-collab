import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';

export interface TargetGroup {
    name: string;
    age_min: string;
    age_max: string;
    experience: string;
    academic_course: string;
    mother_tongue: string;
    foreign_languages: string;
}

interface FormValues {
    targetGroups: TargetGroup[];
}

export default function TargetGroups() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);

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
        control,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            targetGroups: [
                {
                    name: '',
                    age_min: '',
                    age_max: '',
                    experience: '',
                    academic_course: '',
                    mother_tongue: '',
                    foreign_languages: '',
                },
            ],
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
                    if (data.plan.audience.length !== 0) {
                        setValue('targetGroups', data.plan.audience);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router, setValue]);

    const { fields, append, remove } = useFieldArray({
        name: 'targetGroups',
        control,
    });

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'audience',
                        value: data.targetGroups,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            audience: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    const rendertargetGroupsInputs = (): JSX.Element[] => {
        return fields.map((targetGroup, index) => (
            <div key={targetGroup.id} className="mx-2">
                <WhiteBox>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="name" className="px-2 py-2">
                                Name
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...register(`targetGroups.${index}.name`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.targetGroups?.[index]?.name?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="age" className="px-2 py-2">
                                Alter
                            </label>
                        </div>
                        <div className="w-3/4 flex">
                            <div>
                                <input
                                    type="text"
                                    {...register(`targetGroups.${index}.age_min`, {
                                        maxLength: {
                                            value: 4,
                                            message: 'Bitte geben sie eine realistische Zahl ein',
                                        },
                                        pattern: {
                                            value: /^\d+$/,
                                            message: 'Bitte nur ganze postive Zahlen',
                                        },
                                    })}
                                    placeholder="von"
                                    className="border border-gray-500 rounded-lg w-1/2 h-12 p-2 mr-2"
                                />
                                <p className="text-red-600 pt-2">
                                    {errors?.targetGroups?.[index]?.age_min?.message}
                                </p>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    {...register(`targetGroups.${index}.age_max`, {
                                        maxLength: {
                                            value: 4,
                                            message: 'Bitte geben sie eine realistische Zahl ein',
                                        },
                                        pattern: {
                                            value: /^\d+$/,
                                            message: 'Bitte nur ganze postive Zahlen',
                                        },
                                    })}
                                    placeholder="bis"
                                    className="border border-gray-500 rounded-lg w-1/2 h-12 p-2 ml-2"
                                />
                                <p className="text-red-600 pt-2">
                                    {errors?.targetGroups?.[index]?.age_max?.message}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="experience" className="px-2 py-2">
                                VE-Projektrelevante Erfahrungen
                            </label>
                        </div>
                        <div className="w-3/4">
                            <textarea
                                rows={3}
                                {...register(`targetGroups.${index}.experience`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder=" z.B. Sprachkenntnisse, bisherige Seminare zum Thema, etc."
                                className="border border-gray-500 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.targetGroups?.[index]?.experience?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="academic_course" className="px-2 py-2">
                                Studiengang
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...register(`targetGroups.${index}.academic_course`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Studiengang eingeben, mehrere durch Komma trennen"
                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.targetGroups?.[index]?.academic_course?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="motherTongue" className="px-2 py-2">
                                Erstsprachen
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...register(`targetGroups.${index}.mother_tongue`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                })}
                                placeholder="Erstsprachen eingeben, mehrere durch Komma trennen"
                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.targetGroups?.[index]?.mother_tongue?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="foreignLanguages" className="px-2 py-2">
                                Weitere Sprachen
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...register(`targetGroups.${index}.foreign_languages`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Weitere Sprachen eingeben, mehrere durch Komma trennen"
                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.targetGroups?.[index]?.foreign_languages?.message}
                            </p>
                        </div>
                    </div>
                </WhiteBox>
            </div>
        ));
    };
    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                An welche Zielgruppen richtet sich der VE?
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="flex flex-wrap justify-center">
                                {rendertargetGroupsInputs()}
                            </div>
                            <div className={'mx-2 flex justify-end'}>
                                <button type="button" onClick={() => remove(fields.length - 1)}>
                                    <RxMinus size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        append({
                                            name: '',
                                            age_min: '',
                                            age_max: '',
                                            experience: '',
                                            academic_course: '',
                                            mother_tongue: '',
                                            foreign_languages: '',
                                        });
                                    }}
                                >
                                    <RxPlus size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={handleSubmit((data) =>
                                        combinedSubmitRouteAndUpdate(
                                            data,
                                            '/startingWizard/generalInformation/globalGoals'
                                        )
                                    )}
                                >
                                    Zurück
                                </button>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={handleSubmit((data) =>
                                        combinedSubmitRouteAndUpdate(
                                            data,
                                            '/startingWizard/generalInformation/veTopic'
                                        )
                                    )}
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
