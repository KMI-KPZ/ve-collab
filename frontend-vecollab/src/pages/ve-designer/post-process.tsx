import Link from 'next/link';
import { useCallback, useState } from 'react';
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
import { useTranslation } from 'next-i18next';

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
export default function PostProcess({ socket }: Props) {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']);

    const [changedEvFile, setChangedEvFile] = useState<boolean>(false);;
    const [originalEvFile, setOriginalEvFile] = useState<EvaluationFile>();;
    const [deletedLitFiles, setDeletedLitFiles] = useState<LiteratureFile[]>([]);;

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
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
            // if (Object.keys(plan.progress).length) {
            //     setSideMenuStepsProgress(plan.progress);
            // }

            return {
                abstract: plan.abstract,
                share: plan.is_good_practise,
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

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'is_good_practise',
                value: data.share,
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
        // if (methods.watch("evaluationFile")) return (<></>)
        return (
            <>
                <Controller
                    name={'evaluationFile'}
                    control={methods.control}
                    rules={{
                        // max 5MB allowed
                        validate: (value) => {
                            return !value?.size || value.size < 5242880 || t('common:max_5_mb');
                        },
                    }}
                    render={({ field: { ref, name, onBlur, onChange } }) => (
                        <>
                            <label
                                className="inline-block cursor-pointer bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg hover:bg-opacity-60"
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
                    rules={{
                        // max 5MB allowed
                        validate: (value) => {
                            if (!value) return;

                            let i = 0;
                            for (const file of value!) {
                                if (file.size > 5242880) {
                                    methods.setError(`literatureFiles.${i}.file`, {
                                        type: 'custom',
                                        message: t('common:max_5_mb'),
                                    });
                                }
                                i++;
                            }
                            return true;
                        },
                    }}
                    render={({ field: { ref, name, onBlur } }) => (
                        <>
                            <label
                                className="inline-block cursor-pointer bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg hover:bg-opacity-60"
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
                                    if (!e.target?.files) return;
                                    methods.clearErrors(`literatureFiles`);
                                    let i = 0;
                                    for (const file of e.target.files) {
                                        if (i < 5) {
                                            addLitFile({
                                                file: file,
                                                file_name: file.name,
                                                size: file.size,
                                            });
                                        } else {
                                            methods.setError(`literatureFiles`, {
                                                type: 'custom',
                                                message: t('common:max_5_files'),
                                            });
                                        }
                                        i++;
                                    }
                                    // onChange(newFiles)
                                }}
                                className="hidden"
                                multiple
                            />
                        </>
                    )}
                />
            </>
        );
    }

    return (
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
            <div className="py-6 divide-y">
                <div className="flex flex-col justify-between mb-3">
                    <div>
                        <p className="font-medium">{t('post-process.text_1')}</p>
                        <p>{t('post-process.text_2')}</p>
                        <p>
                            ({t('post-process.license') + ' '}
                            <Link
                                className="underline text-ve-collab-blue"
                                href={'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.de'}
                            >
                                CC-BY-NC-ND 4.0
                            </Link>
                            )
                        </p>
                    </div>
                    <Controller
                        control={methods.control}
                        name={'share'}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <div className="flex w-40 mb-4">
                                <label className="px-2 py-2">{t('common:yes')}</label>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(true)} // send value to hook form
                                    checked={value === true}
                                />
                                <label className="px-2 py-2">{t('common:no')}</label>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(false)} // send value to hook form
                                    checked={value === false}
                                />
                            </div>
                        )}
                    />
                </div>

                {methods.watch('share') == true && (
                    <ol className="mt-4 pt-6 px-6 list-decimal list-outside marker:font-bold">
                        <li className="mb-4 mt-2">
                            <p>{t('post-process.abstract_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.abstract_placeholder')}
                                {...methods.register('abstract')}
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
                                {...methods.register('reflection')}
                            />
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
                                            className="ml-2 p-2 rounded-full hover:bg-ve-collab-blue-light"
                                            title="Datei Entfernen"
                                        >
                                            <IoMdClose />
                                        </button>
                                    </div>
                                    {methods.formState.errors?.evaluationFile?.message && (
                                        <p className="text-red-500">
                                            {t(methods.formState.errors?.evaluationFile?.message)}
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
                                        pathname: '/ve-designer/step-names',
                                        query: {
                                            plannerId: router.query.plannerId,
                                        },
                                    }}
                                    target="_blank"
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
                                {...methods.register('veModel')}
                            />
                        </li>
                        <li className="mb-4">
                            <p>{t('post-process.literature_task')}</p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder={t('post-process.literature_placeholder')}
                                {...methods.register('literature')}
                            />
                            {litFiles.length > 0 && (
                                <div>
                                    <div className="mb-4 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                                        {litFiles.map((file, index) => (
                                            <div
                                                key={index}
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
                                                        className="ml-2 p-2 rounded-full hover:bg-ve-collab-blue-light"
                                                        title={t('common:delete_file')}
                                                    >
                                                        <IoMdClose />
                                                    </button>
                                                </div>

                                                {methods.formState.errors?.literatureFiles?.[index]
                                                    ?.file?.message && (
                                                    <p className="text-red-500">
                                                        {
                                                            t(methods.formState.errors
                                                                ?.literatureFiles?.[index]?.file
                                                                ?.message)
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {methods.formState.errors?.literatureFiles?.message && (
                                        <p className="text-red-500">
                                            {t(methods.formState.errors?.literatureFiles?.message)}
                                        </p>
                                    )}
                                </div>
                            )}
                            {literatureFileSelector()}
                        </li>
                    </ol>
                )}
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
    };
}
