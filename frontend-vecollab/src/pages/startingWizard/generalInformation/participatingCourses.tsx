import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';

interface Lecture {
    name: string;
    lecture_type: string;
    lecture_format: string;
    participants_amount: string;
}

interface FormValues {
    lectures: Lecture[];
}

export default function Lectures() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
        formState: { errors },
        handleSubmit,
        control,
        watch,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            lectures: [
                {
                    name: '',
                    lecture_type: '',
                    lecture_format: '',
                    participants_amount: '',
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
                    if (data.plan.lectures.length !== 0) {
                        setValue('lectures', data.plan.lectures);
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const { fields, append, remove } = useFieldArray({
        name: 'lectures',
        control,
    });

    const onSubmit: SubmitHandler<FormValues> = async () => {
        await fetchPOST(
            '/planner/update_field',
            {
                plan_id: router.query.plannerId,
                field_name: 'lectures',
                value: watch('lectures'),
            },
            session?.accessToken
        );
        await router.push({
            pathname: '/startingWizard/generalInformation/targetGroups',
            query: { plannerId: router.query.plannerId },
        });
    };

    const renderLecturesInputs = (): JSX.Element[] => {
        return fields.map((lecture, index) => (
            <div key={lecture.id} className="mx-2">
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
                                {...register(`lectures.${index}.name`, {
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
                                {errors?.lectures?.[index]?.name?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="type" className="px-2 py-2">
                                Typ
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...register(`lectures.${index}.lecture_type`, {
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
                                placeholder="z.B. Wahl, Wahlpflicht, Pflicht"
                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.lectures?.[index]?.lecture_type?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="format" className="px-2 py-2">
                                Format
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...register(`lectures.${index}.lecture_format`, {
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
                                placeholder="z.B. online, hybrid, präsenz"
                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.lectures?.[index]?.lecture_format?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/2 flex items-center">
                            <label htmlFor="participants" className="px-2 py-2">
                                Teilnehmendenanzahl
                            </label>
                        </div>
                        <div className="w-1/2">
                            <input
                                type="number"
                                {...register(`lectures.${index}.participants_amount`, {
                                    maxLength: {
                                        value: 4,
                                        message: 'Bitte geben sie eine realistische Zahl ein',
                                    },
                                    pattern: {
                                        value: /^\d+$/,
                                        message: 'Bitte nur ganze postive Zahlen',
                                    },
                                })}
                                placeholder="Anzahl eingeben"
                                className="border border-gray-500 rounded-lg w-full h-12 p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {errors?.lectures?.[index]?.participants_amount?.message}
                            </p>
                        </div>
                    </div>
                </WhiteBox>
            </div>
        ));
    };
    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                    >
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Beschreibe die teilnehmenden Lehrveranstaltungen
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="flex flex-wrap justify-center">
                                {renderLecturesInputs()}
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
                                            lecture_type: '',
                                            lecture_format: '',
                                            participants_amount: '',
                                        });
                                    }}
                                >
                                    <RxPlus size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/institutions',
                                        query: { plannerId: router.query.plannerId },
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    >
                                        Zurück
                                    </button>
                                </Link>
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection />
            </div>
        </>
    );
}
