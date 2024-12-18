import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import CreatableSelect from 'react-select/creatable';
import Link from 'next/link';
import { Tooltip } from '@/components/common/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { LearningGoalsFormSchema } from '../../zod-schemas/learningGoalsSchema';
import CustomHead from '@/components/metaData/CustomHead';

export interface FormValues {
    individualLearningGoals: IndividualLearningGoal[];
    majorLearningGoals: MajorLearningGoals[];
    topics: Topic[];
}

interface Topic {
    name: string;
}

interface MajorLearningGoals {
    value: string;
    label: string;
}

interface IndividualLearningGoal {
    username: string;
    learningGoal: string;
}

// const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
//     return (
//         formValues.majorLearningGoals.every((goal) => {
//             return goal.value === '' && goal.label === '';
//         }) &&
//         formValues.individualLearningGoals.every((goal) => {
//             return goal.learningGoal === '' || goal.learningGoal === null;
//         })
//     );
// };

interface Props {
    socket: Socket;
}

LearningGoals.auth = true;
LearningGoals.noAuthPreview = <LearningGoalsNoAuthPreview />;
export default function LearningGoals({ socket }: Props): JSX.Element {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']);
    const [usersFirstLastNames, setUsersFirstLastNames] = useState<BackendUserSnippet[]>([]);

    const prevpage = '/ve-designer/target-groups';
    const nextpage = '/ve-designer/learning-env';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(LearningGoalsFormSchema),
        defaultValues: {
            majorLearningGoals: [],
            individualLearningGoals: [],
            topics: [{ name: '' }],
        },
    });

    const { fields: fieldsLearnings, replace: replaceLearnings } = useFieldArray({
        name: 'individualLearningGoals',
        control: methods.control,
    });

    const {
        fields: fieldsTopics,
        append: appendTopic,
        remove: removeTopic,
        replace: replaceTopics,
    } = useFieldArray({
        name: 'topics',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            const majGoals = plan.major_learning_goals.map((goals: string) => ({
                value: goals,
                label: goals,
            }));
            methods.setValue('majorLearningGoals', majGoals);

            const individGoals = plan.individual_learning_goals.map((goal: any) => ({
                username: goal.username,
                learningGoal: goal.learning_goal,
            }));
            replaceLearnings(individGoals);

            let topics = [{ name: '' }];
            if (plan.topics.length > 0) {
                topics = plan.topics.map((topic: string) => ({ name: topic }));
                replaceTopics(topics);
            }

            // fetch profile snippets to be able to display the full name instead of username only
            fetchPOST(
                '/profile_snippets',
                { usernames: [...plan.partners, plan.author.username] },
                session?.accessToken
            ).then((snippets: BackendProfileSnippetsResponse) => {
                setUsersFirstLastNames(snippets.user_snippets);
            });

            return {
                majorLearningGoals: majGoals,
                individualLearningGoals: individGoals,
                topics,
            };
        },
        [methods, replaceLearnings, replaceTopics, session]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'major_learning_goals',
                value: data.majorLearningGoals.map((goal) => goal.value),
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'individual_learning_goals',
                value: data.individualLearningGoals.map((goal) => ({
                    username: goal.username,
                    learning_goal: goal.learningGoal,
                })),
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'topics',
                value: data.topics.map((element) => element.name),
            },
        ];
    };

    const findPartnerFirstAndLastName = (username: string): string => {
        const findUser = usersFirstLastNames.find(
            (backendUserSnippet: BackendUserSnippet) => username === backendUserSnippet.username
        );
        if (findUser) {
            return findUser.first_name + ' ' + findUser.last_name;
        } else {
            return username;
        }
    };

    const options: { value: string; label: string }[] = [
        {
            value: t('goals.2-option1'),
            label: t('goals.2-option1'),
        },
        {
            value: t('goals.2-option2'),
            label: t('goals.2-option2'),
        },
        {
            value: t('goals.2-option3'),
            label: t('goals.2-option3'),
        },
        {
            value: t('goals.2-option4'),
            label: t('goals.2-option4'),
        },
        {
            value: t('goals.2-option5'),
            label: t('goals.2-option5'),
        },
        {
            value: t('goals.2-option6'),
            label: t('goals.2-option6'),
        },
        {
            value: t('goals.2-option7'),
            label: t('goals.2-option7'),
        },
        {
            value: t('goals.2-option8'),
            label: t('goals.2-option8'),
        },
        {
            value: t('goals.2-option9'),
            label: t('goals.2-option9'),
        },
    ];

    function createableSelect(
        control: any,
        name: any,
        options: { value: string; label: string }[]
    ): JSX.Element {
        return (
            <Controller
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <CreatableSelect
                        onChange={onChange}
                        onBlur={onBlur}
                        value={value}
                        options={options}
                        isClearable={true}
                        isMulti
                        closeMenuOnSelect={false}
                        placeholder={t('goals.2-placeholder')}
                    />
                )}
                control={control}
            />
        );
    }

    const renderTopics = () => {
        return (
            <>
                <div className="flex flex-col ">
                    {fieldsTopics.map((topic, index) => (
                        <div key={topic.id} className="mt-2 flex flex-col">
                            <div className="flex">
                                <div className="grow mr-2">
                                    <input
                                        type="text"
                                        placeholder={t('goals.3-placeholder')}
                                        className="w-full border border-gray-300 rounded-lg p-2 "
                                        {...methods.register(`topics.${index}.name`, {
                                            maxLength: {
                                                value: 500,
                                                message: t('messages.max_length', { count: 500 }),
                                            },
                                        })}
                                    />
                                </div>
                                <button type="button" onClick={() => removeTopic(index)}>
                                    <RxMinus size={20} />
                                </button>
                            </div>
                            <p className="text-red-600 pt-2">
                                {t(methods.formState.errors?.topics?.[index]?.name?.message!)}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="">
                    <button
                        className="p-2 m-2 bg-white rounded-full shadow"
                        type="button"
                        onClick={() => {
                            appendTopic({
                                name: '',
                            });
                        }}
                    >
                        <RxPlus size={25} />
                    </button>
                </div>
            </>
        );
    };

    return (
        <>
            <CustomHead
                pageTitle={t('goals.title')}
                pageSlug={'ve-designer/learning-goals'}
                pageDescription={t('goals.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('goals.title')}
                subtitle={t('goals.subtitle')}
                description={t('goals.description')}
                tooltip={{
                    text: t('goals.tooltip'),
                    link: '/learning-material/1/Potenziale',
                }}
                stageInMenu="generally"
                idOfProgress="learning_goals"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div>
                    <div className="flex flex-wrap">
                        {fieldsLearnings.map((individualLearningGoalPerPartner, index) => (
                            <div key={individualLearningGoalPerPartner.id} className="flex mx-2">
                                <div className="shadow rounded p-2 w-fit h-fit">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-lg mb-4 text-center">
                                            {findPartnerFirstAndLastName(
                                                individualLearningGoalPerPartner.username
                                            )}
                                        </div>
                                        <textarea
                                            rows={3}
                                            className="border border-gray-400 rounded-lg p-2 ml-2 w-96"
                                            {...methods.register(
                                                `individualLearningGoals.${index}.learningGoal`
                                            )}
                                            placeholder={t('goals.learningGoal_placeholder', {
                                                username: findPartnerFirstAndLastName(
                                                    individualLearningGoalPerPartner.username
                                                ),
                                            })}
                                        ></textarea>
                                        <p className="text-red-600 pt-2">
                                            {t(
                                                methods.formState.errors?.individualLearningGoals?.[
                                                    index
                                                ]?.learningGoal?.message!
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-12">
                    <div
                        className={
                            'flex justify-between items-center text-slate-600 text-xl relative'
                        }
                    >
                        {t('goals.2-title')}
                        <Tooltip tooltipsText={t('goals.2-tooltip')}>
                            <Link
                                target="_blank"
                                href={'/learning-material/top-bubble/Potenziale'}
                                className="rounded-full shadow hover:bg-gray-50 p-2 mx-2"
                            >
                                <PiBookOpenText size={30} color="#00748f" />
                            </Link>
                        </Tooltip>
                    </div>
                    <p className="mb-8">{t('goals.2-subtitle')}</p>

                    <div className="w-full lg:w-1/2">
                        {createableSelect(methods.control, 'majorLearningGoals', options)}
                    </div>
                    <p className="text-red-600 pt-2">
                        {t(methods.formState.errors?.majorLearningGoals?.message!)}
                    </p>
                </div>
                <div className="mt-12">
                    <div
                        className={
                            'flex justify-between items-center text-slate-600 text-xl relative'
                        }
                    >
                        {t('goals.3-title')}
                        <Tooltip tooltipsText={t('goals.3-tooltip')}>
                            <Link
                                target="_blank"
                                href={
                                    '/learning-material/top-bubble/Beispiele%20aus%20der%20Praxis'
                                }
                                className="rounded-full shadow hover:bg-gray-50 p-2 mx-2"
                            >
                                <PiBookOpenText size={30} color="#00748f" />
                            </Link>
                        </Tooltip>
                    </div>
                    <p className="mb-8">{t('goals.3-subtitle')}</p>

                    <div className="w-full lg:w-1/2">{renderTopics()}</div>
                </div>
            </Wrapper>
        </>
    );
}

export function LearningGoalsNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']);

    const prevpage = '/ve-designer/target-groups';
    const nextpage = '/ve-designer/learning-env';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(LearningGoalsFormSchema),
        defaultValues: {
            majorLearningGoals: [],
            individualLearningGoals: [],
            topics: [{ name: '' }],
        },
    });

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('goals.title')}
                pageSlug={'ve-designer/learning-goals'}
                pageDescription={t('goals.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('goals.title')}
                subtitle={t('goals.subtitle')}
                description={t('goals.description')}
                tooltip={{
                    text: t('goals.tooltip'),
                    link: '/learning-material/1/Potenziale',
                }}
                stageInMenu="generally"
                idOfProgress="learning_goals"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview
            >
                <div>
                    <div className="flex flex-wrap">
                        {Array(2)
                            .fill(null)
                            .map((_, index) => (
                                <div key={index} className="flex mx-2">
                                    <div className="shadow rounded p-2 w-fit h-fit">
                                        <div className="flex flex-col">
                                            <div className="font-bold text-lg mb-4 text-center">
                                                {index === 0
                                                    ? t('common:no_auth.partner1')
                                                    : t('common:no_auth.partner2')}
                                            </div>
                                            <textarea
                                                rows={3}
                                                className="border border-gray-400 rounded-lg p-2 ml-2 w-96"
                                                disabled
                                                placeholder={t('goals.learningGoal_placeholder', {
                                                    username:
                                                        index === 0
                                                            ? t('common:no_auth.partner1')
                                                            : t('common:no_auth.partner2'),
                                                })}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
                <div className="mt-12">
                    <div
                        className={
                            'flex justify-between items-center text-slate-600 text-xl relative'
                        }
                    >
                        {t('goals.2-title')}
                    </div>
                    <p className="mb-8">{t('goals.2-subtitle')}</p>

                    <div className="w-full lg:w-1/2">
                        <CreatableSelect
                            onChange={() => {}}
                            onBlur={() => {}}
                            value={null}
                            isDisabled
                            isClearable={true}
                            isMulti
                            closeMenuOnSelect={false}
                            placeholder={t('goals.2-placeholder')}
                        />
                    </div>
                </div>
                <div className="mt-12">
                    <div
                        className={
                            'flex justify-between items-center text-slate-600 text-xl relative'
                        }
                    >
                        {t('goals.3-title')}
                    </div>
                    <p className="mb-8">{t('goals.3-subtitle')}</p>

                    <div className="w-full lg:w-1/2">
                        <div className="flex flex-col ">
                            <div className="mt-2 flex flex-col">
                                <div className="flex">
                                    <div className="grow mr-2">
                                        <input
                                            type="text"
                                            placeholder={t('goals.3-placeholder')}
                                            className="w-full border border-gray-300 rounded-lg p-2 "
                                            disabled
                                        />
                                    </div>
                                    <button type="button" onClick={() => {}}>
                                        <RxMinus size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="">
                            <button
                                className="p-2 m-2 bg-white rounded-full shadow"
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
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/70 to-white pointer-events-none"></div>
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
