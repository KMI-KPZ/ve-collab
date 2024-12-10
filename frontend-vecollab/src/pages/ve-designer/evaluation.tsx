import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { EvaluationFormSchema } from '../../zod-schemas/evaluationSchema';
import CustomHead from '@/components/metaData/CustomHead';

export interface EvaluationPerPartner {
    username: string;
    is_graded: boolean;
    task_type: string;
    assessment_type: string;
    evaluation_before: string;
    evaluation_while: string;
    evaluation_after: string;
}

interface FormValues {
    evaluationPerPartner: EvaluationPerPartner[];
}

// const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
//     return formValues.evaluationPerPartner.every((partner) => {
//         return (
//             !partner.is_graded &&
//             (partner.task_type === '' || partner.task_type === null) &&
//             (partner.assessment_type === '' || partner.assessment_type === null) &&
//             (partner.evaluation_while === '' || partner.evaluation_while === null) &&
//             (partner.evaluation_after === '' || partner.evaluation_after === null)
//         );
//     });
// };

interface Props {
    socket: Socket;
}

Evaluation.auth = true;
Evaluation.noAuthPreview = <EvaluationNoAuthPreview />;
export default function Evaluation({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { data: session } = useSession();
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});

    const prevpage = '/ve-designer/methodology';
    const nextpage = '/ve-designer/checklist';

    const defaultEvaluationValue = [
        {
            username: 'Dozent*in 1',
            is_graded: false,
            task_type: '',
            assessment_type: '',
            evaluation_before: '',
            evaluation_while: '',
            evaluation_after: '',
        },
        {
            username: 'Dozent*in 2',
            is_graded: false,
            task_type: '',
            assessment_type: '',
            evaluation_before: '',
            evaluation_while: '',
            evaluation_after: '',
        },
    ];

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(EvaluationFormSchema),
        defaultValues: {
            evaluationPerPartner: defaultEvaluationValue,
        },
    });

    const { fields, replace } = useFieldArray({
        name: 'evaluationPerPartner',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            let data: { [key: string]: any } = {};

            if (plan.evaluation.length !== 0) {
                replace(plan.evaluation);
                data.evaluationPerPartner = plan.evaluation;
            }

            // fetch profile snippets to be able to display the full name instead of username only
            fetchPOST(
                '/profile_snippets',
                { usernames: [...plan.partners, plan.author.username] },
                session?.accessToken
            ).then((snippets: BackendProfileSnippetsResponse) => {
                let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
                snippets.user_snippets.forEach((element: BackendUserSnippet) => {
                    partnerSnippets[element.username] = element;
                });
                setPartnerProfileSnippets(partnerSnippets);
            });

            return data;
        },
        [replace, session]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'evaluation',
                value: data.evaluationPerPartner,
            },
        ];
    };

    function radioBooleanInput(control: any, name: any, index: number): JSX.Element {
        return (
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <div className="flex my-1">
                            <div>
                                <label className="px-2 py-2">{t('common:yes')}</label>
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
                                <label className="px-2 py-2">{t('common:no')}</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => {
                                        methods.setValue(
                                            `evaluationPerPartner.${index}.task_type`,
                                            ''
                                        );
                                        methods.setValue(
                                            `evaluationPerPartner.${index}.assessment_type`,
                                            ''
                                        );
                                        return onChange(false);
                                    }} // send value to hook form
                                    checked={value === false}
                                />
                            </div>
                        </div>
                    </>
                )}
            />
        );
    }

    function renderEvaluationInfoBox(): JSX.Element[] {
        return fields.map((evaluationPerPartner, index) => (
            <div key={evaluationPerPartner.id} className="flex mx-2">
                <div className="rounded shadow px-3 py-4 h-fit w-fit">
                    <div className="flex flex-col">
                        <div className="font-bold text-lg mb-4 text-center">
                            {partnerProfileSnippets[evaluationPerPartner.username]
                                ? partnerProfileSnippets[evaluationPerPartner.username].first_name +
                                  ' ' +
                                  partnerProfileSnippets[evaluationPerPartner.username].last_name
                                : evaluationPerPartner.username}
                        </div>
                        <div className="flex items-center">
                            <p className="">{t('evaluation.planned')}</p>
                            <div className="flex w-36 justify-end gap-x-3">
                                {radioBooleanInput(
                                    methods.control,
                                    `evaluationPerPartner.${index}.is_graded`,
                                    index
                                )}
                            </div>
                        </div>
                        {methods.watch(`evaluationPerPartner.${index}.is_graded`) && (
                            <>
                                <div className="flex items-center justify-between my-1">
                                    <p className="">{t('evaluation.formOf')}</p>
                                    <input
                                        type="text"
                                        className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                        {...methods.register(
                                            `evaluationPerPartner.${index}.task_type`
                                        )}
                                    />
                                </div>
                                {methods.formState.errors?.evaluationPerPartner?.[index]
                                    ?.task_type && (
                                    <p className="flex justify-center text-red-600 pb-2">
                                        {t(
                                            methods.formState.errors?.evaluationPerPartner?.[index]
                                                ?.task_type?.message!
                                        )}
                                    </p>
                                )}
                                <div className="flex items-center justify-between my-1">
                                    <p className="">{t('evaluation.typeOf')}</p>
                                    <input
                                        type="text"
                                        className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                        {...methods.register(
                                            `evaluationPerPartner.${index}.assessment_type`
                                        )}
                                        placeholder={t('evaluation.typeOfPlaceholder')}
                                    />
                                </div>
                                {methods.formState.errors?.evaluationPerPartner?.[index]
                                    ?.assessment_type && (
                                    <p className="flex justify-center text-red-600 pb-2">
                                        {t(
                                            methods.formState.errors?.evaluationPerPartner?.[index]
                                                ?.assessment_type?.message!
                                        )}
                                    </p>
                                )}
                            </>
                        )}
                        <p className="mt-10 mb-1">{t('evaluation.howTo')}</p>
                        <div className="flex items-center justify-between my-1">
                            <div>
                                <p>{t('evaluation.before')}</p>
                            </div>
                            <textarea
                                className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                {...methods.register(
                                    `evaluationPerPartner.${index}.evaluation_before`
                                )}
                                rows={2}
                                placeholder={t('evaluation.beforePlaceholder')}
                            />
                        </div>
                        {methods.formState.errors?.evaluationPerPartner?.[index]
                            ?.evaluation_before && (
                            <p className="flex justify-center text-red-600 pb-2">
                                {t(
                                    methods.formState.errors?.evaluationPerPartner?.[index]
                                        ?.evaluation_before?.message!
                                )}
                            </p>
                        )}
                        <div className="flex items-center justify-between my-1">
                            <div>
                                <p>{t('evaluation.while')}</p>
                            </div>
                            <textarea
                                className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                {...methods.register(
                                    `evaluationPerPartner.${index}.evaluation_while`
                                )}
                                rows={2}
                                placeholder={t('evaluation.whilePlaceholder')}
                            />
                        </div>
                        {methods.formState.errors?.evaluationPerPartner?.[index]
                            ?.evaluation_while && (
                            <p className="flex justify-center text-red-600 pb-2">
                                {t(
                                    methods.formState.errors?.evaluationPerPartner?.[index]
                                        ?.evaluation_while?.message!
                                )}
                            </p>
                        )}
                        <div className="flex items-center justify-between my-1">
                            <div>
                                <p>{t('evaluation.after')}</p>
                            </div>
                            <textarea
                                className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                {...methods.register(
                                    `evaluationPerPartner.${index}.evaluation_after`
                                )}
                                placeholder={t('evaluation.afterPlaceholder')}
                            />
                        </div>
                        {methods.formState.errors?.evaluationPerPartner?.[index]
                            ?.evaluation_after && (
                            <p className="flex justify-center text-red-600 pb-2">
                                {t(
                                    methods.formState.errors?.evaluationPerPartner?.[index]
                                        ?.evaluation_after?.message!
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        ));
    }

    return (
        <>
            <CustomHead pageTitle={t('evaluation.title')} pageSlug={'ve-designer/evaluation'} />
            <Wrapper
                socket={socket}
                title={t('evaluation.title')}
                subtitle={t('evaluation.subtitle')}
                description={t('evaluation.description')}
                tooltip={{
                    text: t('evaluation.tooltip'),
                    link: '/learning-material/2/Evaluation',
                }}
                stageInMenu="generally"
                idOfProgress="evaluation"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div className="flex flex-wrap ">{renderEvaluationInfoBox()}</div>
            </Wrapper>
        </>
    );
}

export function EvaluationNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']); // designer is default ns

    const prevpage = '/ve-designer/methodology';
    const nextpage = '/ve-designer/checklist';

    const methods = useForm<FormValues>({});

    return (
        <div className="opacity-55">
            <CustomHead pageTitle={t('evaluation.title')} pageSlug={'ve-designer/evaluation'} />
            <Wrapper
                socket={undefined}
                title={t('evaluation.title')}
                subtitle={t('evaluation.subtitle')}
                description={t('evaluation.description')}
                tooltip={{
                    text: t('evaluation.tooltip'),
                    link: '/learning-material/2/Evaluation',
                }}
                stageInMenu="generally"
                idOfProgress="evaluation"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview={true}
            >
                <div className="flex flex-wrap">
                    {Array(2)
                        .fill(null)
                        .map((_, index) => (
                            <div key={index} className="flex mx-2">
                                <div className="rounded shadow px-3 py-4 h-fit w-fit">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-lg mb-4 text-center">
                                            {index === 0
                                                ? t('common:no_auth.partner1')
                                                : t('common:no_auth.partner2')}
                                        </div>
                                        <div className="flex items-center">
                                            <p className="">{t('evaluation.planned')}</p>
                                            <div className="flex w-36 justify-end gap-x-3">
                                                <div className="flex my-1">
                                                    <div>
                                                        <label className="px-2 py-2">
                                                            {t('common:yes')}
                                                        </label>
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="radio"
                                                            className="border border-gray-400 rounded-lg p-2"
                                                            disabled
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex my-1">
                                                    <div>
                                                        <label className="px-2 py-2">
                                                            {t('common:no')}
                                                        </label>
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="radio"
                                                            className="border border-gray-400 rounded-lg p-2"
                                                            disabled
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-10 mb-1">{t('evaluation.howTo')}</p>
                                        <div className="flex items-center justify-between my-1">
                                            <div>
                                                <p>{t('evaluation.before')}</p>
                                            </div>
                                            <textarea
                                                className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                                disabled
                                                rows={2}
                                                placeholder={t('evaluation.beforePlaceholder')}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between my-1">
                                            <div>
                                                <p>{t('evaluation.while')}</p>
                                            </div>
                                            <textarea
                                                className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                                disabled
                                                rows={2}
                                                placeholder={t('evaluation.whilePlaceholder')}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between my-1">
                                            <div>
                                                <p>{t('evaluation.after')}</p>
                                            </div>
                                            <textarea
                                                className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                                disabled
                                                placeholder={t('evaluation.afterPlaceholder')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/75 to-white pointer-events-none"></div>
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
