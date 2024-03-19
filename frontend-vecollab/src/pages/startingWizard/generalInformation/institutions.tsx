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
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import SideProgressBarSectionBroadPlannerWithReactHookForm from '@/components/StartingWizard/SideProgressBarSectionBroadPlannerWithReactHookForm';
import PopupSaveData from '@/components/StartingWizard/PopupSaveData';
import trash from '@/images/icons/startingWizard/trash.png';
import Image from 'next/image';

export interface Institution {
    name: string;
    school_type: string;
    country: string;
    departments: string[];
    academic_courses: string[];
}

interface FormValues {
    institutions: Institution[];
}

export default function Institutions() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
    const [steps, setSteps] = useState<IFineStep[]>([]);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                signIn('keycloak');
            }
        }
    }, [session, status]);

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            institutions: [
                {
                    name: '',
                    school_type: '',
                    country: '',
                    departments: [],
                    academic_courses: [],
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
                    if (data.plan.institutions.length !== 0) {
                        methods.setValue('institutions', data.plan.institutions);
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
        name: 'institutions',
        control: methods.control,
    });

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'institutions',
                        value: data.institutions,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            institutions: ProgressState.completed,
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

    const renderInstitutionsInputs = (): JSX.Element[] => {
        return fields.map((institution, index) => (
            <div key={institution.id} className="mx-2">
                <WhiteBox>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="name" className="px-2 py-2">
                                Name
                            </label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                placeholder="Name eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                                {...methods.register(`institutions.${index}.name`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?-,',
                                    },
                                })}
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.institutions?.[index]?.name?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="schoolType" className="px-2 py-2">
                                Bildungseinrichtung
                            </label>
                        </div>
                        <div className="w-2/3">
                            <select
                                placeholder="Bildungseinrichtung eingeben"
                                className="border border-gray-400 rounded-lg w-full px-1 py-2"
                                {...methods.register(`institutions.${index}.school_type`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                })}
                            >
                                <option value="Hochschule/Universität/College">
                                    Hochschule/Universität/College
                                </option>
                                <option value="Fachhochschule/University of Applied Sciences">
                                    Fachhochschule/University of Applied Sciences
                                </option>
                                <option value="Berufsschule">Berufsschule</option>
                                <option value="Schule – Primärbereich">
                                    Schule – Primärbereich
                                </option>
                                <option value="Schule – Sekundarbereich">
                                    Schule – Sekundarbereich
                                </option>

                                <option value="Sonstige">Sonstige</option>
                            </select>
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.institutions?.[index]?.school_type
                                        ?.message
                                }
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="country" className="px-2 py-2">
                                Land
                            </label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                placeholder="Land eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                                {...methods.register(`institutions.${index}.country`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?,-',
                                    },
                                })}
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.institutions?.[index]?.country?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="department" className="px-2 py-2">
                                Fachbereich
                            </label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                placeholder="Fachbereich eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                                {...methods.register(`institutions.${index}.departments.0`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?,-',
                                    },
                                })}
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.institutions?.[index]
                                        ?.departments?.[0]?.message
                                }
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="academicCourses" className="px-2 py-2">
                                beteiligte Studiengänge
                            </label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                placeholder="mehrere durch Komma trennen"
                                className="border border-gray-400 rounded-lg w-full p-2"
                                {...methods.register(`institutions.${index}.academic_courses.0`, {
                                    maxLength: {
                                        value: 50,
                                        message:
                                            'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?,-',
                                    },
                                })}
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.institutions?.[index]
                                        ?.academic_courses?.[0]?.message
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
                        <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <form className="gap-y-6 w-full p-12 max-w-7xl items-center flex flex-col flex-grow justify-between">
                                <div>
                                    <div className={'text-center font-bold text-4xl mb-2'}>
                                        In welchen Institutionen wird der VE umgesetzt?
                                    </div>
                                    <div className={'text-center mb-20'}>optional</div>
                                    <div className={'flex flex-wrap justify-center'}>
                                        {renderInstitutionsInputs()}
                                    </div>
                                    <div className="flex justify-center">
                                        <button
                                            className="p-4 bg-white rounded-3xl shadow-2xl"
                                            type="button"
                                            onClick={() => {
                                                append({
                                                    name: '',
                                                    school_type: '',
                                                    country: '',
                                                    departments: [],
                                                    academic_courses: [],
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
                                                (data) => {
                                                    combinedSubmitRouteAndUpdate(
                                                        data,
                                                        '/startingWizard/generalInformation/externalParties'
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
                                                    '/startingWizard/generalInformation/participatingCourses'
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
