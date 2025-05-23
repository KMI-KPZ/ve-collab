import React, { useCallback, useState } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import trash from '@/images/icons/ve-designer/trash.png';
import Image from 'next/image';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { fetchGET } from '@/lib/backend';
import { BackendUser } from '@/interfaces/api/apiInterfaces';
import Dialog from '@/components/profile/Dialog';
import Link from 'next/link';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import ButtonPrimary from '@/components/common/buttons/ButtonPrimary';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { InstitutionsFormSchema } from '../../zod-schemas/institutionsSchema';
import CustomHead from '@/components/metaData/CustomHead';
import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';
import ButtonLight from '@/components/common/buttons/ButtongLight';

export interface Institution {
    name: string;
    school_type: string;
    country: string;
    department: string;
}

interface FormValues {
    institutions: Institution[];
}

const areAllFieldsEmpty = (institution: Institution): boolean => {
    return (
        institution.name.trim() == '' &&
        institution.school_type.trim() == '' &&
        institution.country.trim() == '' &&
        institution.department.trim() == ''
    );
};

interface Props {
    socket: Socket;
}

Institutions.auth = true;
Institutions.noAuthPreview = <InstitutionsNoAuthPreview />;
export default function Institutions({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { data: session } = useSession();
    const { t } = useTranslation(['designer', 'common']);

    const [importDialog, setImportDialog] = useState<{
        isOpen: boolean;
        institutions: Institution[] | undefined;
    }>({
        isOpen: false,
        institutions: undefined,
    });

    const prevpage = '/ve-designer/partners';
    const nextpage = '/ve-designer/lectures';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(InstitutionsFormSchema),
        defaultValues: {
            institutions: [],
        },
    });

    const { fields, prepend, append, remove, replace } = useFieldArray({
        name: 'institutions',
        control: methods.control,
    });

    const handleRemoveLecture = (i: number) => {
        if (fields.length > 0) {
            remove(i);
        }
    };

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            let institutions = plan.institutions.length > 0 ? plan.institutions : [];

            replace(institutions);
            return { institutions };
        },
        [replace]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const institutions = data.institutions.filter((inst) => !areAllFieldsEmpty(inst));
        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'institutions',
                value: institutions,
            },
        ];
    };

    const renderInstitutionInputs = (): JSX.Element[] => {
        return fields.map((lectures, index) => (
            <div key={lectures.id} className="pt-4 pb-2">
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            {t('designer:institutions:institution')}
                        </label>
                    </div>
                    <div className="w-2/3">
                        <input
                            type="text"
                            placeholder={t('common:enter_name')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                            {...methods.register(`institutions.${index}.name`)}
                        />
                        <p className="text-red-600 pt-2">
                            {t(methods.formState.errors?.institutions?.[index]?.name?.message!)}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="schoolType" className="px-2 py-2">
                            {t('institutions.educational_institution')}
                        </label>
                    </div>
                    <div className="w-2/3">
                        <select
                            className="border border-gray-400 rounded-lg w-full px-1 py-2"
                            {...methods.register(`institutions.${index}.school_type`)}
                        >
                            <option value={t('institutions.eduinst_highschool')}>
                                {t('institutions.eduinst_highschool')}
                            </option>
                            <option value={t('institutions.eduinst_appliedsc')}>
                                {t('institutions.eduinst_appliedsc')}
                            </option>
                            <option value={t('institutions.eduinst_voc')}>
                                {t('institutions.eduinst_voc')}
                            </option>
                            <option value={t('institutions.eduinst_school1')}>
                                {t('institutions.eduinst_school1')}
                            </option>
                            <option value={t('institutions.eduinst_school2')}>
                                {t('institutions.eduinst_school2')}
                            </option>

                            <option value={t('institutions.eduinst_other')}>
                                {t('institutions.eduinst_other')}
                            </option>
                        </select>
                        <p className="text-red-600 pt-2">
                            {t(
                                methods.formState.errors?.institutions?.[index]?.school_type
                                    ?.message!
                            )}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="country" className="px-2 py-2">
                            {t('institutions.country')}
                        </label>
                    </div>
                    <div className="w-2/3">
                        <input
                            type="text"
                            placeholder={t('institutions.enter_country')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                            {...methods.register(`institutions.${index}.country`)}
                        />
                        <p className="text-red-600 pt-2">
                            {t(methods.formState.errors?.institutions?.[index]?.country?.message!)}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="department" className="px-2 py-2">
                            {t('institutions.department')}
                        </label>
                    </div>
                    <div className="w-2/3">
                        <input
                            type="text"
                            placeholder={t('institutions.enter_department')}
                            className="border border-gray-400 rounded-lg w-full p-2"
                            {...methods.register(`institutions.${index}.department`)}
                        />
                        <p className="text-red-600 pt-2">
                            {t(
                                methods.formState.errors?.institutions?.[index]?.department
                                    ?.message!
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end items-center">
                    <Image
                        className="mx-2 cursor-pointer m-2 "
                        onClick={() => handleRemoveLecture(index)}
                        src={trash}
                        width={20}
                        height={20}
                        alt="deleteStep"
                    ></Image>
                </div>
            </div>
        ));
    };

    const openImportDialog = async () => {
        setImportDialog((prev) => ({ ...prev, isOpen: true }));
        if (importDialog.institutions?.length) return;

        fetchGET('/profileinformation', session?.accessToken).then((data: BackendUser) => {
            const institutions = data.profile.institutions.map((institution) => {
                return {
                    country: institution.country,
                    name: institution.name,
                    school_type: institution.school_type,
                    department: institution.department,
                };
            });
            setImportDialog((prev) => ({ ...prev, institutions }));
        });
        // TODO handle error case!!!
    };

    const ImportDialog = () => {
        const [selection, setSelection] = useState<{ [key: number]: Institution }>({});

        const toggleImport = (index: number, institution: Institution) => {
            if (typeof selection[index] === 'undefined') {
                setSelection((prev) => ({ ...prev, [index]: institution }));
            } else {
                setSelection((prev) => {
                    // remove selection[index], return the rest
                    const { [index]: rm, ...rest } = prev;
                    return rest;
                });
            }
        };
        const handleImport = () => {
            prepend(
                Object.keys(selection).map((i: any) => {
                    return {
                        country: selection[i].country,
                        name: selection[i].name,
                        school_type: selection[i].school_type,
                        department: selection[i].department,
                    };
                })
            );
            setImportDialog((prev) => ({ ...prev, isOpen: false }));
        };

        if (importDialog.institutions === undefined) return <LoadingAnimation />;

        if (!importDialog.institutions.length) {
            return (
                <div>
                    <p className="mb-3">{t('institutions.no_inst_in_profile')}</p>
                    <Link href={'/profile/edit'} target="_blank">
                        <span className="border border-white bg-black/75 text-white rounded-lg px-3 py-1">
                            {t('common:edit_profile')}
                        </span>
                    </Link>
                </div>
            );
        }

        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                {importDialog.institutions.map((institution, i) => {
                    return (
                        <div
                            key={i}
                            className="ml-10 hover:cursor-pointer flex"
                            onClick={() => toggleImport(i, institution)}
                        >
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={typeof selection[i] !== 'undefined'}
                                readOnly
                            />
                            {institution.name}
                            {institution.department && <>({institution.department})</>}
                        </div>
                    );
                })}
                <div className="ml-auto text-right space-x-2">
                    <ButtonSecondary
                        onClick={() => setImportDialog((prev) => ({ ...prev, isOpen: false }))}
                    >
                        {t('common:cancel')}
                    </ButtonSecondary>
                    <ButtonPrimary label={t('common:import')} onClick={() => handleImport()} />
                </div>
            </div>
        );
    };

    return (
        <>
            <CustomHead
                pageTitle={t('institutions.title')}
                pageSlug={'ve-designer/institutions'}
                pageDescription={t('institutions.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('institutions.title')}
                subtitle={t('institutions.subtitle')}
                description={t('institutions.description')}
                stageInMenu="generally"
                idOfProgress="institutions"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <Dialog
                    isOpen={importDialog.isOpen}
                    title={t('institutions.import_institutions')}
                    onClose={() => setImportDialog((prev) => ({ ...prev, isOpen: false }))}
                >
                    <div className="w-[40vw]">
                        <ImportDialog />
                    </div>
                </Dialog>

                <div className={'px-4 w-full lg:w-2/3'}>
                    <div className="flex space-x-2">
                        <ButtonLightBlue
                            onClick={() => openImportDialog()}
                            title={t('institutions.import_institutions')}
                        >
                            {t('common:import')}
                        </ButtonLightBlue>
                        <ButtonLight
                            onClick={() => {
                                append({
                                    name: '',
                                    school_type: '',
                                    country: '',
                                    department: '',
                                });
                            }}
                        >
                            {t('common:new')}
                        </ButtonLight>
                    </div>

                    <div className="divide-y divide-gray-200">{renderInstitutionInputs()}</div>

                    {fields.length > 0 && (
                        <div className="flex justify-center">
                            <ButtonLight
                                className="!rounded-full"
                                onClick={() => {
                                    append({
                                        name: '',
                                        school_type: '',
                                        country: '',
                                        department: '',
                                    });
                                }}
                            >
                                <RxPlus size={25} />
                            </ButtonLight>
                        </div>
                    )}
                </div>
            </Wrapper>
        </>
    );
}

export function InstitutionsNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']);
    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(InstitutionsFormSchema),
        defaultValues: {
            institutions: [],
        },
    });

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('institutions.title')}
                pageSlug={'ve-designer/institutions'}
                pageDescription={t('institutions.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('institutions.title')}
                subtitle={t('institutions.subtitle')}
                description={t('institutions.description')}
                stageInMenu="generally"
                idOfProgress="institutions"
                methods={methods}
                prevpage={'/ve-designer/partners'}
                nextpage={'/ve-designer/lectures'}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview={true}
            >
                <div className={'px-4 w-full lg:w-2/3'}>
                    <div className="flex">
                        <button
                            className="px-4 py-2 m-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                            type="button"
                            title={t('institutions.import_institutions')}
                            disabled
                        >
                            {t('common:import')}
                        </button>
                    </div>

                    <div className="divide-y divide-gray-200">
                        <div className="pt-4 pb-2">
                            <div className="mt-2 flex">
                                <div className="w-1/3 flex items-center">
                                    <label htmlFor="name" className="px-2 py-2">
                                        {t('designer:institutions:institution')}
                                    </label>
                                </div>
                                <div className="w-2/3">
                                    <input
                                        type="text"
                                        placeholder={t('common:enter_name')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/3 flex items-center">
                                    <label htmlFor="schoolType" className="px-2 py-2">
                                        {t('institutions.educational_institution')}
                                    </label>
                                </div>
                                <div className="w-2/3">
                                    <select
                                        className="border border-gray-400 rounded-lg w-full px-1 py-2"
                                        disabled
                                    >
                                        <option value={t('institutions.eduinst_highschool')}>
                                            {t('institutions.eduinst_highschool')}
                                        </option>
                                        <option value={t('institutions.eduinst_appliedsc')}>
                                            {t('institutions.eduinst_appliedsc')}
                                        </option>
                                        <option value={t('institutions.eduinst_voc')}>
                                            {t('institutions.eduinst_voc')}
                                        </option>
                                        <option value={t('institutions.eduinst_school1')}>
                                            {t('institutions.eduinst_school1')}
                                        </option>
                                        <option value={t('institutions.eduinst_school2')}>
                                            {t('institutions.eduinst_school2')}
                                        </option>

                                        <option value={t('institutions.eduinst_other')}>
                                            {t('institutions.eduinst_other')}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/3 flex items-center">
                                    <label htmlFor="country" className="px-2 py-2">
                                        {t('institutions.country')}
                                    </label>
                                </div>
                                <div className="w-2/3">
                                    <input
                                        type="text"
                                        placeholder={t('institutions.enter_country')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex">
                                <div className="w-1/3 flex items-center">
                                    <label htmlFor="department" className="px-2 py-2">
                                        {t('institutions.department')}
                                    </label>
                                </div>
                                <div className="w-2/3">
                                    <input
                                        type="text"
                                        placeholder={t('institutions.enter_department')}
                                        className="border border-gray-400 rounded-lg w-full p-2"
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end items-center">
                                <Image
                                    className="mx-2 cursor-default m-2"
                                    onClick={() => {}}
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
                            className="p-2 m-2 bg-white rounded-full shadow-sm hover:bg-slate-50"
                            type="button"
                            onClick={() => {}}
                            disabled
                        >
                            <RxPlus size={25} />
                        </button>
                    </div>
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-white/70 to-white pointer-events-none"></div>
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
