import Link from 'next/link';
import { ChangeEvent, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { fetchPOST } from '@/lib/backend';
import { AuthenticatedFile } from '@/components/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';
import Wrapper from '@/components/VE-designer/Wrapper';
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
    evaluationFile: EvaluationFile;
}

interface Props {
    socket: Socket;
}

PostProcess.auth = true;
export default function PostProcess({ socket }: Props) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [uploadFile, setUploadFile] = useState<Blob>();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            share: false,
        },
    });

    const uploadToClient = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setUploadFile(event.target.files[0]);
        }
    };

    const uploadToBackend = async () => {
        // allow max 5 MB
        if (uploadFile!.size > 5242880) {
            alert('max. 5 MB erlaubt');
            return;
        }

        const body = new FormData();
        body.append('file', uploadFile!);

        const headers: { Authorization?: string } = {};
        headers['Authorization'] = 'Bearer ' + session!.accessToken;

        // upload as form data instead of json
        const response = await fetch(
            process.env.NEXT_PUBLIC_BACKEND_BASE_URL +
                `/planner/put_evaluation_file?plan_id=${router.query.plannerId}`,
            {
                method: 'POST',
                headers: headers,
                body,
            }
        );

        const responseJson = await response.json();
        console.log(responseJson);

        setUploadFile(undefined);
    };

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            if (plan.is_good_practise !== null) {
                methods.setValue('share', plan.is_good_practise);
            }
            methods.setValue('veModel', plan.underlying_ve_model as string);
            methods.setValue('reflection', plan.reflection as string);
            methods.setValue('evaluation', plan.good_practise_evaluation as string);
            methods.setValue('evaluationFile', plan.evaluation_file as EvaluationFile);
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
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

        if (uploadFile) {
            await uploadToBackend();
        }
    };

    return (
        <Wrapper
            socket={socket}
            title="Nachbearbeitung"
            subtitle="kehre hierher zurück, nachdem du den VE durchgeführt hast"
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
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p>
                            Möchtest du euren VE als Good Practice der Community zur Verfügung
                            stellen?
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
                            <div className="flex w-40">
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
                    <ol className="mt-3 pt-6 px-6 list-decimal">
                        <li className="mb-4">
                            <p>
                                Reflexion: Was hat deiner Meinung nach gut funktioniert? Was waren
                                Herausforderungen und wie bist du damit umgegangen? Was würdest du
                                das nächste Mal anders machen? Lasse hier deine eigenen Erfahrungen
                                und das Feedback deiner Lernenden einfließen. Falls vorhanden,
                                kannst du eine Datei mit Evaluationsergebnissen hochladen.
                            </p>
                            <textarea
                                className="border border-gray-400 rounded-lg w-full p-2 mt-2"
                                rows={5}
                                placeholder="Beschreibe deine Reflexion"
                                {...methods.register('reflection')}
                            />
                            {methods.watch('evaluationFile') ? (
                                <div
                                    className="max-w-[150px]"
                                    title={methods.getValues('evaluationFile').file_name}
                                >
                                    <AuthenticatedFile
                                        url={`/uploads/${
                                            methods.getValues('evaluationFile').file_id
                                        }`}
                                        filename={methods.getValues('evaluationFile').file_name}
                                    >
                                        <div className="flex justify-center">
                                            <RxFile size={40} />
                                        </div>
                                        <div className="justify-center mx-2 px-1 my-1 font-bold text-slate-900 text-lg text-center truncate">
                                            {methods.getValues('evaluationFile').file_name}
                                        </div>
                                    </AuthenticatedFile>
                                </div>
                            ) : (
                                <p className="px-1 my-1 text-gray-600">keine Datei vorhanden</p>
                            )}
                            <input type="file" className="my-2" onChange={uploadToClient} />
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
                                className="border border-gray-400 rounded-lg w-full p-2 mt-2"
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
                            await onSubmit({} as FormValues);
                            socket.emit(
                                'drop_plan_lock',
                                { plan_id: router.query.plannerId },
                                (response: any) => {
                                    console.log(response);
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
        </Wrapper>
    );
}
