import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
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
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import SideProgressBarWithReactHookForm from '@/components/VE-designer/SideProgressBarWithReactHookForm';
import PopupSaveData from '@/components/VE-designer/PopupSaveData';
import Image from 'next/image';
import trash from '@/images/icons/ve-designer/trash.png';

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

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.targetGroups.every((targetGroup) => {
        return (
            targetGroup.name === '' &&
            targetGroup.age_min === '' &&
            targetGroup.age_max === '' &&
            targetGroup.experience === '' &&
            targetGroup.academic_course === '' &&
            targetGroup.mother_tongue === '' &&
            targetGroup.foreign_languages === ''
        );
    });
};

TargetGroups.auth = true;
export default function TargetGroups() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
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
                        methods.setValue('targetGroups', data.plan.audience);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router, methods]);

    const { fields, append, remove } = useFieldArray({
        name: 'targetGroups',
        control: methods.control,
    });

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (!areAllFormValuesEmpty(data)) {
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
        }
    };

    const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    const renderTargetGroupsInputs = (): JSX.Element[] => {
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
                                {...methods.register(`targetGroups.${index}.name`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?,-',
                                    },
                                })}
                                placeholder="Name eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.targetGroups?.[index]?.name?.message}
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
                                    type="number"
                                    {...methods.register(`targetGroups.${index}.age_min`, {
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
                                    className="border border-gray-400 rounded-lg w-1/2 p-2 mr-2"
                                />
                                <p className="text-red-600 pt-2">
                                    {
                                        methods.formState.errors?.targetGroups?.[index]?.age_min
                                            ?.message
                                    }
                                </p>
                            </div>
                            <div>
                                <input
                                    type="number"
                                    {...methods.register(`targetGroups.${index}.age_max`, {
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
                                    className="border border-gray-400 rounded-lg w-1/2 p-2 ml-2"
                                />
                                <p className="text-red-600 pt-2">
                                    {
                                        methods.formState.errors?.targetGroups?.[index]?.age_max
                                            ?.message
                                    }
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
                                {...methods.register(`targetGroups.${index}.experience`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?,-',
                                    },
                                })}
                                placeholder=" z.B. Sprachkenntnisse, bisherige Seminare zum Thema, etc."
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]?.experience
                                        ?.message
                                }
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
                                {...methods.register(`targetGroups.${index}.academic_course`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Studiengang eingeben, mehrere durch Komma trennen"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]?.academic_course
                                        ?.message
                                }
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
                                {...methods.register(`targetGroups.${index}.mother_tongue`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Erstsprachen eingeben, mehrere durch Komma trennen"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]?.mother_tongue
                                        ?.message
                                }
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
                                {...methods.register(`targetGroups.${index}.foreign_languages`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Weitere Sprachen eingeben, mehrere durch Komma trennen"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]
                                        ?.foreign_languages?.message
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end items-center">
                        <Image
                            className="mx-2 cursor-pointer m-2 "
                            onClick={() => remove(index)}
                            src={trash}
                            width={20}
                            height={20}
                            alt="deleteStep"
                        ></Image>
                    </div>
                </WhiteBox>
            </div>
        ));
    };
    return (
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/ve-designer/learning-goals',
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
                        <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-between">
                                <div>
                                    <div className={'text-center font-bold text-4xl mb-2'}>
                                        An welche Zielgruppen richtet sich der VE?
                                    </div>
                                    <div className={'text-center mb-20'}>optional</div>
                                    <div className="flex flex-wrap justify-center">
                                        {renderTargetGroupsInputs()}
                                    </div>
                                    <div className="flex justify-center">
                                        <button
                                            className="p-4 bg-white rounded-3xl shadow-2xl"
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
                                            <RxPlus size={30} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/ve-designer/participatingCourses'
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
                                            onClick={methods.handleSubmit(
                                                (data) => {
                                                    combinedSubmitRouteAndUpdate(
                                                        data,
                                                        '/ve-designer/learning-goals'
                                                    );
                                                },
                                                async () => setIsPopupOpen(true)
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
                <SideProgressBarWithReactHookForm
                    progressState={sideMenuStepsProgress}
                    onSubmit={onSubmit}
                />
            </div>
        </FormProvider>
    );
}
