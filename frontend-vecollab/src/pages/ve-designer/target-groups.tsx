import React, { useCallback, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import Image from 'next/image';
import trash from '@/images/icons/ve-designer/trash.png';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { TargetGroupsFormSchema } from '../../zod-schemas/targetGroupsSchema';
import CreatableSelect from 'react-select/creatable';
import CustomHead from '@/components/metaData/CustomHead';

export interface TargetGroup {
    name: string;
    semester: string;
    experience: string;
    academic_course: string;
    languages: string[];
}

interface TargetGroupWithLanguageOptions {
    name: string;
    semester: string;
    experience: string;
    academic_course: string;
    languages: Language[];
}

interface Language {
    value: string;
    label: string;
}

interface FormValues {
    targetGroups: TargetGroupWithLanguageOptions[];
    languages: Language[];
}

// const areAllFormValuesEmpty = (formValues: FormValues): boolean =>
//     formValues.languages.every((languageObject) => languageObject.language === '') &&
//     formValues.targetGroups.every((targetGroup) => {
//         return (
//             targetGroup.name === '' &&
//             targetGroup.age_min === 0 &&
//             targetGroup.age_max === 0 &&
//             targetGroup.experience === '' &&
//             targetGroup.academic_course === '' &&
//             targetGroup.languages === ''
//         );
//     });

interface Props {
    socket: Socket;
    languageKeys: string[];
}

const emptyTG: TargetGroupWithLanguageOptions = {
    name: '',
    semester: '',
    experience: '',
    academic_course: '',
    languages: [],
};

TargetGroups.auth = true;
TargetGroups.noAuthPreview = <TargetGroupsNoAuthPreview />;
export default function TargetGroups({ socket, languageKeys }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']);
    const prevpage = '/ve-designer/lectures';
    const nextpage = '/ve-designer/learning-goals';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(TargetGroupsFormSchema),
        defaultValues: {
            targetGroups: [emptyTG],
            languages: [],
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

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            const targetGroups =
                plan.target_groups.length > 0
                    ? plan.target_groups.map((tg) => ({
                          ...tg,
                          languages: tg.languages.map((language) => ({
                              value: language,
                              label: t('common:languages.' + language, { defaultValue: language }),
                          })),
                      }))
                    : [emptyTG];

            methods.setValue('targetGroups', targetGroups);

            const languages =
                plan.languages.length > 0
                    ? plan.languages.map((language) => ({
                          value: language,
                          label: t('common:languages.' + language, { defaultValue: language }),
                      }))
                    : [];
            methods.setValue('languages', languages);
            return { targetGroups, languages };
        },
        [methods, t]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const transformedTargetGroups = data.targetGroups.map((tg) => ({
            ...tg,
            languages: tg.languages.map((language) => language.value),
        }));

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'target_groups',
                value: transformedTargetGroups,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'languages',
                value: data.languages.map((element) => element.value),
            },
        ];
    };

    const handleRemoveTg = (index: number) =>
        fieldsTg.length > 1 ? removeTg(index) : replaceTg(emptyTG);

    const renderTargetGroupsInputs = (): JSX.Element[] => {
        return fieldsTg.map((targetGroup, index) => (
            <div key={targetGroup.id} className="pt-4 pb-2">
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            {t('common:name')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.name`)}
                            placeholder={t('common:enter_name')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {t(methods.formState.errors?.targetGroups?.[index]?.name?.message!)}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            {t('target.semester')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.semester`)}
                            placeholder={t('target.semester_placeholder')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {t(methods.formState.errors?.targetGroups?.[index]?.semester?.message!)}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="experience" className="px-2 py-2">
                            {t('target.relevant_exp')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <textarea
                            rows={3}
                            {...methods.register(`targetGroups.${index}.experience`)}
                            placeholder={t('target.relevant_exp_placeholder')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {t(
                                methods.formState.errors?.targetGroups?.[index]?.experience
                                    ?.message!
                            )}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="academic_course" className="px-2 py-2">
                            {t('target.degree')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.academic_course`)}
                            placeholder={t('target.degree_placeholder')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {t(
                                methods.formState.errors?.targetGroups?.[index]?.academic_course
                                    ?.message!
                            )}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="languages" className="px-2 py-2">
                            {t('target.languages')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <Controller
                            name={`targetGroups.${index}.languages`}
                            render={({ field: { onChange, onBlur, value, ref } }) => (
                                <CreatableSelect
                                    ref={ref}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    value={value}
                                    options={
                                        languageKeys.map((language) => ({
                                            value: language,
                                            label: t('common:languages.' + language),
                                        })) as { value: string; label: string }[]
                                    }
                                    isClearable={true}
                                    isMulti
                                    closeMenuOnSelect={false}
                                    placeholder={t('target.languages_placeholder')}
                                />
                            )}
                            control={methods.control}
                        />
                        {Array.isArray(methods.formState.errors.targetGroups?.[index]?.languages) &&
                            methods.formState.errors.targetGroups?.[index]?.languages?.map!(
                                (error, index) =>
                                    error?.value?.message && (
                                        <p key={index} className="text-red-600 pt-2">
                                            {t(error.value.message!)}
                                        </p>
                                    )
                            )}
                        {/*}
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.languages`)}
                            placeholder={t('target.languages_placeholder')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {t(
                                methods.formState.errors?.targetGroups?.[index]?.languages?.message!
                            )}
                        </p>
                        */}
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

    const renderLanguagesInputs = (): JSX.Element => {
        return (
            <>
                <Controller
                    name={'languages'}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                        <CreatableSelect
                            ref={ref}
                            onChange={onChange}
                            onBlur={onBlur}
                            value={value}
                            options={
                                languageKeys.map((language) => ({
                                    value: language,
                                    label: t('common:languages.' + language),
                                })) as { value: string; label: string }[]
                            }
                            isClearable={true}
                            isMulti
                            closeMenuOnSelect={false}
                            placeholder={t('target.languages_placeholder')}
                        />
                    )}
                    control={methods.control}
                />
                {Array.isArray(methods.formState.errors.languages) &&
                    methods.formState.errors.languages.map(
                        (error, index) =>
                            error?.value?.message && (
                                <p key={index} className="text-red-600 pt-2">
                                    {t(error.value.message!)}
                                </p>
                            )
                    )}
            </>
        );
    };

    return (
        <>
            <CustomHead pageTitle={t('target.title')} pageSlug={'ve-designer/target-groups'} />
            <Wrapper
                socket={socket}
                title={t('target.title')}
                subtitle={t('target.subtitle')}
                description={t('target.description')}
                tooltip={{
                    text: t('target.tooltip'),
                    link: '/learning-material/2/VA-Planung',
                }}
                stageInMenu="generally"
                idOfProgress="target_groups"
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
                    <div className="text-xl text-slate-600">{t('target.language_title')}</div>
                    <div className="mb-8">{t('target.language_description')}</div>
                    <div className="mt-2 items-center">{renderLanguagesInputs()}</div>
                </div>
            </Wrapper>
        </>
    );
}

export function TargetGroupsNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']);
    const prevpage = '/ve-designer/lectures';
    const nextpage = '/ve-designer/learning-goals';

    const methods = useForm<FormValues>({});

    return (
        <div className="opacity-55">
            <CustomHead pageTitle={t('target.title')} pageSlug={'ve-designer/target-groups'} />
            <Wrapper
                socket={undefined}
                title={t('target.title')}
                subtitle={t('target.subtitle')}
                description={t('target.description')}
                tooltip={{
                    text: t('target.tooltip'),
                    link: '/learning-material/2/VA-Planung',
                }}
                stageInMenu="generally"
                idOfProgress="target_groups"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview
            >
                <div className={'rounded shadow px-4 mb-6 w-full lg:w-2/3'}>
                    <div className="divide-y">
                        <div className="pt-4 pb-2">
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="name" className="px-2 py-2">
                                        {t('common:name')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <input
                                        type="text"
                                        disabled
                                        placeholder={t('common:enter_name')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="name" className="px-2 py-2">
                                        {t('target.semester')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <input
                                        type="text"
                                        disabled
                                        placeholder={t('target.semester_placeholder')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="experience" className="px-2 py-2">
                                        {t('target.relevant_exp')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <textarea
                                        rows={3}
                                        disabled
                                        placeholder={t('target.relevant_exp_placeholder')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="academic_course" className="px-2 py-2">
                                        {t('target.degree')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <input
                                        type="text"
                                        disabled
                                        placeholder={t('target.degree_placeholder')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="languages" className="px-2 py-2">
                                        {t('target.languages')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <CreatableSelect
                                        onChange={() => {}}
                                        onBlur={() => {}}
                                        value={null}
                                        isDisabled
                                        isClearable={true}
                                        isMulti
                                        closeMenuOnSelect={false}
                                        placeholder={t('target.languages_placeholder')}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end items-center">
                                <Image
                                    className="mx-2 cursor-pointer m-2 "
                                    src={trash}
                                    width={20}
                                    height={20}
                                    alt="deleteStep"
                                ></Image>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <button
                            className="p-2 m-2 bg-white rounded-full shadow"
                            type="button"
                            onClick={() => {}}
                            disabled
                        >
                            <RxPlus size={24} />
                        </button>
                    </div>
                </div>

                <div className="">
                    <div className="text-xl text-slate-600">{t('target.language_title')}</div>
                    <div className="mb-8">{t('target.language_description')}</div>
                    <div className="mt-2 items-center">
                        <CreatableSelect
                            onChange={() => {}}
                            onBlur={() => {}}
                            value={null}
                            isDisabled
                            isClearable={true}
                            isMulti
                            closeMenuOnSelect={false}
                            placeholder={t('target.languages_placeholder')}
                        />
                    </div>
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/50 to-white pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    const languageKeys = [
        'Afrikaans',
        'Albanian',
        'Arabic',
        'Armenian',
        'Basque',
        'Bengali',
        'Bulgarian',
        'Catalan',
        'Cambodian',
        'Chinese (Mandarin)',
        'Croatian',
        'Czech',
        'Danish',
        'Dutch',
        'English',
        'Estonian',
        'Fiji',
        'Finnish',
        'French',
        'Georgian',
        'German',
        'Greek',
        'Gujarati',
        'Hebrew',
        'Hindi',
        'Hungarian',
        'Icelandic',
        'Indonesian',
        'Irish',
        'Italian',
        'Japanese',
        'Javanese',
        'Korean',
        'Latin',
        'Latvian',
        'Lithuanian',
        'Macedonian',
        'Malay',
        'Malayalam',
        'Maltese',
        'Maori',
        'Marathi',
        'Mongolian',
        'Nepali',
        'Norwegian',
        'Persian',
        'Polish',
        'Portuguese',
        'Punjabi',
        'Quechua',
        'Romanian',
        'Russian',
        'Samoan',
        'Serbian',
        'Slovak',
        'Slovenian',
        'Spanish',
        'Swahili',
        'Swedish',
        'Tamil',
        'Tatar',
        'Telugu',
        'Thai',
        'Tibetan',
        'Tonga',
        'Turkish',
        'Ukrainian',
        'Urdu',
        'Uzbek',
        'Vietnamese',
        'Welsh',
        'Xhosa',
    ];

    return {
        props: {
            languageKeys,
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'designer'])),
        },
    };
}
