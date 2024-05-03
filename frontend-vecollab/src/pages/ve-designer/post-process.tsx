import LoadingAnimation from '@/components/LoadingAnimation';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { ChangeEvent, useEffect, useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import { defaultFineStepData } from './step-names';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import { useRouter } from 'next/router';
import WhiteBox from '@/components/Layout/WhiteBox';
import { useSession } from 'next-auth/react';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { AuthenticatedFile } from '@/components/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';

PostProcess.auth = true;
export default function PostProcess() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const [steps, setSteps] = useState<IFineStep[]>([defaultFineStepData]);
    const [shareAsGoodPractiseChosen, setShareAsGoodPractiseChosen] = useState(false);
    const [veModel, setVeModel] = useState('');
    const [reflection, setReflection] = useState('');
    const [evaluation, setEvaluation] = useState('');
    const [evaluationFile, setEvaluationFile] = useState<{
        file_id: string;
        file_name: string;
    } | null>();
    const [uploadFile, setUploadFile] = useState<Blob>();

    const onSubmit = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'is_good_practise',
                        value: shareAsGoodPractiseChosen,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'underlying_ve_model',
                        value: veModel,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'reflection',
                        value: reflection,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'good_practise_evaluation',
                        value: evaluation,
                    },
                ],
            },
            session?.accessToken
        );

        if (uploadFile) {
            await uploadToBackend();
        }

        await router.push({ pathname: '/plans' });
    };

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

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/plans');
            return;
        }

        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    if (data.plan.steps?.length > 0) {
                        setSteps(data.plan.steps);
                    }
                    setShareAsGoodPractiseChosen(data.plan.is_good_practise);
                    setVeModel(data.plan.underlying_ve_model);
                    setReflection(data.plan.reflection);
                    setEvaluation(data.plan.good_practise_evaluation);
                    setEvaluationFile(data.plan.evaluation_file);
                }
            );
        }
    }, [session, status, router]);

    return (
        <div className="flex bg-pattern-left-blue-small bg-no-repeat">
            <div className="flex flex-grow justify-center">
                <div className="flex flex-col">
                    <HeadProgressBarSection stage={4} linkFineStep={steps[0]?.name} />
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <form className="gap-y-6 w-full p-12 max-w-7xl items-center flex flex-col flex-grow justify-between">
                            <div>
                                <div className="flex justify-center">
                                    <div
                                        className={
                                            'text-center font-bold text-4xl mb-2 relative w-fit'
                                        }
                                    >
                                        Nach dem VE
                                        <Tooltip tooltipsText="Ausführliche Informationen zur Etappenplanung und verschiedenen Typen und Modellen von VA findest du hier in den Selbstlernmaterialien …">
                                            <Link target="_blank" href={'/learning-material/leftBubble/Etappenplanung'}>
                                                <FiInfo size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className={'text-center mb-10'}>
                                    kehre hierher zurück, nachdem du den VE durchgeführt hast
                                </div>
                            </div>
                            <WhiteBox>
                                <div className="p-6 w-[60rem] divide-y">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p>
                                                Möchtest du euren VE als Good Practice der Community
                                                zur Verfügung stellen?
                                            </p>
                                            <p>
                                                (Lizenz:{' '}
                                                <Link
                                                    className="underline text-ve-collab-blue"
                                                    href={
                                                        'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.de'
                                                    }
                                                >
                                                    CC-BY-NC-ND 4.0
                                                </Link>
                                                )
                                            </p>
                                        </div>
                                        <div className="flex w-40">
                                            <label className="px-2 py-2">Ja</label>
                                            <input
                                                type="radio"
                                                name="physicalMobility"
                                                value="true"
                                                checked={shareAsGoodPractiseChosen}
                                                className="border border-gray-400 mr-2"
                                                onChange={() => setShareAsGoodPractiseChosen(true)}
                                            />
                                            <label className="px-2 py-2 ml-2">Nein</label>
                                            <input
                                                type="radio"
                                                name="physicalMobility"
                                                value="false"
                                                checked={!shareAsGoodPractiseChosen}
                                                className="border border-gray-400"
                                                onChange={() => setShareAsGoodPractiseChosen(false)}
                                            />
                                        </div>
                                    </div>
                                    {shareAsGoodPractiseChosen && (
                                        <ol className="mt-3 pt-6 px-6 list-decimal">
                                            <li className="mb-4">
                                                <p>
                                                    Passe bitte die tatsächliche Umsetzung im
                                                    VE-Planer an (Etappenplanung, Aufgabenfolgen,
                                                    etc.). Nutze die Navigationsleiste oben oder
                                                    klicke{' '}
                                                    <Link
                                                        className="underline text-ve-collab-blue"
                                                        href={{
                                                            pathname: '/ve-designer/broadPlanner',
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
                                                    Basierte der VE auf einem bekannten VE-Modell?
                                                    Wenn ja, auf welchem?
                                                </p>
                                                <textarea
                                                    className="border border-gray-400 rounded-lg w-full p-2 mt-2"
                                                    rows={5}
                                                    placeholder="Beschreibe das zugrundeliegende VE-Modell"
                                                    value={veModel}
                                                    onChange={(e) => setVeModel(e.target.value)}
                                                />
                                            </li>
                                            <li className="mb-4">
                                                <p>
                                                    Reflexion: Was hat deiner Meinung nach gut
                                                    funktioniert? Was würdest du das nächste Mal
                                                    anders machen? Was waren Herausforderungen und
                                                    wie bist du damit umgegangen?
                                                </p>
                                                <textarea
                                                    className="border border-gray-400 rounded-lg w-full p-2 mt-2"
                                                    rows={5}
                                                    placeholder="Beschreibe deine Reflexion"
                                                    value={reflection}
                                                    onChange={(e) => setReflection(e.target.value)}
                                                />
                                            </li>
                                            <li className="mb-4">
                                                <p>
                                                    Evaluationsergebnisse / Feedback der
                                                    Teilnehmenden: Fasse die Ergebnisse hier
                                                    zusammen. Falls vorhanden, kannst du gerne eine
                                                    Datei hochladen.
                                                </p>
                                                <textarea
                                                    className="border border-gray-400 rounded-lg w-full p-2 mt-2"
                                                    rows={5}
                                                    placeholder="Beschreibe die Evaluation der Teilnehmenden"
                                                    value={evaluation}
                                                    onChange={(e) => setEvaluation(e.target.value)}
                                                />
                                                {evaluationFile ? (
                                                    <div
                                                        className="max-w-[150px]"
                                                        title={evaluationFile?.file_name}
                                                    >
                                                        <AuthenticatedFile
                                                            url={`/uploads/${evaluationFile.file_id}`}
                                                            filename={evaluationFile.file_name}
                                                        >
                                                            <div className="flex justify-center">
                                                                <RxFile size={40} />
                                                                {/* TODO preview for certain file types*/}
                                                            </div>
                                                            <div className="justify-center mx-2 px-1 my-1 font-bold text-slate-900 text-lg text-center truncate">
                                                                {evaluationFile.file_name}
                                                            </div>
                                                        </AuthenticatedFile>
                                                    </div>
                                                ) : (
                                                    <p className="px-1 my-1 text-gray-600">
                                                        keine Datei vorhanden
                                                    </p>
                                                )}
                                                <input
                                                    type="file"
                                                    className="my-2"
                                                    onChange={uploadToClient}
                                                />
                                            </li>
                                        </ol>
                                    )}
                                </div>
                            </WhiteBox>
                            <div className="flex justify-between w-full max-w-xl">
                                <div>
                                    <Link
                                        href={{
                                            pathname: '/ve-designer/finish',
                                            query: { plannerId: router.query.plannerId },
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg mr-2"
                                        >
                                            Zurück zur Zusammenfassung
                                        </button>
                                    </Link>
                                </div>
                                <div>
                                    <button
                                        type="submit"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg mr-2"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onSubmit();
                                        }}
                                    >
                                        Speichern & zur Übersicht
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
