import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { fetchPOST } from '@/lib/backend';
import { AuthenticatedFile } from '@/components/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';
import Wrapper2 from '@/components/VE-designer/Wrapper2';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import {
    ISideProgressBarStates,
    initialSideProgressBarStates,
} from '@/interfaces/ve-designer/sideProgressBar';
import { Socket } from 'socket.io-client';

export interface EvaluationFile {
    file_id: string;
    file_name: string;
}

interface FormValues {
    share: boolean;
    veModel: string;
    reflection: string;
    evaluation: string;
    evaluationFile: FileWithOptionalId;
}
interface FileWithOptionalId extends File {
    file_id?: string;
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

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            share: false,
        },
    });

    const uploadToBackend = async (file: File) => {
        const body = new FormData();
        body.append('file', file);

        const headers: { Authorization?: string } = {};
        headers['Authorization'] = 'Bearer ' + session?.accessToken;

        // upload as form data instead of json
        await fetch(
            process.env.NEXT_PUBLIC_BACKEND_BASE_URL +
                `/planner/put_evaluation_file?plan_id=${router.query.plannerId}`,
            {
                method: 'POST',
                headers: headers,
                body,
            }
        );
    };

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            if (plan.is_good_practise !== null) {
                methods.setValue('share', plan.is_good_practise);
            }
            methods.setValue('veModel', plan.underlying_ve_model as string);
            methods.setValue('reflection', plan.reflection as string);
            methods.setValue('evaluation', plan.good_practise_evaluation as string);
            const backendFile: EvaluationFile = plan.evaluation_file;
            if (backendFile !== null) {
                const randomFile: File = new File([''], backendFile.file_name);
                const fileWithId: FileWithOptionalId = Object.assign(randomFile, {
                    id: backendFile.file_id,
                });
                methods.setValue('evaluationFile', fileWithId);
            }
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
            console.log('backendFile', plan.evaluation_file);
        },
        [methods]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'is_good_practise',
                        value: data.share,
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
                ],
            },
            session?.accessToken
        );
        if (data.evaluationFile) {
            await uploadToBackend(data.evaluationFile);
        }
    };

    function renderFileInput() {
        return (
            <>
                <Controller
                    name="evaluationFile"
                    control={methods.control}
                    rules={{
                        // = 5MB allowed
                        validate: (value) => value.size < 5242880 || 'max. 5 MB erlaubt',
                    }}
                    render={({ field: { ref, name, onBlur, onChange } }) => (
                        <>
                            <label
                                className="cursor-pointer bg-ve-collab-blue text-white px-4 py-2 rounded-md shadow-lg hover:bg-opacity-60"
                                htmlFor={name}
                            >
                                Wähle eine Datei
                            </label>
                            <input
                                id={name}
                                type="file"
                                ref={ref}
                                name={name}
                                onBlur={onBlur}
                                onChange={(e) => {
                                    onChange(e.target?.files?.item(0));
                                }}
                                className="hidden"
                            />
                        </>
                    )}
                />
                {methods.formState.errors.evaluationFile &&
                    typeof methods.formState.errors.evaluationFile.message === 'string' && (
                        <p className="text-red-500">
                            {methods.formState.errors.evaluationFile.message}
                        </p>
                    )}
            </>
        );
    }

    return (
        <Wrapper2
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
            <div className="p-6 w-[60rem] divide-y">
                <div className="flex flex-col items-center justify-between mb-3 mr-3">
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
                                className="border border-gray-400 rounded-lg w-full p-4 mt-4 mb-6"
                                rows={5}
                                placeholder="Beschreibe deine Reflexion"
                                {...methods.register('reflection')}
                            />
                            {methods.watch('evaluationFile') ? (
                                <div
                                    className="max-w-[150px] mb-4"
                                    title={methods.getValues('evaluationFile').name}
                                >
                                    <AuthenticatedFile
                                        url={`/uploads/${
                                            methods.getValues('evaluationFile').file_id
                                        }`}
                                        filename={methods.getValues('evaluationFile').name}
                                    >
                                        <div className="flex justify-center">
                                            <RxFile size={40} />
                                        </div>
                                        <div className="justify-center mx-2 px-1 my-1 font-bold text-slate-900 text-lg text-center truncate">
                                            {methods.getValues('evaluationFile').name}
                                        </div>
                                    </AuthenticatedFile>
                                </div>
                            ) : (
                                <p className="my-2 text-gray-600">Keine Datei vorhanden</p>
                            )}
                            {renderFileInput()}
                            {/*<button
                                // TODO remove button for file, but doesn't work yet
                                className="cursor-pointer bg-ve-collab-blue text-white px-4 py-2 rounded-md shadow-lg hover:bg-opacity-60"
                                onClick={() => {
                                    methods.resetField('evaluationFile');
                                    methods.reset({ ...methods.getValues(), evaluationFile: null });
                                }}
                            >
                                Entfernen
                            </button>*/}
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
                    </ol>
                )}
            </div>

            <div className="flex justify-between w-full max-w-xl">
                <div>
                    <button
                        type="submit"
                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg mr-2"
                        onClick={async (e) => {
                            e.preventDefault();
                            await onSubmit(methods.getValues() as FormValues);
                            socket.emit(
                                'drop_plan_lock',
                                { plan_id: router.query.plannerId },
                                (response: any) => {
                                    // TODO error handling
                                    router.push('/plans');
                                }
                            );
                        }}
                    >
                        Absenden & zur Übersicht
                    </button>
                </div>
            </div>
        </Wrapper2>
    );
}
