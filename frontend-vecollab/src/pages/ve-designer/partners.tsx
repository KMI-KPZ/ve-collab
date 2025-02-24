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
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Trans, useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { PartnersFormSchema } from '../../zod-schemas/partnersSchema';
import CustomHead from '@/components/metaData/CustomHead';
import { FaRegQuestionCircle } from 'react-icons/fa';
import { Tooltip } from '@/components/common/Tooltip';
import ButtonLight from '@/components/common/buttons/ButtongLight';
import Button from '@/components/common/buttons/Button';
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';
import { MdOutlineMail } from 'react-icons/md';
import MailInvitationForm from '@/components/MailInvitationForm';
import Dialog from '@/components/profile/Dialog';

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

interface Props {
    socket: Socket;
}

Partners.auth = true;
Partners.noAuthPreview = <PartnersNoAuthPreview />;
export default function Partners({ socket }: Props): JSX.Element {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']);
    const [openMailInvitationDialog, setOpenMailInvitationDialog] = useState<boolean>(false);

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
        prepend: prependPartnes,
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
        replace: replaceExternalParties,
    } = useFieldArray({
        name: 'externalParties',
        control: methods.control,
    });

    // const [originalExternalParties, setOriginalExternalParties] = useState<string[]>([]);

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
                // setOriginalExternalParties(extPartners.map((a) => a.externalParty));
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
            partners.push({ value: '', label: '' });
            appendPartners(partners);

            return {
                partners: partners,
                externalParties: extPartners,
            };
        },
        [replaceExternalParties, replacePartners, appendPartners, session]
    );

    // const beforeSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
    //     const extPartners = data.externalParties
    //         .filter((value) => value.externalParty.trim() != '')
    //         .map((element) => element.externalParty);

    //     console.log('SUBMIT', { originalExternalParties, extPartners });

    //     // (new) => true
    //     if (extPartners.some((newPartner) => !originalExternalParties.includes(newPartner))) {
    //         console.log('found new external oparties!');
    //         return [];
    //     }

    //     return onSubmit(data);
    // };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const extPartners = data.externalParties
            .filter((value) => value.externalParty.trim() != '')
            .map((element) => element.externalParty);
        const partners: string[] = data.partners
            .filter((partner) => partner.value.trim() != '')
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
                        // format: false,
                        topic: false,
                        goals: false,
                        // languages: false,
                        media: false,
                        technicalEquipment: false,
                        // evaluation: false,
                        institutionalRequirements: false,
                        dataProtection: false,
                        userDefinedAspects: [],
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
                        evaluation_before: '',
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

    const [addedExtWarning, setAddedExtWarning] = useState<number>(0);
    const addedExternalPartyWarning = () => {
        setAddedExtWarning((prev) => ++prev);
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

    function createSelect(control: any, name: any, index: number): JSX.Element {
        return (
            <Controller
                name={name}
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                    <AsyncCreatableSelect
                        className="grow max-w-full"
                        instanceId={index.toString()}
                        isClearable={true}
                        loadOptions={loadUsers}
                        onChange={(target, type) => {
                            onChange(type.action == 'clear' ? { label: '', value: '' } : target);
                        }}
                        onBlur={onBlur}
                        value={value.value == '' ? null : value}
                        placeholder={t('designer:partners:search_users')}
                        getOptionLabel={(option) => option.label}
                        autoFocus={true}
                        formatCreateLabel={(inputValue) => (
                            <span>
                                <Trans
                                    i18nKey="partners.search_users_no_hit"
                                    ns="designer"
                                    values={{ value: inputValue }}
                                    components={{ bold: <strong />, br: <br /> }}
                                />
                            </span>
                        )}
                        components={{
                            DropdownIndicator: null,
                        }}
                        noOptionsMessage={() => null}
                        onCreateOption={(value: string) => {
                            removePartners(fieldsPartners.length - 1);
                            appendPartners({ label: value, value: value });
                        }}
                    />
                )}
            />
        );
    }

    const renderExternalPartiesInputs = (): JSX.Element[] => {
        return fieldsExternalParties.map((externalParty, index) => (
            <div key={externalParty.id} className="my-2 w-full lg:w-1/2">
                <div className="flex">
                    {externalParty.externalParty != '' ? (
                        <p className="px-4 py-2 min-w-56">{externalParty.externalParty}</p>
                    ) : (
                        <input
                            type="text"
                            placeholder={t('designer:partners:enter_ext')}
                            className="grow border border-gray-300 rounded-lg p-2 mr-2"
                            {...methods.register(`externalParties.${index}.externalParty`)}
                        />
                    )}

                    <ButtonLight
                        onClick={() => handleDeleteExternalParties(index)}
                        className="mx-2 !p-2 shadow !rounded-full"
                    >
                        <RxMinus size={18} />
                    </ButtonLight>
                </div>
                {methods.formState.errors?.externalParties?.[index]?.externalParty?.message && (
                    <p className="text-red-600 pt-2">
                        {t(
                            methods.formState.errors?.externalParties?.[index]?.externalParty
                                ?.message!
                        )}
                    </p>
                )}
            </div>
        ));
    };

    const renderPartiesInputt = () => {
        return fieldsPartners.map((partner, index) => {
            return (
                <div key={partner.id} className="flex w-full mb-2 gap-x-3 lg:w-1/2">
                    {partner.value == planAuthor ? (
                        <div className="px-4 py-2">{partner.label}</div>
                    ) : partner.value != '' &&
                      fieldsPartners.find((a) => a.value == partner.value) ? (
                        <>
                            <div className="flex items-center">
                                <p className="px-4 py-2 min-w-56">{partner.label}</p>
                                <ButtonLight
                                    onClick={() => handleDeletePartners(index)}
                                    className="mx-2 !p-2 shadow !rounded-full"
                                >
                                    <RxMinus size={18} />
                                </ButtonLight>
                            </div>
                        </>
                    ) : (
                        <>
                            {createSelect(methods.control, `partners.${index}`, index)}
                            <ButtonLight
                                onClick={() => handleDeletePartners(index)}
                                className="mx-2 !p-2 shadow !rounded-full"
                            >
                                <RxMinus size={18} />
                            </ButtonLight>
                        </>
                    )}
                    {methods.formState.errors?.partners?.[index]?.value?.message && (
                        <p className="text-red-600 pt-2">
                            {t(methods.formState.errors?.partners?.[index]?.value?.message!)}
                        </p>
                    )}
                </div>
            );
        });
    };

    const openMailInvitationForm = () => {};

    return (
        <>
            <CustomHead
                pageTitle={t('partners.title')}
                pageSlug={'ve-designer/partners'}
                pageDescription={t('partners.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('partners.title')}
                subtitle={t('partners.subtitle')}
                description={[t('partners.description-1')]}
                tooltip={{
                    text: t('partners.tooltip'),
                    link: '/learning-material/2/VA-Planung',
                }}
                stageInMenu="generally"
                idOfProgress="partners"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div>
                    <p className="text-xl text-slate-600 mb-2">{t('partners.partners_title')}</p>
                    <div className="flex flex-wrap">
                        <div className="grow">
                            <div className="p-2">{renderPartiesInputt()}</div>

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
                        </div>
                        <div className="lg:basis-1/4 text-center p-4 m-2 rounded-lg border shadow self-start">
                            <p>{t('common:mail_invitation_form.intro_short')}</p>
                            <ButtonLightBlue
                                className="m-2"
                                onClick={() => setOpenMailInvitationDialog(true)}
                            >
                                <MdOutlineMail className="inline" />{' '}
                                {t('common:mail_invitation_form.open')}
                            </ButtonLightBlue>
                        </div>
                    </div>
                    <div>
                        <div className="text-xl text-slate-600 mb-2 mt-10">
                            {t('partners.externpartners_title')}
                            <Tooltip
                                tooltipsText={
                                    <Trans
                                        i18nKey="partners.description-2"
                                        ns="designer"
                                        components={{ 1: <br /> }}
                                    />
                                }
                                className="mx-2"
                            >
                                <FaRegQuestionCircle className="inline m-1 text-ve-collab-blue" />
                            </Tooltip>
                        </div>
                        <div>
                            <p>{t('partners.description-2')}</p>
                            {renderExternalPartiesInputs()}
                            <div className="mt-4">
                                {addedExtWarning == 1 && (
                                    <div className="w-full lg:w-1/2 rounded-md mb-4 bg-red-300 border border-red-500 p-2 text-slate-800 relative">
                                        <Trans
                                            i18nKey="partners.extparties_warning"
                                            ns="designer"
                                            components={{ bold: <strong />, br: <br /> }}
                                        />
                                        <Button
                                            onClick={() => addedExternalPartyWarning()}
                                            className="mx-2 shadow !rounded-full"
                                        >
                                            {t('common:ok')}
                                        </Button>
                                    </div>
                                )}
                                <button
                                    className="p-2 bg-white rounded-full shadow hover:bg-slate-50"
                                    type="button"
                                    onClick={() => {
                                        addedExternalPartyWarning();
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
                </div>
                <Dialog
                    isOpen={openMailInvitationDialog}
                    title={t('common:mail_invitation_form.title')}
                    onClose={() => setOpenMailInvitationDialog(false)}
                >
                    <MailInvitationForm
                        handleFinish={() => {
                            setOpenMailInvitationDialog(false);
                        }}
                        renderAttentionMessage
                    />
                </Dialog>
            </Wrapper>
        </>
    );
}

export function PartnersNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']);
    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(PartnersFormSchema),
    });

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('partners.title')}
                pageSlug={'ve-designer/partners'}
                pageDescription={t('partners.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('partners.title')}
                subtitle={t('partners.subtitle')}
                description={[t('partners.description-1'), t('partners.description-2')]}
                tooltip={{
                    text: t('partners.tooltip'),
                    link: '/learning-material/2/VA-Planung',
                }}
                stageInMenu="generally"
                idOfProgress="partners"
                methods={methods}
                prevpage={'/ve-designer/name'}
                nextpage={'/ve-designer/institutions'}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview={true}
            >
                <div>
                    <p className="text-xl text-slate-600 mb-2">{t('partners.partners_title')}</p>

                    <div className="flex w-full mb-2 gap-x-3 lg:w-1/2 border border-gray-300 rounded-lg p-2">
                        <input
                            className="grow max-w-full"
                            placeholder={t('common:search_users')}
                            disabled
                        />
                        <button onClick={() => {}}>
                            <RxMinus size={20} />
                        </button>
                    </div>

                    <div className="mt-4">
                        <button
                            className="p-2 bg-white rounded-full shadow hover:bg-slate-50"
                            type="button"
                            onClick={() => {}}
                            disabled
                        >
                            <RxPlus size={25} />
                        </button>
                    </div>
                    <div>
                        <p className="text-xl text-slate-600 mb-2 mt-10">
                            {t('partners.externpartners_title')}
                        </p>
                        <div className="my-2 w-full lg:w-1/2">
                            <div className="flex"></div>
                        </div>
                        <div className="mt-4">
                            <button
                                className="p-2 bg-white rounded-full shadow hover:bg-slate-50"
                                type="button"
                                onClick={() => {}}
                                disabled
                            >
                                <RxPlus size={25} />
                            </button>
                        </div>
                    </div>
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/60 to-white pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'designer'])),
        },
    };
}
