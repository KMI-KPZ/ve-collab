import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import AsyncCreatableSelect from 'react-select/async-creatable';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import { PiBookOpenText } from 'react-icons/pi';
import { Tooltip } from '@/components/Tooltip';
import { Controller, FormProvider, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import SideProgressBarWithReactHookForm from '@/components/VE-designer/SideProgressBarWithReactHookForm';
import PopupSaveData from '@/components/VE-designer/PopupSaveData';
import {
    BackendProfileSnippetsResponse,
    BackendSearchResponse,
    BackendUserSnippet,
} from '@/interfaces/api/apiInterfaces';
import { CheckListPartner } from '@/pages/ve-designer/checklist';
import { EvaluationPerPartner } from '@/pages/ve-designer/evaluation';

export interface FormValues {
    partners: Partner[];
    externalParties: ExternalParty[];
}

interface ExternalParty {
    externalParty: string;
}

interface Partner {
    label: string;
    value: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return (
        formValues.externalParties.every((party) => party.externalParty === '') &&
        formValues.partners.length <= 1
    );
};

Partners.auth = true;
export default function Partners() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

    const [formalConditions, setFormalConditions] = useState<CheckListPartner[]>([]);
    const [evaluationInfo, setEvaluationInfo] = useState<EvaluationPerPartner[]>([]);
    const [individualLearningGoals, setIndividualLearningGoals] = useState<
        { username: string; learning_goal: string }[]
    >([]);

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
            partners: [{ label: '', value: '' }],
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
            router.push('/plans');
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    if (data.plan.formalities && Array.isArray(data.plan.formalities)) {
                        setFormalConditions(data.plan.formalities);
                    }
                    if (data.plan.evaluation && Array.isArray(data.plan.evaluation)) {
                        setEvaluationInfo(data.plan.evaluation);
                    }
                    if (
                        data.plan.individual_learning_goals &&
                        Array.isArray(data.plan.individual_learning_goals)
                    ) {
                        setIndividualLearningGoals(data.plan.individual_learning_goals);
                    }
                    if (data.plan.involved_parties.length !== 0) {
                        methods.setValue(
                            'externalParties',
                            data.plan.involved_parties.map((element: string) => ({
                                externalParty: element,
                            }))
                        );
                    }
                    if (data.plan.partners.length !== 0) {
                        fetchPOST(
                            '/profile_snippets',
                            { usernames: data.plan.partners },
                            session.accessToken
                        ).then((snippets: BackendProfileSnippetsResponse) => {
                            const usernameWithFirstAndLastName = data.plan.partners.map(
                                (partner: string): Partner => {
                                    const findFullUsername = snippets.user_snippets.find(
                                        (backendUser: BackendUserSnippet) =>
                                            backendUser.username === partner
                                    );
                                    if (findFullUsername !== undefined) {
                                        return {
                                            label:
                                                findFullUsername.first_name +
                                                ' ' +
                                                findFullUsername.last_name +
                                                ' - ' +
                                                findFullUsername.username,
                                            value: findFullUsername.username,
                                        };
                                    } else {
                                        return {
                                            label: partner,
                                            value: partner,
                                        };
                                    }
                                }
                            );
                            methods.setValue('partners', usernameWithFirstAndLastName);
                        });
                    }
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, methods, router]);

    const {
        fields: fieldsPartners,
        append: appendPartners,
        remove: removePartners,
        update: updatePartners,
    } = useFieldArray({
        name: 'partners',
        control: methods.control,
    });

    const {
        fields: fieldsExternalParties,
        append: appendExternalParties,
        remove: removeExternalParties,
        update: updateExternalParties,
    } = useFieldArray({
        name: 'externalParties',
        control: methods.control,
    });

    const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const partners: string[] = data.partners.map((partner) => partner.value);

        let updateFormalConditions: CheckListPartner[] = [];
        let updateEvaluationInfo: EvaluationPerPartner[] = [];
        let updateIndividualLearningGoals: { username: string; learning_goal: string }[] = [];

        if (partners.length >= 1 && partners[0] !== '') {
            updateFormalConditions = partners.map((partner) => {
                const findFormalCondition = formalConditions.find(
                    (formalCondition) => formalCondition.username === partner
                );
                if (findFormalCondition) {
                    return findFormalCondition;
                } else {
                    return {
                        username: partner,
                        time: false,
                        format: false,
                        topic: false,
                        goals: false,
                        languages: false,
                        media: false,
                        technicalEquipment: false,
                        evaluation: false,
                        institutionalRequirements: false,
                        dataProtection: false,
                    };
                }
            });
            updateEvaluationInfo = partners.map((partner) => {
                const findEvaluationInfo = evaluationInfo.find(
                    (evaluation) => evaluation.username === partner
                );
                if (findEvaluationInfo) {
                    return findEvaluationInfo;
                } else {
                    return {
                        username: partner,
                        is_graded: false,
                        task_type: '',
                        assessment_type: '',
                        evaluation_while: '',
                        evaluation_after: '',
                    };
                }
            });
            updateIndividualLearningGoals = partners.map((partner) => {
                const findLearningGoal = individualLearningGoals.find(
                    (learningGoal) => learningGoal.username === partner
                );
                if (findLearningGoal) {
                    return findLearningGoal;
                } else {
                    return {
                        username: partner,
                        learning_goal: '',
                    };
                }
            });
        }

        if (!areAllFormValuesEmpty(data)) {
            await fetchPOST(
                '/planner/update_fields',
                {
                    update: [
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'partners',
                            value: partners,
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'involved_parties',
                            value: data.externalParties.map((element) => element.externalParty),
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'progress',
                            value: {
                                ...sideMenuStepsProgress,
                                partners: ProgressState.completed,
                            },
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'formalities',
                            value: updateFormalConditions,
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'evaluation',
                            value: updateEvaluationInfo,
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'individual_learning_goals',
                            value: updateIndividualLearningGoals,
                        },
                    ],
                },
                session?.accessToken
            );
        }
    };

    const handleDeletePartners = (index: number): void => {
        if (fieldsPartners.length > 1) {
            removePartners(index);
        } else {
            updatePartners(index, { label: '', value: '' });
        }
    };

    const handleDeleteExternalParties = (index: number): void => {
        if (fieldsExternalParties.length > 1) {
            removeExternalParties(index);
        } else {
            updateExternalParties(index, { externalParty: '' });
        }
    };

    const loadOptions = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    callback(
                        data.users.map((user) => ({
                            label: user.first_name + ' ' + user.last_name + ' - ' + user.username,
                            value: user.username,
                        }))
                    );
                }
            );
        }
    };

    function createableAsyncSelect(control: any, name: any, index: number): JSX.Element {
        return (
            <Controller
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <AsyncCreatableSelect
                        className="grow"
                        instanceId={index.toString()}
                        isClearable={true}
                        loadOptions={loadOptions}
                        onChange={onChange}
                        onBlur={onBlur}
                        value={value}
                        placeholder={'Suche nach Nutzer:innen...'}
                        getOptionLabel={(option) => option.label}
                        formatCreateLabel={(inputValue) => (
                            <span>
                                kein Treffer? <b>{inputValue}</b> trotzdem verwenden
                            </span>
                        )}
                    />
                )}
                control={control}
            />
        );
    }

    const renderExternalPartiesInputs = (): JSX.Element[] => {
        return fieldsExternalParties.map((externalParty, index) => (
            <div key={externalParty.id} className="my-2">
                <div className="flex justify-center items-center">
                    <input
                        type="text"
                        placeholder="Externen eingeben"
                        className="border border-gray-300 rounded-lg p-2 mr-2"
                        {...methods.register(`externalParties.${index}.externalParty`, {
                            maxLength: {
                                value: 500,
                                message: 'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                            },
                        })}
                    />
                    <button type="button" onClick={() => handleDeleteExternalParties(index)}>
                        <RxMinus size={20} />
                    </button>
                </div>
                {methods.formState.errors?.externalParties?.[index]?.externalParty?.message && (
                    <p className="text-red-600 pt-2">
                        {methods.formState.errors?.externalParties?.[index]?.externalParty?.message}
                    </p>
                )}
            </div>
        ));
    };

    return (
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/ve-designer/externalParties',
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
                                    <div className="flex">
                                        <div
                                            className={
                                                'text-center font-bold text-4xl mb-2 relative'
                                            }
                                        >
                                            Wer ist am Projekt beteiligt?
                                            <Tooltip tooltipsText="Tipps für die Partnersuche findest du hier in den Selbstlernmaterialien …">
                                                <Link
                                                    target="_blank"
                                                    href={
                                                        '/learning-material/left-bubble/Partnersuche'
                                                    }
                                                >
                                                    <PiBookOpenText size={30} color="#00748f" />
                                                </Link>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className={'text-center mb-20'}>optional</div>
                                    <div className={'text-center font-bold text-2xl mb-8'}>
                                        Beteiligte
                                    </div>
                                    {fieldsPartners.map((partner, index) => (
                                        <div
                                            key={partner.id}
                                            className=" flex my-2 justify-center items-center gap-x-3"
                                        >
                                            {createableAsyncSelect(
                                                methods.control,
                                                `partners.${index}`,
                                                index
                                            )}
                                            <button onClick={() => handleDeletePartners(index)}>
                                                <RxMinus size={20} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex justify-center mt-4">
                                        <button
                                            className="p-4 bg-white rounded-3xl shadow-2xl"
                                            type="button"
                                            onClick={() => {
                                                appendPartners({ label: '', value: '' });
                                            }}
                                        >
                                            <RxPlus size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <div className={'text-center font-bold text-2xl mb-8 mt-10'}>
                                        Extern Beteiligte
                                    </div>
                                    {renderExternalPartiesInputs()}
                                    <div className="flex justify-center mt-4">
                                        <button
                                            className="p-4 bg-white rounded-3xl shadow-2xl"
                                            type="button"
                                            onClick={() => {
                                                appendExternalParties({
                                                    externalParty: '',
                                                });
                                            }}
                                        >
                                            <RxPlus size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between w-full max-w-xl mt-14">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) => {
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/ve-designer/name'
                                                );
                                            })}
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
                                                        '/ve-designer/lectures'
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
