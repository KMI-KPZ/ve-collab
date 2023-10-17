import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { fetchGET, fetchPOST } from '@/lib/backend';
import LoadingAnimation from '@/components/LoadingAnimation';

interface ExternalParty {
    externalParty: string;
}

interface FormValues {
    externalParties: ExternalParty[];
}

export default function ExternalPersons() {
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
            externalParties: [{ externalParty: '' }],
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
                    if (data.plan.involved_parties.length !== 0) {
                        setValue(
                            'externalParties',
                            data.plan.involved_parties.map((element: string) => ({
                                externalParty: element,
                            }))
                        );
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const { fields, append, remove } = useFieldArray({
        name: 'externalParties',
        control,
    });

    const onSubmit: SubmitHandler<FormValues> = async () => {
        await fetchPOST(
            '/planner/update_field',
            {
                plan_id: router.query.plannerId,
                field_name: 'involved_parties',
                value: watch('externalParties').map((element) => element.externalParty),
            },
            session?.accessToken
        );
        await router.push({
            pathname: '/startingWizard/generalInformation/institutions',
            query: { plannerId: router.query.plannerId },
        });
    };

    const renderExternalPartiesInputs = (): JSX.Element[] => {
        return fields.map((externalParty, index) => (
            <div key={externalParty.id} className="mx-7 mt-7 flex flex-col justify-center">
                <input
                    type="text"
                    placeholder="Externen eingeben"
                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                    {...register(`externalParties.${index}.externalParty`, {
                        maxLength: {
                            value: 50,
                            message: 'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                        },
                        pattern: {
                            value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                            message: 'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                        },
                    })}
                />
                <p className="text-red-600 pt-2">
                    {errors?.externalParties?.[index]?.externalParty?.message}
                </p>
            </div>
        ));
    };

    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={linkFineStepTopMenu} />
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
                                Gibt es externe Beteiligte?
                            </div>
                            <div className={'text-center mb-20'}>
                                optional, falls ja, benenne diese, ansonsten einfach weiter
                            </div>
                            {renderExternalPartiesInputs()}
                            <div className={'w-3/4 mx-7 mt-3 flex justify-end'}>
                                <button type="button" onClick={() => remove(fields.length - 1)}>
                                    <RxMinus size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        append({
                                            externalParty: '',
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
                                        pathname: '/startingWizard/generalInformation/partners',
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
