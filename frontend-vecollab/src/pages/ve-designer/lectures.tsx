import React, { useCallback } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import Image from 'next/image';
import trash from '@/images/icons/ve-designer/trash.png';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { LecturesFormSchema } from '../../zod-schemas/lecturesSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import CustomHead from '@/components/metaData/CustomHead';

export interface LectureOld {
    name: string;
    lecture_type: string;
    lecture_format: string;
    participants_amount: number;
}

interface FormValues {
    lectures: LectureOld[];
}

interface Props {
    socket: Socket;
}

const emptyLecture = {
    name: '',
    lecture_type: '',
    lecture_format: '',
    participants_amount: 0,
};

const areAllValuesEmpty = (lecture: LectureOld): boolean => {
    return (
        lecture.name.trim() == '' &&
        lecture.lecture_type.trim() == '' &&
        lecture.lecture_format.trim() == '' &&
        (lecture.participants_amount === 0 || lecture.participants_amount == undefined)
    );
};

Lectures.auth = true;
Lectures.noAuthPreview = <LecturesNoAuthPreview />;
export default function Lectures({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']);

    const prevpage = '/ve-designer/institutions';
    const nextpage = '/ve-designer/target-groups';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(LecturesFormSchema),
        defaultValues: {
            lectures: [emptyLecture],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        name: 'lectures',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            const lectures = plan.lectures.length > 0 ? plan.lectures : [emptyLecture];

            replace(lectures);
            return { lectures };
        },
        [replace]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const lectures = data.lectures.filter((lecture) => !areAllValuesEmpty(lecture));

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'lectures',
                value: lectures,
            },
        ];
    };

    const handeleRemove = (index: number) => {
        if (fields.length > 1) {
            remove(index);
        } else {
            replace(emptyLecture);
        }
    };

    const renderLecturesInputs = (): JSX.Element[] => {
        return fields.map((lecture, index) => (
            <div key={lecture.id} className="pt-4 pb-2">
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            {t('designer:lectures:lecture')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`lectures.${index}.name`)}
                            placeholder={t('common:enter_name')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {t(methods.formState.errors?.lectures?.[index]?.name?.message!)}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="type" className="px-2 py-2">
                            {t('common:type')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <select
                            {...methods.register(`lectures.${index}.lecture_type`)}
                            className="border border-gray-400 rounded-lg w-full px-1 py-2"
                        >
                            <option value={t('lectures.compulsory')}>
                                {t('lectures.compulsory')}
                            </option>
                            <option value={t('lectures.elective')}>{t('lectures.elective')}</option>
                        </select>
                        <p className="text-red-600 pt-2">
                            {t(methods.formState.errors?.lectures?.[index]?.lecture_type?.message!)}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="format" className="px-2 py-2">
                            {t('lectures.format')}
                        </label>
                    </div>
                    <div className="w-3/4">
                        <select
                            {...methods.register(`lectures.${index}.lecture_format`)}
                            placeholder="z.B. online, hybrid, präsenz"
                            className="border border-gray-400 rounded-lg w-full px-1 py-2"
                        >
                            <option value={t('lectures.face2face')}>
                                {t('lectures.face2face')}
                            </option>
                            <option value={t('lectures.online')}>{t('lectures.online')}</option>
                            <option value={t('lectures.hybrid')}>{t('lectures.hybrid')}</option>
                        </select>
                        <p className="text-red-600 pt-2">
                            {t(
                                methods.formState.errors?.lectures?.[index]?.lecture_format
                                    ?.message!
                            )}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/2 flex items-center">
                        <label htmlFor="participants" className="px-2 py-2">
                            {t('lectures.numbers_of_part')}
                        </label>
                    </div>
                    <div className="w-1/2">
                        <input
                            type="number"
                            min={0}
                            {...methods.register(`lectures.${index}.participants_amount`, {
                                valueAsNumber: true,
                            })}
                            placeholder={t('lectures.enter_numbers_of_part')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {t(
                                methods.formState.errors?.lectures?.[index]?.participants_amount
                                    ?.message!
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end items-center">
                    <Image
                        className="mx-2 cursor-pointer m-2 "
                        onClick={() => handeleRemove(index)}
                        src={trash}
                        width={20}
                        height={20}
                        alt="deleteStep"
                    ></Image>
                </div>
            </div>
        ));
    };

    return (
        <>
            <CustomHead
                pageTitle={t('lectures.title')}
                pageSlug={'ve-designer/lectures'}
                pageDescription={t('lectures.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('lectures.title')}
                subtitle={t('lectures.subtitle')}
                stageInMenu="generally"
                idOfProgress="lectures"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div className={'mt-4 rounded shadow px-4 w-full lg:w-2/3'}>
                    <div className="divide-y">{renderLecturesInputs()}</div>
                    <div className="flex justify-center">
                        <button
                            className="p-2 m-3 bg-white rounded-full shadow hover:bg-slate-50"
                            type="button"
                            onClick={() => {
                                append({
                                    name: '',
                                    lecture_type: '',
                                    lecture_format: '',
                                    participants_amount: 0,
                                });
                            }}
                        >
                            <RxPlus size={24} />
                        </button>
                    </div>
                </div>
            </Wrapper>
        </>
    );
}

export function LecturesNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']);

    const prevpage = '/ve-designer/institutions';
    const nextpage = '/ve-designer/target-groups';

    const methods = useForm<FormValues>({});

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('lectures.title')}
                pageSlug={'ve-designer/lectures'}
                pageDescription={t('lectures.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('lectures.title')}
                subtitle={t('lectures.subtitle')}
                stageInMenu="generally"
                idOfProgress="lectures"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview={true}
            >
                <div className={'mt-4 rounded shadow px-4 w-full lg:w-2/3'}>
                    <div className="divide-y">
                        <div className="pt-4 pb-2">
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="name" className="px-2 py-2">
                                        {t('designer:lectures:lecture')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <input
                                        type="text"
                                        placeholder={t('common:enter_name')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="type" className="px-2 py-2">
                                        {t('common:type')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <select
                                        disabled
                                        className="border border-gray-400 rounded-lg w-full px-1 py-2"
                                    >
                                        <option value={t('lectures.compulsory')}>
                                            {t('lectures.compulsory')}
                                        </option>
                                        <option value={t('lectures.elective')}>
                                            {t('lectures.elective')}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/4 flex items-center">
                                    <label htmlFor="format" className="px-2 py-2">
                                        {t('lectures.format')}
                                    </label>
                                </div>
                                <div className="w-3/4">
                                    <select
                                        disabled
                                        placeholder="z.B. online, hybrid, präsenz"
                                        className="border border-gray-400 rounded-lg w-full px-1 py-2"
                                    >
                                        <option value={t('lectures.face2face')}>
                                            {t('lectures.face2face')}
                                        </option>
                                        <option value={t('lectures.online')}>
                                            {t('lectures.online')}
                                        </option>
                                        <option value={t('lectures.hybrid')}>
                                            {t('lectures.hybrid')}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/2 flex items-center">
                                    <label htmlFor="participants" className="px-2 py-2">
                                        {t('lectures.numbers_of_part')}
                                    </label>
                                </div>
                                <div className="w-1/2">
                                    <input
                                        type="number"
                                        min={0}
                                        disabled
                                        placeholder={t('lectures.enter_numbers_of_part')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
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
                            className="p-2 m-3 bg-white rounded-full shadow hover:bg-slate-50"
                            type="button"
                            onClick={() => {}}
                            disabled
                        >
                            <RxPlus size={24} />
                        </button>
                    </div>
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/90 to-white pointer-events-none"></div>
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
