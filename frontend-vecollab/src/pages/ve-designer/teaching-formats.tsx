import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import WhiteBox from '@/components/Layout/WhiteBox';
import Link from 'next/link';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { Tooltip } from '@/components/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import { Controller, FormProvider, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import PopupSaveData from '@/components/VE-designer/PopupSaveData';
import SideProgressBarWithReactHookForm from '@/components/VE-designer/SideProgressBarWithReactHookForm';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

export interface FormValues {
    courseFormat: string;
    usePhysicalMobility: boolean;
    physicalMobilities: PhysicalMobility[];
}

export interface PhysicalMobility {
    location: string;
    timestamp_from: string;
    timestamp_to: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return (
        formValues.courseFormat === '' &&
        formValues.physicalMobilities.every((mobility) => {
            return (
                mobility.location === '' &&
                mobility.timestamp_from === '' &&
                mobility.timestamp_to === ''
            );
        })
    );
};

Realization.auth = true;
export default function Realization() {
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
            courseFormat: '',
            usePhysicalMobility: false,
            physicalMobilities: [{ location: '', timestamp_from: '', timestamp_to: '' }],
        },
    });

    const { fields, append, remove, update } = useFieldArray({
        name: 'physicalMobilities',
        control: methods.control,
    });

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/plans');
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data: { plan: IPlan }) => {
                    if (data.plan !== undefined) {
                        setLoading(false);
                        if (data.plan.realization !== null) {
                            methods.setValue('courseFormat', data.plan.realization);
                        }
                        if (data.plan.physical_mobility !== null) {
                            methods.setValue('usePhysicalMobility', data.plan.physical_mobility);
                        }
                        if (
                            data.plan.physical_mobilities !== null &&
                            data.plan.physical_mobilities.length !== 0
                        ) {
                            const physical_mobilities: PhysicalMobility[] =
                                data.plan.physical_mobilities.map(
                                    (physicalMobility: PhysicalMobility) => {
                                        const { timestamp_from, timestamp_to, location } =
                                            physicalMobility;
                                        return {
                                            location: location,
                                            timestamp_from:
                                                timestamp_from !== null
                                                    ? timestamp_from.split('T')[0]
                                                    : '', // react hook form only takes '2019-12-13'
                                            timestamp_to:
                                                timestamp_to !== null
                                                    ? timestamp_to.split('T')[0]
                                                    : '',
                                        };
                                    }
                                );
                            methods.setValue('physicalMobilities', physical_mobilities);
                        }

                        setSteps(data.plan.steps);

                        if (data.plan.progress) {
                            setSideMenuStepsProgress(data.plan.progress);
                        }
                    }
                }
            );
        }
    }, [session, status, router, methods]);

    const validateDateRange = (fromValue: string, indexFromTo: number) => {
        const toValue = methods.watch(`physicalMobilities.${indexFromTo}.timestamp_to`);
        if (fromValue === '' || toValue === '') return true;
        return new Date(fromValue) > new Date(toValue)
            ? 'Das Startdatum muss vor dem Enddatum liegen'
            : true;
    };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (!areAllFormValuesEmpty(data)) {
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
                            field_name: 'physical_mobility',
                            value: data.usePhysicalMobility,
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'physical_mobilities',
                            value: data.physicalMobilities,
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
        }
    };

    const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, { location: '', timestamp_from: '', timestamp_to: '' });
        }
    };

    const renderMobilitiesInputs = (): JSX.Element[] => {
        return fields.map((mobility, index) => (
            <div key={mobility.id} className="flex py-4 w-full ">
                <div className="w-full">
                    <div className="flex items-center justify-start pb-2">
                        <p className="mr-4">Ort:</p>
                        <input
                            type="text"
                            placeholder="Ort eingeben"
                            className="border border-gray-400 rounded-lg p-2 w-full"
                            {...methods.register(`physicalMobilities.${index}.location`, {
                                maxLength: {
                                    value: 500,
                                    message:
                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                },
                            })}
                        />
                    </div>
                    <p className="flex justify-center text-red-600 pb-2">
                        {methods.formState.errors?.physicalMobilities?.[index]?.location?.message}
                    </p>
                    <div className="flex justify-between">
                        <div className="flex items-center">
                            <p className="mr-4">von:</p>
                            <input
                                type="date"
                                {...methods.register(`physicalMobilities.${index}.timestamp_from`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    validate: (v) => validateDateRange(v, index),
                                })}
                                className="border border-gray-400 rounded-lg p-2 mr-2"
                            />
                        </div>
                        <div className="flex items-center">
                            <p className="mr-4">bis:</p>
                            <input
                                type="date"
                                {...methods.register(`physicalMobilities.${index}.timestamp_to`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                })}
                                className="border border-gray-400 rounded-lg p-2 ml-2"
                            />
                        </div>
                    </div>
                    <p className="flex justify-center text-red-600 pt-2">
                        {
                            methods.formState.errors?.physicalMobilities?.[index]?.timestamp_from
                                ?.message
                        }
                    </p>
                    <p className="flex justify-center text-red-600 pt-2">
                        {
                            methods.formState.errors?.physicalMobilities?.[index]?.timestamp_to
                                ?.message
                        }
                    </p>
                </div>
                <button className="ml-3" type="button" onClick={() => handleDelete(index)}>
                    <RxMinus size={20} />
                </button>
            </div>
        ));
    };

    function radioBooleanInput(control: any, name: any): JSX.Element {
        return (
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <div className="flex my-1">
                            <div>
                                <label className="px-2 py-2">Ja</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(true)} // send value to hook form
                                    checked={value === true}
                                />
                            </div>
                        </div>
                        <div className="flex my-1">
                            <div>
                                <label className="px-2 py-2">Nein</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(false)} // send value to hook form
                                    checked={value === false}
                                />
                            </div>
                        </div>
                    </>
                )}
            />
        );
    }

    return (
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/ve-designer/learning-environment',
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
                                    <div className={'text-center font-bold text-4xl mb-2 relative'}>
                                        In welchem Format / welchen Formaten wird der VE umgesetzt?
                                        <Tooltip tooltipsText="Mehr zu Formaten findest du hier in den Selbstlernmaterialien …">
                                            <Link
                                                target="_blank"
                                                href={'/learning-material/right-bubble/Digitale%20Medien%20&%20Werkzeuge'}
                                            >
                                                <PiBookOpenText size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                    <div className={'text-center mb-20'}>optional</div>
                                    <div className="flex justify-center items-center">
                                        <label htmlFor="courseFormat" className="px-2 py-2">
                                            Format:
                                        </label>
                                        <select
                                            placeholder="Auswählen..."
                                            className="bg-white border border-gray-400 rounded-lg p-2 w-1/3"
                                            {...methods.register(`courseFormat`, {
                                                maxLength: {
                                                    value: 500,
                                                    message:
                                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                                },
                                            })}
                                        >
                                            <option value="synchron">synchron</option>
                                            <option value="asynchron">asynchron</option>
                                            <option value="asynchron und synchron">
                                                asynchron und synchron
                                            </option>
                                        </select>
                                    </div>
                                </div>
                                <WhiteBox>
                                    <div className="p-6 w-full">
                                        <div className="flex items-center">
                                            <p className="w-72">
                                                Wird der VE durch gemeinsame Präsenztreffen ergänzt /
                                                begleitet?
                                            </p>
                                            <div className="flex w-40 justify-end gap-x-5">
                                                {radioBooleanInput(
                                                    methods.control,
                                                    `usePhysicalMobility`
                                                )}
                                            </div>
                                        </div>
                                        {methods.watch('usePhysicalMobility') && (
                                            <>
                                                <div className="divide-y my-2 w-full">
                                                    {renderMobilitiesInputs()}
                                                </div>
                                                <div className="flex justify-center">
                                                    <button
                                                        className="p-4 bg-white rounded-3xl shadow-2xl ml-2"
                                                        type="button"
                                                        onClick={() => {
                                                            append({
                                                                location: '',
                                                                timestamp_from: '',
                                                                timestamp_to: '',
                                                            });
                                                        }}
                                                    >
                                                        <RxPlus size={30} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </WhiteBox>
                                <div className="flex justify-around w-full mt-10">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/ve-designer/evaluation'
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
                                                        '/ve-designer/learning-environment'
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
