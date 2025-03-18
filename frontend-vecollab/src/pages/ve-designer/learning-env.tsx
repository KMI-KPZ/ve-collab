import React, { useCallback } from 'react';
import { useRouter } from 'next/router';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { Tooltip } from '@/components/common/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { RxPlus, RxTrash } from 'react-icons/rx';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { LearningEnvFormSchema } from '../../zod-schemas/learningEnvSchema';
import CustomHead from '@/components/metaData/CustomHead';

interface FormValues {
    learningEnv: string;
    courseFormat: string;
    usePhysicalMobility: boolean;
    physicalMobilities: PhysicalMobility[];
}

export interface PhysicalMobility {
    location: string;
    timestamp_from: string;
    timestamp_to: string;
}

interface Props {
    socket: Socket;
}

const emptyPysicalMobility: PhysicalMobility = {
    location: '',
    timestamp_from: '',
    timestamp_to: '',
};

LearningEnv.auth = true;
LearningEnv.noAuthPreview = <LearningEnvNoAuthPreview />;
export default function LearningEnv({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const prevpage = '/ve-designer/learning-goals';
    const nextpage = '/ve-designer/methodology';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(LearningEnvFormSchema),
        defaultValues: {
            learningEnv: '',
            courseFormat: '',
            usePhysicalMobility: false,
            physicalMobilities: [emptyPysicalMobility],
        },
    });

    const { fields, append, remove, update, replace } = useFieldArray({
        name: 'physicalMobilities',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            let data: { [key: string]: any } = {};
            if (plan.learning_env !== null) {
                methods.setValue('learningEnv', plan.learning_env);
                data.learningEnv = plan.learning_env;
            }
            if (plan.realization !== null) {
                methods.setValue('courseFormat', plan.realization);
                data.courseFormat = plan.realization;
            }
            if (plan.physical_mobility !== null) {
                methods.setValue('usePhysicalMobility', plan.physical_mobility);
                data.usePhysicalMobility = plan.physical_mobility;
            }
            if (plan.physical_mobilities?.length > 0) {
                data.physicalMobilities = plan.physical_mobilities.map((physicalMobilityObject) => {
                    return Object.assign({}, physicalMobilityObject, {
                        location: physicalMobilityObject.location,
                        timestamp_from: physicalMobilityObject.timestamp_from
                            ? physicalMobilityObject.timestamp_from.split('T')[0]
                            : '',
                        timestamp_to: physicalMobilityObject.timestamp_to
                            ? physicalMobilityObject.timestamp_to.split('T')[0]
                            : '',
                    });
                });
                replace(data.physicalMobilities);
            }

            return data;
        },
        [methods, replace]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'learning_env',
                value: data.learningEnv,
            },
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
        ];
    };

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, emptyPysicalMobility);
        }
    };

    const renderMobilitiesInputs = (): JSX.Element[] => {
        return fields.map((mobility, index) => (
            <div key={mobility.id} className="flex py-4 w-full ">
                <div className="w-full">
                    <div className="flex items-center justify-start pb-2">
                        <p className="mr-4">{t('learningEnv.place')}:</p>
                        <input
                            type="text"
                            placeholder={t('learningEnv.enter_place')}
                            className="border border-gray-400 rounded-lg p-2 w-full"
                            {...methods.register(`physicalMobilities.${index}.location`)}
                        />
                    </div>
                    <p className="flex justify-center text-red-600 pb-2">
                        {t(
                            methods.formState.errors?.physicalMobilities?.[index]?.location
                                ?.message!
                        )}
                    </p>
                    <div className="flex justify-between">
                        <div className="flex items-center">
                            <p className="mr-4">{t('common:from')}:</p>
                            <input
                                type="date"
                                {...methods.register(`physicalMobilities.${index}.timestamp_from`)}
                                className="border border-gray-400 rounded-lg p-2 mr-2"
                            />
                        </div>
                        <div className="flex items-center">
                            <p className="mr-4">{t('common:to')}:</p>
                            <input
                                type="date"
                                {...methods.register(`physicalMobilities.${index}.timestamp_to`)}
                                className="border border-gray-400 rounded-lg p-2 ml-2"
                            />
                        </div>
                    </div>
                    <p className="flex justify-center text-red-600 pt-2">
                        {t(
                            methods.formState.errors?.physicalMobilities?.[index]?.timestamp_from
                                ?.message!
                        )}
                    </p>
                    <p className="flex justify-center text-red-600 pt-2">
                        {t(
                            methods.formState.errors?.physicalMobilities?.[index]?.timestamp_to
                                ?.message!
                        )}
                    </p>
                </div>

                <button
                    className="ml-3 cursor-pointer"
                    type="button"
                    onClick={() => handleDelete(index)}
                >
                    <RxTrash size={20} />
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
                                <label className="px-2 py-2">{t('yes', { ns: 'common' })}</label>
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
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => {
                                        methods.setValue('physicalMobilities', [
                                            emptyPysicalMobility,
                                        ]);
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

    return (
        <>
            <CustomHead
                pageTitle={t('learningEnv.title')}
                pageSlug={'ve-designer/learning-env'}
                pageDescription={t('learningEnv.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('learningEnv.title')}
                subtitle={t('learningEnv.subtitle')}
                description={t('learningEnv.description')}
                tooltip={{
                    text: t('learningEnv.tooltip'),
                    link: '/learning-material/Digitales/Tools',
                }}
                stageInMenu="generally"
                idOfProgress="learning_env"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div className="mt-4">
                    <textarea
                        rows={3}
                        placeholder={t('learningEnv.placeholder')}
                        className="border border-gray-300 rounded-lg p-2 w-full lg:w-1/2"
                        {...methods.register('learningEnv')}
                    />
                    <p className="text-red-600 pt-2">
                        {t(methods.formState.errors?.learningEnv?.message!)}
                    </p>
                </div>

                <div className="mt-4">
                    <div
                        className={
                            'flex justify-between items-center text-slate-600 text-xl relative'
                        }
                    >
                        {t('learningEnv.subtitle2')}
                        {/* <Tooltip tooltipsText={t('learningEnv.tooltip2')} position='left'>
                            <Link
                                target="_blank"
                                href={
                                    '/learning-material/right-bubble/Digitale%20Medien%20&%20Werkzeuge'
                                }
                                className="rounded-full shadow-sm hover:bg-gray-50 p-2 mx-2"
                            >
                                <PiBookOpenText size={30} color="#00748f" />
                            </Link>
                        </Tooltip> */}
                    </div>
                    <p className="mb-8">{t('learningEnv.description2')}</p>
                    <div className="w-full lg:w-1/2">
                        <div className="flex items-center">
                            <label htmlFor="courseFormat" className="mr-2">
                                {t('learningEnv.format')}:
                            </label>
                            <select
                                placeholder={`${t('common:choose')}...`}
                                className="bg-white border border-gray-400 rounded-lg p-2 w-1/3"
                                {...methods.register(`courseFormat`)}
                            >
                                <option value={t('learningEnv.sync')}>
                                    {t('learningEnv.sync')}
                                </option>
                                <option value={t('learningEnv.async')}>
                                    {t('learningEnv.async')}
                                </option>
                                <option value={t('learningEnv.asyncAndSync')}>
                                    {t('learningEnv.asyncAndSync')}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 flex w-full lg:w-2/3 items-center">
                        {t('learningEnv.physicalMeetings')}
                        <div className="flex w-40 justify-end gap-x-5">
                            {radioBooleanInput(methods.control, `usePhysicalMobility`)}
                        </div>
                    </div>
                    {methods.watch('usePhysicalMobility') && (
                        <div className="mt-4 rounded-sm shadow-sm p-2 w-full lg:w-2/3">
                            <div className="divide-y divide-gray-200 my-2">
                                {renderMobilitiesInputs()}
                            </div>
                            <div className="flex justify-center">
                                <button
                                    className="p-4 bg-white rounded-full shadow-sm cursor-pointer hover:bg-slate-50"
                                    type="button"
                                    onClick={() => {
                                        append(emptyPysicalMobility);
                                    }}
                                >
                                    <RxPlus size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </>
    );
}

export function LearningEnvNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const prevpage = '/ve-designer/learning-goals';
    const nextpage = '/ve-designer/methodology';

    const methods = useForm<FormValues>({});

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('learningEnv.title')}
                pageSlug={'ve-designer/learning-env'}
                pageDescription={t('learningEnv.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('learningEnv.title')}
                subtitle={t('learningEnv.subtitle')}
                description={t('learningEnv.description')}
                tooltip={{
                    text: t('learningEnv.tooltip'),
                    link: '/learning-material/3/Digitale%20Medien',
                }}
                stageInMenu="generally"
                idOfProgress="learning_env"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview
            >
                <div className="mt-4">
                    <textarea
                        rows={3}
                        placeholder={t('learningEnv.placeholder')}
                        className="border border-gray-300 rounded-lg p-2 w-full lg:w-1/2"
                        disabled
                    />
                </div>
                <div className="mt-4">
                    <div
                        className={
                            'flex justify-between items-center text-slate-600 text-xl relative'
                        }
                    >
                        {t('learningEnv.subtitle2')}
                    </div>
                    <p className="mb-8">{t('learningEnv.description2')}</p>
                    <div className="w-full lg:w-1/2">
                        <div className="flex items-center">
                            <label htmlFor="courseFormat" className="mr-2">
                                {t('learningEnv.format')}:
                            </label>
                            <select
                                placeholder={`${t('common:choose')}...`}
                                className="bg-white border border-gray-400 rounded-lg p-2 w-1/3"
                                disabled
                            >
                                <option value={t('learningEnv.sync')}>
                                    {t('learningEnv.sync')}
                                </option>
                                <option value={t('learningEnv.async')}>
                                    {t('learningEnv.async')}
                                </option>
                                <option value={t('learningEnv.asyncAndSync')}>
                                    {t('learningEnv.asyncAndSync')}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div className="flex w-full lg:w-2/3 items-center mt-6">
                        {t('learningEnv.physicalMeetings')}
                        <div className="flex w-40 justify-end gap-x-5">
                            <div className="flex my-1">
                                <div>
                                    <label className="px-2 py-2">
                                        {t('yes', { ns: 'common' })}
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
                                    <label className="px-2 py-2">{t('common:no')}</label>
                                </div>
                                <div>
                                    <input type="radio" disabled />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-white/80 to-white pointer-events-none"></div>
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
