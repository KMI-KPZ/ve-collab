import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import React, { useCallback, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import AsyncCreatableSelect from 'react-select/async-creatable';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    BackendProfileSnippetsResponse,
    BackendSearchResponse,
    BackendUserSnippet,
} from '@/interfaces/api/apiInterfaces';
import { CheckListPartner } from '@/pages/ve-designer/checklist';
import { EvaluationPerPartner } from '@/pages/ve-designer/evaluation';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { zodResolver } from '@hookform/resolvers/zod';
import { PartnersFormSchema } from '../../zod-schemas/partnersSchema';

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

// const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
//     return (
//         formValues.externalParties.every((party) => party.externalParty === '') &&
//         formValues.partners.length === 1
//     );
// };

interface Props {
    socket: Socket;
}

Partners.auth = true;
export default function Partners({ socket }: Props): JSX.Element {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common'])

    const [formalConditions, setFormalConditions] = useState<CheckListPartner[]>([]);
    const [evaluationInfo, setEvaluationInfo] = useState<EvaluationPerPartner[]>([]);
    const [individualLearningGoals, setIndividualLearningGoals] = useState<
        { username: string; learning_goal: string }[]
    >([]);
    const prevpage = '/ve-designer/name';
    const nextpage = '/ve-designer/institutions';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(PartnersFormSchema),
    });

    const [planAuthor, setPlanAuthor] = useState<string>();

    const {
        fields: fieldsPartners,
        append: appendPartners,
        remove: removePartners,
        update: updatePartners,
        replace: replacePartners,
    } = useFieldArray({
        name: 'partners',
        control: methods.control,
    });

    const {
        fields: fieldsExternalParties,
        append: appendExternalParties,
        remove: removeExternalParties,
        update: updateExternalParties,
        replace: replaceExternalParties,
    } = useFieldArray({
        name: 'externalParties',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        async (plan: IPlan) => {
            setPlanAuthor(plan.author.username);

            let partners: Partner[] = [];
            let extPartners: ExternalParty[] = [];
            if (plan.checklist && Array.isArray(plan.checklist)) {
                setFormalConditions(plan.checklist);
            }
            if (plan.evaluation && Array.isArray(plan.evaluation)) {
                setEvaluationInfo(plan.evaluation);
            }
            if (plan.individual_learning_goals && Array.isArray(plan.individual_learning_goals)) {
                setIndividualLearningGoals(plan.individual_learning_goals);
            }
            if (plan.involved_parties.length !== 0) {
                extPartners = plan.involved_parties.map((exp) => ({ externalParty: exp }));
                replaceExternalParties(extPartners);
            }
            if (plan.partners.length !== 0) {
                const snippets: BackendProfileSnippetsResponse = await fetchPOST(
                    '/profile_snippets',
                    { usernames: plan.partners },
                    session?.accessToken
                );
                if (snippets) {
                    partners = plan.partners.map((partner: string): Partner => {
                        const findFullUsername = snippets.user_snippets.find(
                            (backendUser: BackendUserSnippet) => backendUser.username === partner
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
                    });
                    replacePartners(partners);
                }
            }
            partners.push({ value: '', label: '' })
            appendPartners(partners)

            return {
                partners: partners,
                externalParties: extPartners,
            };
        },
        [replaceExternalParties, replacePartners, appendPartners, session]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const extPartners = data.externalParties
            .filter((value) => value.externalParty.trim() != "")
            .map((element) => element.externalParty)
        const partners: string[] = data.partners
            .filter((partner) => partner.value.trim() != "")
            .map((partner) => partner.value);

        let updateFormalConditions: CheckListPartner[] = [];
        let updateEvaluationInfo: EvaluationPerPartner[] = [];
        let updateIndividualLearningGoals: { username: string; learning_goal: string }[] = [];

        if (partners.length >= 1) {
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

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'partners',
                value: partners,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'involved_parties',
                value: extPartners,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'checklist',
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
        ];
    };

    const handleDeletePartners = (index: number): void => {
        if (fieldsPartners.length > 1) {
            removePartners(index);
        } else {
            updatePartners(index, { label: '', value: '' });
        }
    };

    const handleDeleteExternalParties = (index: number): void => {
        removeExternalParties(index);
    };

    const loadUsers = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        // TODO more less api queries if we wait some ms for next keys ...
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    callback(
                        data.users
                            .filter(
                                (user: BackendUserSnippet) =>
                                    !fieldsPartners.some((a) => a.value == user.username)
                            )
                            .map((user) => ({
                                label:
                                    user.first_name + ' ' + user.last_name + ' - ' + user.username,
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
                        className="grow max-w-full"
                        instanceId={index.toString()}
                        isClearable={true}
                        loadOptions={loadUsers}
                        onChange={(target, type) => {
                            onChange(type.action == 'clear'
                                ? {label: "", value: ""}
                                : target
                            )
                        }}
                        onBlur={onBlur}
                        value={value.value == "" ? null : value}
                        placeholder={t("common:search_users")}
                        getOptionLabel={(option) => option.label}
                        autoFocus={true}
                        formatCreateLabel={(inputValue) => (
                            <span>
                                {t('common:search_users_no_hit', { value: inputValue })}
                                {/* <Trans
                                    i18nKey="search_users_no_hit" // optional -> fallbacks to defaults if not provided
                                    values={{ value: inputValue }}
                                    components={{ bold: <strong /> }}
                                /> */}
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
            <div key={externalParty.id} className="my-2 w-full lg:w-1/2">
                <div className="flex">
                    <input
                        type="text"
                        placeholder={t("common:enter_name")}
                        className="grow border border-gray-300 rounded-lg p-2 mr-2"
                        {...methods.register(`externalParties.${index}.externalParty`)}
                    />
                    <button type="button" onClick={() => handleDeleteExternalParties(index)}>
                        <RxMinus size={20} />
                    </button>
                </div>
                {methods.formState.errors?.externalParties?.[index]?.externalParty?.message && (
                    <p className="text-red-600 pt-2">
                        {t(methods.formState.errors?.externalParties?.[index]?.externalParty?.message!)}
                    </p>
                )}
            </div>
        ));
    };

    return (
        <Wrapper
            socket={socket}
            title={t('partners.title')}
            subtitle={t('partners.subtitle')}
            description={[
                t('partners.description-1'),
                t('partners.description-2'),
            ]}
            tooltip={{
                text: t('partners.tooltip'),
                link: '/learning-material/left-bubble/Partnersuche',
            }}
            stageInMenu='generally'
            idOfProgress="partners"
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div>
                <p className="text-xl text-slate-600 mb-2">{t('partners.partners_title')}</p>
                {fieldsPartners.map((partner, index) => {
                    return (<>
                        <div key={partner.id} className="flex w-full mb-2 gap-x-3 lg:w-1/2">
                            {partner.value == planAuthor ? (
                                <div className="p-2">{partner.label}</div>
                            ) : (
                                <>
                                    {createableAsyncSelect(
                                        methods.control,
                                        `partners.${index}`,
                                        index
                                    )}
                                    <button onClick={() => handleDeletePartners(index)}>
                                        <RxMinus size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                        {methods.formState.errors?.partners?.[index]?.value?.message && (
                            <p className="text-red-600 pt-2">
                                {t(methods.formState.errors?.partners?.[index]?.value?.message!)}
                            </p>
                        )}
                    </>);
                })}
                <div className="mt-4">
                    <button
                        className="p-2 bg-white rounded-full shadow hover:bg-slate-50"
                        type="button"
                        onClick={() => {
                            appendPartners({ label: '', value: '' });
                        }}
                    >
                        <RxPlus size={25} />
                    </button>
                </div>
                <div>
                    <p className="text-xl text-slate-600 mb-2 mt-10">{t('partners.externpartners_title')}</p>
                    {renderExternalPartiesInputs()}
                    <div className="mt-4">
                        <button
                            className="p-2 bg-white rounded-full shadow hover:bg-slate-50"
                            type="button"
                            onClick={() => {
                                appendExternalParties({
                                    externalParty: '',
                                });
                            }}
                        >
                            <RxPlus size={25} />
                        </button>
                    </div>
                </div>
            </div>
        </Wrapper>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', [
                'common', 'designer'
            ])),
        },
    }
}
