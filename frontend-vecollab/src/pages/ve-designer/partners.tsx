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
}

interface Partner {
    label: string;
    value: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.partners.every((partner) => {
        return partner.label === '' && partner.value === '';
    });
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
    const [author, setAuthor] = useState<string>('');

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
                    setAuthor(data.plan.author);
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

    const { fields, append, remove, update } = useFieldArray({
        name: 'partners',
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
        }

        // sanity check: if the author (i.e. creator of the plan) was not
        // manually added as a partner by the users, add their formal conditions
        // entry nonetheless, because otherwise he would not be included on the
        // formal conditions page, even though he has to fulfill them as well
        if (!partners.includes(author)) {
            updateFormalConditions.push({
                username: author,
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
            });
            updateEvaluationInfo.push({
                username: author,
                is_graded: false,
                task_type: '',
                assessment_type: '',
                evaluation_while: '',
                evaluation_after: '',
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
                    ],
                },
                session?.accessToken
            );
        }
    };

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, { label: '', value: '' });
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
                                                    href={'/learning-material/left-bubble/Partnersuche'}
                                                >
                                                    <PiBookOpenText size={30} color="#00748f" />
                                                </Link>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className={'text-center mb-20'}>optional</div>
                                    {fields.map((partner, index) => (
                                        <div
                                            key={partner.id}
                                            className=" flex my-2 justify-center items-center gap-x-3"
                                        >
                                            {createableAsyncSelect(
                                                methods.control,
                                                `partners.${index}`,
                                                index
                                            )}
                                            <button onClick={() => handleDelete(index)}>
                                                <RxMinus size={20} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex justify-center mt-4">
                                        <button
                                            className="p-4 bg-white rounded-3xl shadow-2xl"
                                            type="button"
                                            onClick={() => {
                                                append({ label: '', value: '' });
                                            }}
                                        >
                                            <RxPlus size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
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
                                                        '/ve-designer/externalParties'
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
