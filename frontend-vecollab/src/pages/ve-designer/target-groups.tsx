
import React, { useCallback, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import Image from 'next/image';
import trash from '@/images/icons/ve-designer/trash.png';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export interface TargetGroup {
    name: string;
    age_min: string;
    age_max: string;
    experience: string;
    academic_course: string;
    languages: string;
}

interface Language {
    language: string;
}

interface FormValues {
    targetGroups: TargetGroup[];
    languages: Language[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean =>
    formValues.languages.every((languageObject) => languageObject.language === '') &&
    formValues.targetGroups.every((targetGroup) => {
        return (
            targetGroup.name === '' &&
            targetGroup.age_min === '' &&
            targetGroup.age_max === '' &&
            targetGroup.experience === '' &&
            targetGroup.academic_course === '' &&
            targetGroup.languages === ''
        );
    });

interface Props {
    socket: Socket;
}

const emptyTG = {
    name: '',
    age_min: '',
    age_max: '',
    experience: '',
    academic_course: '',
    languages: '',
}
const emptyLanguage = { language: '' }

TargetGroups.auth = true;
export default function TargetGroups({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation('common')
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/lectures';
    const nextpage = '/ve-designer/learning-goals';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            targetGroups: [emptyTG],
            languages: [emptyLanguage],
        },
    });

    const {
        fields: fieldsTg,
        append: appendTg,
        remove: removeTg,
        replace: replaceTg,
    } = useFieldArray({
        name: 'targetGroups',
        control: methods.control,
    });

    const {
        fields: fieldsLang,
        append: appendLang,
        remove: removeLang,
        replace: replaceLang,
    } = useFieldArray({
        name: 'languages',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            const targetGroups = plan.target_groups.length > 0
                ? plan.target_groups
                : [emptyTG]
            replaceTg(targetGroups)

            const languages = plan.languages.length > 0
                ? plan.languages.map(language => ({ language }))
                : [emptyLanguage]
            replaceLang(languages)

            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
            return {targetGroups, languages}
        },
        [replaceLang, replaceTg]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const progressState = areAllFormValuesEmpty(data)
            ? ProgressState.notStarted
            : ProgressState.completed;

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'target_groups',
                value: data.targetGroups,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'languages',
                value: data.languages.map((element) => element.language),
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    target_groups: progressState,
                    languages: progressState,
                },
            },
        ];
    };

    const handleRemoveTg = (index: number) => fieldsTg.length > 1
        ? removeTg(index)
        : replaceTg(emptyTG)

    const handleRemoveLang = (index: number) => fieldsLang.length > 1
        ? removeLang(index)
        : replaceLang(emptyLanguage);

    const renderTargetGroupsInputs = (): JSX.Element[] => {
        return fieldsTg.map((targetGroup, index) => (
            <div key={targetGroup.id} className="pt-4 pb-2">
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            {t('name')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.name`, {
                                maxLength: {
                                    value: 500,
                                    message: t('designer_field_maxlength500'),
                                },
                            })}
                            placeholder={t('enter_name')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.targetGroups?.[index]?.name?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="age" className="px-2 py-2">
                            {t('age')}
                        </label>
                    </div>
                    <div className="w-3/4 flex">
                        <div>
                            <input
                                type="number"
                                {...methods.register(`targetGroups.${index}.age_min`, {
                                    maxLength: {
                                        value: 4,
                                        message: t('designer_field_realistic_number'),
                                    },
                                    pattern: {
                                        value: /^\d+$/,
                                        message:t('designer_field_only_positive_number'),
                                    },
                                })}
                                placeholder={t('from')}
                                className="border border-gray-400 rounded-lg w-1/2 p-2 mr-2"
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.targetGroups?.[index]?.age_min?.message}
                            </p>
                        </div>
                        <div>
                            <input
                                type="number"
                                {...methods.register(`targetGroups.${index}.age_max`, {
                                    maxLength: {
                                        value: 4,
                                        message: t('designer_field_realistic_number'),
                                    },
                                    pattern: {
                                        value: /^\d+$/,
                                        message: t('designer_field_only_positive_number'),
                                    },
                                })}
                                placeholder={t('to')}
                                className="border border-gray-400 rounded-lg w-1/2 p-2 ml-2"
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.targetGroups?.[index]?.age_max?.message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="experience" className="px-2 py-2">
                            {t('designer_target_relevant_exp')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <textarea
                            rows={3}
                            {...methods.register(`targetGroups.${index}.experience`, {
                                maxLength: {
                                    value: 500,
                                    message: t('designer_field_maxlength500'),
                                },
                            })}
                            placeholder={t('designer_target_relevant_exp_placeh')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.targetGroups?.[index]?.experience?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="academic_course" className="px-2 py-2">
                            {t('designer_target_degree')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.academic_course`, {
                                maxLength: {
                                    value: 500,
                                    message: t('designer_field_maxlength500'),
                                },
                            })}
                            placeholder={t('designer_target_degree_placeh')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {
                                methods.formState.errors?.targetGroups?.[index]?.academic_course
                                    ?.message
                            }
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="languages" className="px-2 py-2">
                            {t('designer_target_languages')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.languages`, {
                                maxLength: {
                                    value: 500,
                                    message: t('designer_field_maxlength500'),
                                },
                            })}
                            placeholder={t('designer_target_languages_placeh')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.targetGroups?.[index]?.languages?.message}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end items-center">
                    <Image
                        className="mx-2 cursor-pointer m-2 "
                        onClick={() => handleRemoveTg(index)}
                        src={trash}
                        width={20}
                        height={20}
                        alt="deleteStep"
                    ></Image>
                </div>
            </div>
        ));
    };

    const renderLanguagesInputs = (): JSX.Element[] => {
        return fieldsLang.map((language, index) => (
            <div key={language.id}>
                <div className="flex my-2 items-center w-full">
                    <input
                        type="text"
                        placeholder={t('enter_language')}
                        className="border border-gray-300 rounded-lg w-1/2 p-2 mr-2"
                        {...methods.register(`languages.${index}.language`, {
                            maxLength: {
                                value: 500,
                                message: t('designer_field_maxlength500'),
                            },
                            pattern: {
                                value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                message: t('designer_field_no_special_chars'),
                            },
                        })}
                    />
                    <button type="button" onClick={() => handleRemoveLang(index)}>
                        <RxMinus size={20} />
                    </button>
                </div>
                {methods.formState.errors?.languages?.[index]?.language?.message && (
                    <p className="text-red-600 pt-2">
                        {methods.formState.errors?.languages?.[index]?.language?.message}
                    </p>
                )}
            </div>
        ));
    };

    return (
        <Wrapper
            socket={socket}
            title={t('designer_target_title')}
            subtitle={t('designer_target_subtitle')}
            description={t('designer_target_description')}
            tooltip={{
                text: t('designer_target_tootltip'),
                link: '',
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className={'rounded shadow px-4 mb-6 w-full lg:w-2/3'}>
                <div className="divide-y">{renderTargetGroupsInputs()}</div>
                <div className="flex justify-center">
                    <button
                        className="p-2 m-2 bg-white rounded-full shadow"
                        type="button"
                        onClick={() => {
                            appendTg(emptyTG);
                        }}
                    >
                        <RxPlus size={24} />
                    </button>
                </div>
            </div>

            <div className="">
                <div className="text-xl text-slate-600">{t('designer_target_language_title')}</div>
                <div className="mb-8">{t('designer_target_language_description')}</div>
                <div className="mt-2 items-center">{renderLanguagesInputs()}</div>
                <button
                    className="p-2 m-2 bg-white rounded-full shadow"
                    type="button"
                    onClick={() => {
                        appendLang(emptyLanguage);
                    }}
                >
                    <RxPlus size={20} />
                </button>
            </div>
        </Wrapper>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', [
                'common',
            ])),
        },
    }
}
