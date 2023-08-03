import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';

interface FormValues {
    partners: IPartner[];
}

interface IPartner {
    name: string;
}

export default function Partners() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { validateAndRoute } = useValidation();

    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                signIn('keycloak');
            }
        }
    }, [session, status]);

    const {
        register,
        formState: { errors, isValid },
        handleSubmit,
        control,
        watch,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            partners: [{ name: '' }],
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
                        setValue('partners', data.plan.involved_parties);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const { fields, append, remove } = useFieldArray({
        name: 'partners',
        control,
    });

    const onSubmit: SubmitHandler<FormValues> = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'involved_parties',
                        value: watch('partners'),
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            involved_parties: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    const renderPartnersInputs = (): JSX.Element[] => {
        return fields.map((partner, index) => (
            <div key={partner.id}>
                <div className="mx-7 mt-7 justify-center">
                    <input
                        type="text"
                        placeholder="Name eingeben"
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                        {...register(`partners.${index}.name`, {
                            maxLength: {
                                value: 50,
                                message: 'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                            },
                            pattern: {
                                value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                message: 'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?-',
                            },
                        })}
                    />
                    <p className="text-red-600 pt-2">{errors?.partners?.[index]?.name?.message}</p>
                </div>
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
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Füge deine Partner hinzu
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            {renderPartnersInputs()}
                            <div className="mx-7 mt-2 flex justify-center">
                                <div className={'w-full flex px-2 justify-end'}>
                                    <button type="button" onClick={() => remove(fields.length - 1)}>
                                        <RxMinus size={20} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            append({
                                                name: '',
                                            });
                                        }}
                                    >
                                        <RxPlus size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/generalInformation/projectName',
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
                                            '/startingWizard/generalInformation/externalParties',
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
                />
            </div>
        </>
    );
}
