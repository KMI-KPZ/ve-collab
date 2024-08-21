import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { fetchDELETE } from '@/lib/backend';
import { AuthenticatedFile } from '@/components/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import {
    ISideProgressBarStates,
    initialSideProgressBarStates,
} from '@/interfaces/ve-designer/sideProgressBar';
import { Socket } from 'socket.io-client';
import { IoMdClose } from 'react-icons/io';
import { dropPlanLock } from '@/components/VE-designer/PlanSocket';

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
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [backToOverview, setBackToOverview] = useState<boolean>(false)

    const [changedEvFile, setChangedEvFile] = useState<boolean>(false)
    const [originalEvFile, setOriginalEvFile] = useState<EvaluationFile>()
    const [deletedLitFiles, setDeletedLitFiles] = useState<LiteratureFile[]>([])

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            share: false,
        },
    });

    const { fields: litFiles, append: addLitFile, remove: rmLitFile, replace: replaceLitFiles } = useFieldArray({
        name: 'literatureFiles',
        control: methods.control,
    });

    useEffect(() => {
        // route back to /plans after click submit button
        // TODO how to call Wrapper.handleSubmit manually!?!
        if (methods.formState.isSubmitSuccessful && backToOverview) {
            dropPlanLock(socket, router.query.plannerId)
            .then(d => router.push('/plans'))
        }
    }, [router, socket, backToOverview, methods.formState.isSubmitSuccessful])

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            setChangedEvFile(false)
            setOriginalEvFile(undefined)
            replaceLitFiles([])

            if (plan.is_good_practise !== null) {
                methods.setValue('share', plan.is_good_practise);
            }
            methods.setValue('abstract', plan.abstract as string);
            methods.setValue('veModel', plan.underlying_ve_model as string);
            methods.setValue('reflection', plan.reflection as string);
            methods.setValue('evaluation', plan.good_practise_evaluation as string);

            if (plan.evaluation_file) {
                const evaluationFile = {...plan.evaluation_file, file: new File([''], plan.evaluation_file.file_name)}
                methods.setValue('evaluationFile', evaluationFile );
                setOriginalEvFile(evaluationFile)
            }

            if (plan.literature) methods.setValue('literature', plan.literature as string);
            if (plan.literature_files) {
                plan.literature_files.map(file => {
                    addLitFile({
                        file: new File([''], file.file_name),
                        file_name: file.file_name,
                        size: file.size,
                        file_id: file.file_id
                    })
                })
            }
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }

            return {
                abstract: plan.abstract,
                share: plan.is_good_practise,
                veModel: plan.underlying_ve_model,
                reflection: plan.reflection,
                evaluation: plan.good_practise_evaluation,
                evaluationFile: plan.evaluation_file,
                literature: plan.literature,
                literatureFiles: plan.literature_files

            }
        },
        [methods, addLitFile, replaceLitFiles]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (changedEvFile && originalEvFile) {
            await removeFromBackend("evaluation", originalEvFile)
        }

        if (data.evaluationFile?.file) {
            await uploadToBackend("evaluation", data.evaluationFile!);
        }

        if (deletedLitFiles.length) {
            deletedLitFiles.map(async file => {
                await removeFromBackend("literature", file)
            })
        }
        if (data.literatureFiles) {
            for (const file of data.literatureFiles) {
                await uploadToBackend("literature", file);
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
                field_name: 'good_practise_evaluation',
                value: data.evaluation,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'literature',
                value: data.literature,
            },
        ]
    };

    const removeFromBackend = async (type: "evaluation"|"literature", file: EvaluationFile|LiteratureFile) => {
        // if file doesnt has a file_id it wasnt yet uploaded
        if (!file.file_id) return true

        const url = type == "evaluation"
            ? `/planner/remove_evaluation_file`
            : `/planner/remove_literature_file`

        return await fetchDELETE(
            `${url}?plan_id=${router.query.plannerId}&file_id=${file.file_id}`,
            {},
            session?.accessToken
        );
    }

    const uploadToBackend = async (type: "evaluation"|"literature", file: EvaluationFile|LiteratureFile) => {
        // if file already has a file_id it was already uploaded
        if (file.file_id) return true

        const body = new FormData();
        body.append('file', file.file);

        const headers: { Authorization?: string } = {};
        headers['Authorization'] = 'Bearer ' + session?.accessToken;

        const url = type == "evaluation"
            ? `/planner/put_evaluation_file`
            : `/planner/put_literature_file`

        // upload as form data instead of json
        return await fetch(
            process.env.NEXT_PUBLIC_BACKEND_BASE_URL +
                url + `?plan_id=${router.query.plannerId}`,
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
                            return (!value?.size || value.size < 5242880) || 'max. 5 MB erlaubt'
                        }
                    }}
                    render={({ field: { ref, name, onBlur, onChange } }) => (
                        <>
                            <label
                                className="inline-block cursor-pointer bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg hover:bg-opacity-60"
                                htmlFor={name}
                            >
                                Datei hinzufügen
                            </label>
                            <input
                                id={name}
                                type="file"
                                ref={ref}
                                name={name}
                                onBlur={onBlur}
                                onChange={(e) => {
                                    const file = e.target?.files?.item(0)
                                    if (!file) return
                                    setChangedEvFile(true)
                                    onChange({
                                        file: file,
                                        file_name: file.name,
                                        size: file.size
                                    })
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
        if (litFiles.length >= 5) return (<></>)
        return (
            <>
                <Controller
                    name={"literatureFiles"}
                    control={methods.control}
                    rules={{
                        // max 5MB allowed
                        validate: (value) => {
                            if (!value) return

                            let i = 0
                            for (const file of value!) {
                                if (file.size > 5242880) {
                                    methods.setError(`literatureFiles.${i}.file`, {type: "custom", message: 'max. 5 MB erlaubt'})
                                }
                                i++
                            }
                            return true
                        }
                    }}
                    render={({ field: { ref, name, onBlur, onChange } }) => (
                        <>
                            <label
                                className="inline-block cursor-pointer bg-ve-collab-blue text-white px-4 py-2 my-2 rounded-md shadow-lg hover:bg-opacity-60"
                                htmlFor={name}
                            >
                                Datei(en) hinzufügen
                            </label>
                            <input
                                id={name}
                                type="file"
                                ref={ref}
                                name={name}
                                onBlur={onBlur}
                                onChange={(e) =>  {
                                    if (!e.target?.files) return
                                    methods.clearErrors(`literatureFiles`)
                                    let i = 0
                                    for (const file of e.target.files) {
                                        if (i < 5) {
                                            addLitFile( {
                                                file: file,
                                                file_name: file.name,
                                                size: file.size
                                            } )
                                        } else {
                                            methods.setError(`literatureFiles`, {type: "custom", message: 'max. 5 Dateien erlaubt'})
                                        }
                                        i++
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
            title="Nachbearbeitung"
            subtitle="Kehrt hierher zurück, nachdem ihr den VE durchgeführt habt."
            tooltip={{
                text: 'Ausführliche Informationen zur Etappenplanung und verschiedenen Typen und Modellen von VA findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material/left-bubble/Etappenplanung',
            }}
            methods={methods}
            preventToLeave={false}
            stageInMenu="post-process"
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="py-6 divide-y">
                <div className="flex flex-col justify-between mb-3">
                    <div>
                        <p className="font-medium">
                            Möchtest du euren VE als Good Practice der Community zur Verfügung
                            stellen?
                        </p>
                        <p>
                            Jeder kann die Planung finden, anschauen und als Inspiration für eigene
                            VE&apos;s nutzen.
                        </p>
                        <p>
                            (Lizenz:{' '}
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
                                <label className="px-2 py-2">Ja</label>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(true)} // send value to hook form
                                    checked={value === true}
                                />
                                <label className="px-2 py-2">Nein</label>
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
                            <p>
                            Bitte verfasse hier ein kurzes Abstract von ca. 5 Zeilen,
                            in dem du die wichtigsten Eckpunkte deines VE (Partner*innen, Inhalt, Ablauf) ganz kurz zusammenfasst.
                            </p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder="Kurze Beschreibung deines VE ..."
                                {...methods.register('abstract')}
                            />
                        </li>
                        <li className="mb-4">
                            <p className="font-bold">Reflexion:</p>
                            <p className="mb-1">
                                Was hat deiner Meinung nach gut funktioniert? Was waren
                                Herausforderungen und wie bist du damit umgegangen? Was würdest du
                                das nächste Mal anders machen?
                            </p>
                            <p>
                                Lasse hier deine eigenen Erfahrungen und das Feedback deiner
                                Lernenden einfließen. Falls vorhanden, kannst du eine Datei mit
                                Evaluationsergebnissen hochladen.
                            </p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder="Beschreibe deine Reflexion"
                                {...methods.register('reflection')}
                            />
                            {(methods.watch('evaluationFile')) ? (
                                <div>
                                    <div
                                        className="max-w-[250px] flex items-center"
                                        title={methods.watch('evaluationFile')?.file_name}
                                    >
                                        <AuthenticatedFile
                                            url={methods.watch('evaluationFile')?.file_id === undefined
                                                ? ""
                                                : `/uploads/${methods.watch('evaluationFile')?.file_id}`}
                                            filename={methods.watch('evaluationFile')?.file_name as string}
                                            title={methods.watch('evaluationFile')?.file_name}
                                            className='flex'
                                        >
                                            <RxFile size={30} className="m-1" />
                                            <div className="truncate py-2">{methods.watch('evaluationFile')?.file_name}</div>
                                        </AuthenticatedFile>

                                        <button onClick={(e) => {
                                            e.preventDefault()
                                            methods.clearErrors("evaluationFile")
                                            setChangedEvFile(true)
                                            methods.setValue("evaluationFile", undefined)
                                        }} className="ml-2 p-2 rounded-full hover:bg-ve-collab-blue-light" title="Datei Entfernen">
                                                <IoMdClose />
                                        </button>
                                    </div>
                                    {methods.formState.errors?.evaluationFile?.message && (
                                        <p className="text-red-500">
                                            {methods.formState.errors?.evaluationFile?.message}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>{evaluationFileSelector()}</>
                            )}
                        </li>
                        <li className="mb-4">
                            <p>
                                Bist du (aus didaktischen und / oder organisatorischen Gründen)
                                schon während der Durchführung deines VE vom ursprünglichen Plan
                                abgewichen? Dann passe bitte die tatsächliche Umsetzung im VE-Planer
                                an (Etappenplanung, Lernaktivität, etc.). Nutze die
                                Navigationsleiste oben oder klicke{' '}
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
                                    hier
                                </Link>
                                , um zurück zur Grobplanung zu gelangen.
                            </p>
                        </li>
                        <li className="mb-4">
                            <p>
                                Basierte der VE auf einem bekannten VE-Modell? Wenn ja, auf welchem?
                                (Diese Information hilft uns bei der zukünftigen Verbesserung von
                                VE-Collab)
                            </p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-3 mt-2"
                                rows={5}
                                placeholder="Beschreibe das zugrundeliegende VE-Modell"
                                {...methods.register('veModel')}
                            />
                        </li>
                        <li className="mb-4">
                            <p>
                                Gib hier Literaturangaben z. B. zu relevanten Veröffentlichungen an oder lade Artikel hoch,
                                die du der Community zur Verfügung stellen möchtest. Achte dabei auf mögliche Copyright-Beschränkungen.
                            </p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-4 my-4"
                                rows={5}
                                placeholder="Relevante Literaturangaben"
                                {...methods.register('literature')}
                            />
                            {litFiles.length > 0 && (
                                <div>
                                    <div className="mb-4 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                                        {litFiles.map((file, index) => (
                                            <div key={index} className="max-w-[250px] mr-4 flex flex-wrap items-center">
                                                <div className="flex truncate items-center">
                                                    <AuthenticatedFile
                                                        url={`/uploads/${
                                                            file.id
                                                        }`}
                                                        filename={file.file_name}
                                                        title={file.file_name}
                                                        className='flex truncate'
                                                    >
                                                        <RxFile size={30} className="m-1" />
                                                        <div className="truncate py-2">{file.file_name}</div>
                                                    </AuthenticatedFile>
                                                    <button onClick={(e) => {
                                                        e.preventDefault()
                                                        methods.clearErrors(`literatureFiles.${index}.file`)
                                                        setDeletedLitFiles(prev => [...prev, file])
                                                        rmLitFile(index)
                                                    }} className="ml-2 p-2 rounded-full hover:bg-ve-collab-blue-light" title="Datei Entfernen">
                                                            <IoMdClose />
                                                    </button>
                                                </div>

                                                {methods.formState.errors?.literatureFiles?.[index]?.file?.message && (
                                                    <p className="text-red-500">
                                                        {methods.formState.errors?.literatureFiles?.[index]?.file?.message}
                                                    </p>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                    {methods.formState.errors?.literatureFiles?.message && (
                                        <p className="text-red-500">
                                            {methods.formState.errors?.literatureFiles?.message}
                                        </p>
                                    )}
                                </div>
                            )}
                            {literatureFileSelector()}
                        </li>
                    </ol>
                )}
            </div>

            <div className="mb-4 text-right w-full">
                <button
                    type="submit"
                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg mr-2"
                    onClick={e => {
                        setBackToOverview(true)
                    }}
                >
                    Absenden & zur Übersicht
                </button>
            </div>
        </Wrapper>
    );
}
