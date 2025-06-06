import Link from 'next/link';
import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { fetchDELETE } from '@/lib/backend';
import { AuthenticatedFile } from '@/components/common/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { IoMdClose } from 'react-icons/io';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Trans, useTranslation } from 'next-i18next';
import { PostProcessSchema } from '../../zod-schemas/postProcessSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tooltip } from '@/components/common/Tooltip';
import { FaRegQuestionCircle } from 'react-icons/fa';
import CustomHead from '@/components/metaData/CustomHead';

export interface EvaluationFile {
    file: File;
    file_name: string;
    size: number;
    file_id?: string;
}

export interface LiteratureFile {
    file: File;
    file_name: string;
    size: number;
    file_id?: string;
}

interface FormValues {
    share: boolean;
    sharePlanned: boolean;
    sharedReadOnly: boolean;
    abstract: string;
    veModel: string;
    reflection: string;
    evaluation: string;
    evaluationFile: undefined | EvaluationFile;
    literature: string;
    literatureFiles: undefined | LiteratureFile[];
}

interface Props {
    socket: Socket;
}

PostProcess.auth = true;
PostProcess.noAuthPreview = <PostProcessNoAuthPreview />;
export default function PostProcess({ socket }: Props) {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']);

    const [changedEvFile, setChangedEvFile] = useState<boolean>(false);
    const [originalEvFile, setOriginalEvFile] = useState<EvaluationFile>();
    const [deletedLitFiles, setDeletedLitFiles] = useState<LiteratureFile[]>([]);

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(PostProcessSchema),
        defaultValues: {
            sharePlanned: false,
            share: false,
        },
    });

    const {
        fields: litFiles,
        append: addLitFile,
        remove: rmLitFile,
        replace: replaceLitFiles,
    } = useFieldArray({
        name: 'literatureFiles',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            setChangedEvFile(false);
            setOriginalEvFile(undefined);
            replaceLitFiles([]);

            if (plan.is_good_practise !== null) {
                methods.setValue('share', plan.is_good_practise);
            }
            const is_good_practice_planned =
                typeof plan.is_good_practise_planned !== 'undefined'
                    ? plan.is_good_practise_planned
                    : false;
            methods.setValue('sharePlanned', is_good_practice_planned);
            const is_good_practise_ro =
                typeof plan.is_good_practise_ro !== 'undefined' ? plan.is_good_practise_ro : false;
            methods.setValue('sharedReadOnly', is_good_practise_ro);
            methods.setValue('abstract', plan.abstract as string);
            methods.setValue('veModel', plan.underlying_ve_model as string);
            methods.setValue('reflection', plan.reflection as string);

            if (plan.evaluation_file) {
                const evaluationFile = {
                    ...plan.evaluation_file,
                    file: new File([''], plan.evaluation_file.file_name),
                };
                methods.setValue('evaluationFile', evaluationFile);
                setOriginalEvFile(evaluationFile);
            }

            if (plan.literature) methods.setValue('literature', plan.literature as string);
            if (plan.literature_files) {
                plan.literature_files.map((file) => {
                    addLitFile({
                        file: new File([''], file.file_name),
                        file_name: file.file_name,
                        size: file.size,
                        file_id: file.file_id,
                    });
                });
            }

            return {
                abstract: plan.abstract,
                share: plan.is_good_practise,
                sharePlanned: is_good_practice_planned,
                sharedReadOnly: is_good_practise_ro,
                veModel: plan.underlying_ve_model,
                reflection: plan.reflection,
                evaluationFile: plan.evaluation_file,
                literature: plan.literature,
                literatureFiles: plan.literature_files,
            };
        },
        [methods, addLitFile, replaceLitFiles]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (changedEvFile && originalEvFile) {
            await removeFromBackend('evaluation', originalEvFile);
        }

        if (data.evaluationFile?.file) {
            await uploadToBackend('evaluation', data.evaluationFile!);
        }

        if (deletedLitFiles.length) {
            deletedLitFiles.map(async (file) => {
                await removeFromBackend('literature', file);
            });
        }
        if (data.literatureFiles) {
            for (const file of data.literatureFiles) {
                await uploadToBackend('literature', file);
            }
        }

        // if the user (re)set the sharePlanned to false, then also set share to false,
        // since the field will be disabled
        const is_good_practise = data.sharePlanned ? data.share : false;

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'is_good_practise',
                value: is_good_practise,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'is_good_practise_planned',
                value: data.sharePlanned,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'is_good_practise_ro',
                value: data.sharedReadOnly,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'abstract',
                value: data.abstract,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'underlying_ve_model',
                value: data.veModel,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'reflection',
                value: data.reflection,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'literature',
                value: data.literature,
            },
        ];
    };

    const removeFromBackend = async (
        type: 'evaluation' | 'literature',
        file: EvaluationFile | LiteratureFile
    ) => {
        // if file doesnt has a file_id it wasnt yet uploaded
        if (!file.file_id) return true;

        const url =
            type == 'evaluation'
                ? `/planner/remove_evaluation_file`
                : `/planner/remove_literature_file`;

        return await fetchDELETE(
            `${url}?plan_id=${router.query.plannerId}&file_id=${file.file_id}`,
            {},
            session?.accessToken
        );
    };

    const uploadToBackend = async (
        type: 'evaluation' | 'literature',
        file: EvaluationFile | LiteratureFile
    ) => {
        // if file already has a file_id it was already uploaded
        if (file.file_id) return true;

        const body = new FormData();
        body.append('file', file.file);

        const headers: { Authorization?: string } = {};
        headers['Authorization'] = 'Bearer ' + session?.accessToken;

        const url =
            type == 'evaluation' ? `/planner/put_evaluation_file` : `/planner/put_literature_file`;

        // upload as form data instead of json
        return await fetch(
            process.env.NEXT_PUBLIC_BACKEND_BASE_URL + url + `?plan_id=${router.query.plannerId}`,
            {
                method: 'POST',
                headers: headers,
                body,
            }
        );
    };

    function evaluationFileSelector() {
        return (
            <>
                <Controller
                    name={'evaluationFile'}
                    control={methods.control}
                    render={({ field: { ref, name, onBlur, onChange } }) => (
                        <>
                            <label
                                className={`inline-block cursor-pointer bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg ${
                                    methods.watch('sharePlanned') === true
                                        ? 'hover:bg-opacity-60'
                                        : ''
                                }`}
                                htmlFor={name}
                            >
                                {t('common:add_file')}
                            </label>
                            <input
                                id={name}
                                type="file"
                                ref={ref}
                                name={name}
                                onBlur={onBlur}
                                onChange={(e) => {
                                    const file = e.target?.files?.item(0);
                                    if (!file) return;
                                    setChangedEvFile(true);
                                    onChange({
                                        file: file,
                                        file_name: file.name,
                                        size: file.size,
                                    });
                                }}
                                className="hidden"
                                disabled={methods.watch('sharePlanned') === false}
                            />
                        </>
                    )}
                />
            </>
        );
    }

    function literatureFileSelector() {
        if (litFiles.length >= 5) return <></>;
        return (
            <>
                <Controller
                    name={'literatureFiles'}
                    control={methods.control}
                    render={({ field: { ref, name, onBlur, value } }) => (
                        <>
                            <label
                                className={`inline-block cursor-pointer bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg ${
                                    methods.watch('sharePlanned') === true
                                        ? 'hover:bg-opacity-60'
                                        : ''
                                }`}
                                htmlFor={name}
                            >
                                {t('common:add_file_multiple')}
                            </label>
                            <input
                                id={name}
                                type="file"
                                ref={ref}
                                name={name}
                                onBlur={onBlur}
                                onChange={(e) => {
                                    const files = e.target?.files;
                                    const indexLengthOfSavedFiles = value?.length ?? 0;
                                    if (!files) return;
                                    Array.from(files)
                                        .slice(0, 5)
                                        .forEach((file, index) => {
                                            if (file.size >= 5242880) {
                                                // instant error message render through zod not possible because of combination of useArray and Controller
                                                methods.setError(
                                                    `literatureFiles.${
                                                        indexLengthOfSavedFiles + index
                                                    }.size`,
                                                    {
                                                        type: 'custom',
                                                        message: 'messages.max_5_mb',
                                                    }
                                                );
                                            }
                                            addLitFile({
                                                file: file,
                                                file_name: file.name,
                                                size: file.size,
                                            });
                                        });
                                }}
                                className="hidden"
                                disabled={methods.watch('sharePlanned') === false}
                                multiple
                            />
                        </>
                    )}
                />
            </>
        );
    }

    return (
        <>
            <CustomHead
                pageTitle={t('post-process.title')}
                pageSlug={'ve-designer/post-process'}
                pageDescription={t('post-process.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('post-process.title')}
                subtitle={t('post-process.subtitle')}
                methods={methods}
                nextpage="/plans"
                nextpageBtnLabel={t('post-process.submit')}
                preventToLeave={false}
                stageInMenu="post-process"
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div className="py-6 divide-y divide-gray-200">
                    <div className="flex flex-col justify-between mb-3">
                        <div>
                            <p className="font-medium">{t('post-process.text_1')}</p>
                            <p>{t('post-process.text_2')}</p>
                            <p>
                                ({t('post-process.license') + ' '}
                                <Link
                                    className="underline text-ve-collab-blue"
                                    href={
                                        'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.de'
                                    }
                                    target="_blank"
                                >
                                    CC-BY-NC-ND 4.0
                                </Link>
                                )
                            </p>
                            <p className="mt-2 text-sm text-gray-600">
                                <Trans
                                    i18nKey="designer:post-process.disclaimer_not_yet_good_practice1"
                                    components={{ bold: <strong />, underline: <u /> }}
                                />
                            </p>
                            <p className="text-sm text-gray-600">
                                {t('post-process.disclaimer_not_yet_good_practice2')}
                            </p>
                        </div>
                        <Controller
                            control={methods.control}
                            name={'sharePlanned'}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <div className="flex w-40 mb-4">
                                    <label className="px-2 py-2" htmlFor="preYes">
                                        {t('common:yes')}
                                    </label>
                                    <input
                                        type="radio"
                                        id="preYes"
                                        className="border border-gray-400 rounded-lg p-2"
                                        onBlur={onBlur} // notify when input is touched
                                        onChange={() => {
                                            onChange(true);
                                        }} // send value to hook form
                                        checked={value === true}
                                    />
                                    <label className="px-2 py-2" htmlFor="preNo">
                                        {t('common:no')}
                                    </label>
                                    <input
                                        type="radio"
                                        id="preNo"
                                        className="border border-gray-400 rounded-lg p-2"
                                        onBlur={onBlur} // notify when input is touched
                                        onChange={() => {
                                            onChange(false);
                                            methods.setValue('share', false); // side effect, if i revoke the intention to share (sharePlanned), then automatically set share to false, since the field will be disabled
                                        }} // send value to hook form
                                        checked={value === false}
                                    />
                                </div>
                            )}
                        />
                    </div>

                    <ol
                        className={`mt-4 mb-3 pt-6 px-6 list-decimal list-outside marker:font-bold ${
                            methods.watch('sharePlanned') === true
                                ? ''
                                : 'opacity-20 **:cursor-not-allowed'
                        }`}
                    >
                        <li className="mb-4 mt-2">
                            <p>{t('post-process.access_on_plan')}</p>
                            <Controller
                                control={methods.control}
                                name={'sharedReadOnly'}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <div className="flex flex-col mb-4">
                                        <div>
                                            <label>
                                                <input
                                                    type="radio"
                                                    name="sharedReadOnly-false"
                                                    className="border border-gray-400 rounded-lg p-2 mr-2"
                                                    onBlur={onBlur} // notify when input is touched
                                                    onChange={() => onChange(false)} // send value to hook form
                                                    checked={value === false}
                                                    disabled={
                                                        methods.watch('sharePlanned') === false
                                                    }
                                                />
                                                {t('post-process.read_and_import')}
                                                <Tooltip
                                                    tooltipsText={
                                                        <Trans
                                                            i18nKey="post-process.read_and_import_tooltip"
                                                            ns="designer"
                                                            components={{ 1: <br /> }}
                                                        />
                                                    }
                                                >
                                                    <FaRegQuestionCircle className="inline m-1 text-ve-collab-blue" />
                                                </Tooltip>
                                            </label>
                                        </div>
                                        <div>
                                            <label>
                                                <input
                                                    type="radio"
                                                    className="border border-gray-400 rounded-lg p-2 mr-2"
                                                    onBlur={onBlur} // notify when input is touched
                                                    onChange={() => onChange(true)} // send value to hook form
                                                    checked={value === true}
                                                    disabled={
                                                        methods.watch('sharePlanned') === false
                                                    }
                                                />
                                                {t('post-process.read_only')}
                                                <Tooltip
                                                    tooltipsText={
                                                        <Trans
                                                            i18nKey="post-process.read_only_tooltip"
                                                            ns="designer"
                                                            components={{ 1: <br /> }}
                                                        />
                                                    }
                                                >
                                                    <FaRegQuestionCircle className="inline m-1  text-ve-collab-blue" />
                                                </Tooltip>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            />
                        </li>
                        <li className="mb-4 mt-2">
                            <p>{t('post-process.abstract_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.abstract_placeholder')}
                                disabled={methods.watch('sharePlanned') === false}
                                {...methods.register('abstract')}
                            />
                        </li>
                        {methods.formState.errors?.abstract && (
                            <p className="text-red-600 pt-2 flex justify-center">
                                {t(methods.formState.errors?.abstract?.message!)}
                            </p>
                        )}
                        <li className="mb-4">
                            <p className="font-bold">{t('post-process.reflection')}</p>
                            <p className="mb-1">{t('post-process.reflection_task_1')}</p>
                            <p>{t('post-process.reflection_task_2')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.reflection_placeholder')}
                                disabled={methods.watch('sharePlanned') === false}
                                {...methods.register('reflection')}
                            />
                            {methods.formState.errors?.reflection && (
                                <p className="text-red-600 pt-2 flex justify-center">
                                    {t(methods.formState.errors?.reflection?.message!)}
                                </p>
                            )}
                            {methods.watch('evaluationFile') ? (
                                <div>
                                    <div
                                        className="max-w-[250px] flex items-center"
                                        title={methods.watch('evaluationFile')?.file_name}
                                    >
                                        <AuthenticatedFile
                                            url={
                                                methods.watch('evaluationFile')?.file_id ===
                                                undefined
                                                    ? ''
                                                    : `/uploads/${
                                                          methods.watch('evaluationFile')?.file_id
                                                      }`
                                            }
                                            filename={
                                                methods.watch('evaluationFile')?.file_name as string
                                            }
                                            title={methods.watch('evaluationFile')?.file_name}
                                            className="flex"
                                        >
                                            <RxFile size={30} className="m-1" />
                                            <div className="truncate py-2">
                                                {methods.watch('evaluationFile')?.file_name}
                                            </div>
                                        </AuthenticatedFile>

                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                methods.clearErrors('evaluationFile');
                                                setChangedEvFile(true);
                                                methods.setValue('evaluationFile', undefined);
                                            }}
                                            disabled={methods.watch('sharePlanned') === false}
                                            className={`ml-2 p-2 rounded-full ${
                                                methods.watch('sharePlanned') === true
                                                    ? 'cursor-pointer hover:bg-ve-collab-blue-light'
                                                    : ''
                                            }`}
                                            title={t('common:delete_file')}
                                        >
                                            <IoMdClose />
                                        </button>
                                    </div>
                                    {methods.formState.errors?.evaluationFile?.size?.message && (
                                        <p className="text-red-500">
                                            {t(
                                                methods.formState.errors?.evaluationFile?.size
                                                    ?.message!
                                            )}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>{evaluationFileSelector()}</>
                            )}
                        </li>
                        <li className="mb-4">
                            <p>
                                {t('post-process.update_task_1')}
                                <Link
                                    className="underline text-ve-collab-blue"
                                    href={{
                                        pathname: '/ve-designer/steps',
                                        query: {
                                            plannerId: router.query.plannerId,
                                        },
                                    }}
                                >
                                    {t('common:here')}
                                </Link>
                                {t('post-process.update_task_2')}
                            </p>
                        </li>
                        <li className="mb-4">
                            <p>{t('post-process.ve_model_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-3 mt-2"
                                rows={5}
                                placeholder={t('post-process.ve_model_placeholder')}
                                disabled={methods.watch('sharePlanned') === false}
                                {...methods.register('veModel')}
                            />
                        </li>
                        {methods.formState.errors?.veModel && (
                            <p className="text-red-600 pt-2 flex justify-center">
                                {t(methods.formState.errors?.veModel?.message!)}
                            </p>
                        )}
                        <li className="mb-4">
                            <p>{t('post-process.literature_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.literature_placeholder')}
                                disabled={methods.watch('sharePlanned') === false}
                                {...methods.register('literature')}
                            />
                            {methods.formState.errors?.literature && (
                                <p className="text-red-600 pt-2 flex justify-center">
                                    {t(methods.formState.errors?.literature?.message!)}
                                </p>
                            )}
                            {litFiles.length > 0 && (
                                <div>
                                    <div className="mb-4 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                                        {litFiles.map((file, index) => (
                                            <div
                                                key={file.id}
                                                className="max-w-[250px] mr-4 flex flex-wrap items-center"
                                            >
                                                <div className="flex truncate items-center">
                                                    <AuthenticatedFile
                                                        url={`/uploads/${file.id}`}
                                                        filename={file.file_name}
                                                        title={file.file_name}
                                                        className="flex truncate"
                                                    >
                                                        <RxFile size={30} className="m-1" />
                                                        <div className="truncate py-2">
                                                            {file.file_name}
                                                        </div>
                                                    </AuthenticatedFile>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            methods.clearErrors(
                                                                `literatureFiles.${index}.file`
                                                            );
                                                            setDeletedLitFiles((prev) => [
                                                                ...prev,
                                                                file,
                                                            ]);
                                                            rmLitFile(index);
                                                        }}
                                                        disabled={
                                                            methods.watch('sharePlanned') === false
                                                        }
                                                        className={`ml-2 p-2 rounded-full ${
                                                            methods.watch('sharePlanned') === true
                                                                ? 'cursor-pointer hover:bg-ve-collab-blue-light'
                                                                : ''
                                                        }`}
                                                        title={t('common:delete_file')}
                                                    >
                                                        <IoMdClose />
                                                    </button>
                                                </div>
                                                {methods.formState.errors?.literatureFiles?.[index]
                                                    ?.size?.message && (
                                                    <p className="text-red-500">
                                                        {t(
                                                            methods.formState.errors
                                                                ?.literatureFiles?.[index]?.size
                                                                ?.message!
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {methods.formState.errors?.literatureFiles?.message && (
                                        <p className="text-red-500">
                                            {t(methods.formState.errors?.literatureFiles?.message!)}
                                        </p>
                                    )}
                                </div>
                            )}
                            {literatureFileSelector()}
                        </li>
                    </ol>
                    <div
                        className={`flex flex-col justify-between mt-4 pt-6 ${
                            methods.watch('sharePlanned') === true
                                ? ''
                                : 'opacity-50 **:cursor-not-allowed'
                        }`}
                    >
                        <div>
                            <p className="font-medium">{t('post-process.publish_now')}</p>
                            <p className="text-sm text-gray-600">
                                {t('post-process.disclaimer_now_good_practice1')}
                            </p>
                            <p className="text-sm text-gray-600">
                                {t('post-process.disclaimer_now_good_practice2')}
                            </p>
                        </div>
                        <Controller
                            control={methods.control}
                            name={'share'}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <div className="flex w-40 mb-4">
                                    <label className="px-2 py-2" htmlFor="yes">
                                        {t('common:yes')}
                                    </label>
                                    <input
                                        type="radio"
                                        id="yes"
                                        className="border border-gray-400 rounded-lg p-2"
                                        onBlur={onBlur} // notify when input is touched
                                        onChange={() => onChange(true)} // send value to hook form
                                        disabled={methods.watch('sharePlanned') === false}
                                        checked={value === true}
                                    />
                                    <label className="px-2 py-2" htmlFor="no">
                                        {t('common:no')}
                                    </label>
                                    <input
                                        type="radio"
                                        id="no"
                                        className="border border-gray-400 rounded-lg p-2"
                                        onBlur={onBlur} // notify when input is touched
                                        onChange={() => onChange(false)} // send value to hook form
                                        disabled={methods.watch('sharePlanned') === false}
                                        checked={value === false}
                                    />
                                </div>
                            )}
                        />
                    </div>
                </div>
            </Wrapper>
        </>
    );
}

export function PostProcessNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']);

    const methods = useForm<FormValues>({});

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('post-process.title')}
                pageSlug={'ve-designer/post-process'}
                pageDescription={t('post-process.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('post-process.title')}
                subtitle={t('post-process.subtitle')}
                methods={methods}
                nextpage="/plans"
                nextpageBtnLabel={t('post-process.submit')}
                preventToLeave={false}
                stageInMenu="post-process"
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview
            >
                <div className="py-6 divide-y divide-gray-200">
                    <div className="flex flex-col justify-between mb-3">
                        <div>
                            <p className="font-medium">{t('post-process.text_1')}</p>
                            <p>{t('post-process.text_2')}</p>
                            <p>
                                ({t('post-process.license') + ' '}
                                <Link
                                    className="underline text-ve-collab-blue"
                                    href={
                                        'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.de'
                                    }
                                    aria-disabled
                                >
                                    CC-BY-NC-ND 4.0
                                </Link>
                                )
                            </p>
                        </div>

                        <div className="flex w-40 mb-4">
                            <label className="px-2 py-2">{t('common:yes')}</label>
                            <input
                                type="radio"
                                className="border border-gray-400 rounded-lg p-2"
                                disabled
                                checked
                            />
                            <label className="px-2 py-2">{t('common:no')}</label>
                            <input
                                type="radio"
                                className="border border-gray-400 rounded-lg p-2"
                                disabled
                            />
                        </div>
                    </div>

                    <ol className="mt-4 pt-6 px-6 list-decimal list-outside marker:font-bold">
                        <li className="mb-4 mt-2">
                            <p>{t('post-process.access_on_plan')}</p>

                            <div className="flex flex-col mb-4">
                                <div>
                                    <label>
                                        <input
                                            type="radio"
                                            name="sharedReadOnly-false"
                                            className="border border-gray-400 rounded-lg p-2 mr-2"
                                            disabled
                                        />
                                        {t('post-process.read_and_import')}
                                    </label>
                                </div>
                                <div>
                                    <label>
                                        <input
                                            type="radio"
                                            className="border border-gray-400 rounded-lg p-2 mr-2"
                                            disabled
                                        />
                                        {t('post-process.read_only')}
                                    </label>
                                </div>
                            </div>
                        </li>
                        <li className="mb-4 mt-2">
                            <p>{t('post-process.abstract_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.abstract_placeholder')}
                                disabled
                            />
                        </li>

                        <li className="mb-4">
                            <p className="font-bold">{t('post-process.reflection')}</p>
                            <p className="mb-1">{t('post-process.reflection_task_1')}</p>
                            <p>{t('post-process.reflection_task_2')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.reflection_placeholder')}
                                disabled
                            />

                            <>
                                <label
                                    className="inline-block cursor-default bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg"
                                    htmlFor={'name'}
                                >
                                    {t('common:add_file')}
                                </label>
                                <input id={'name'} type="file" className="hidden" disabled />
                            </>
                        </li>
                        <li className="mb-4">
                            <p>
                                {t('post-process.update_task_1')}
                                <Link
                                    className="underline text-ve-collab-blue"
                                    href={{
                                        pathname: '/ve-designer/steps',
                                    }}
                                    target="_blank"
                                    aria-disabled
                                >
                                    {t('common:here')}
                                </Link>
                                {t('post-process.update_task_2')}
                            </p>
                        </li>
                        <li className="mb-4">
                            <p>{t('post-process.ve_model_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-3 mt-2"
                                rows={5}
                                placeholder={t('post-process.ve_model_placeholder')}
                                disabled
                            />
                        </li>
                        <li className="mb-4">
                            <p>{t('post-process.literature_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.literature_placeholder')}
                                disabled
                            />

                            <>
                                <>
                                    <label
                                        className="inline-block cursor-default bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg"
                                        htmlFor={'name'}
                                    >
                                        {t('common:add_file_multiple')}
                                    </label>
                                    <input
                                        id={'name'}
                                        type="file"
                                        disabled
                                        className="hidden"
                                        multiple
                                    />
                                </>
                            </>
                        </li>
                    </ol>
                    <div className={`flex flex-col justify-between mt-4 pt-6`}>
                        <div>
                            <p className="font-medium">{t('post-process.publish_now')}</p>
                            <p className="text-sm text-gray-600">
                                {t('post-process.disclaimer_now_good_practice1')}
                            </p>
                            <p className="text-sm text-gray-600">
                                {t('post-process.disclaimer_now_good_practice2')}
                            </p>
                        </div>
                        <div className="flex w-40 mb-4">
                            <label className="px-2 py-2">{t('common:yes')}</label>
                            <input
                                type="radio"
                                className="border border-gray-400 rounded-lg p-2"
                                disabled
                                checked
                            />
                            <label className="px-2 py-2">{t('common:no')}</label>
                            <input
                                type="radio"
                                className="border border-gray-400 rounded-lg p-2"
                                disabled
                            />
                        </div>
                    </div>
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-white/75 to-white pointer-events-none"></div>
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
