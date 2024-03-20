import LoadingAnimation from '@/components/LoadingAnimation';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import { defaultFineStepData } from './broadPlanner';
import { IFineStep } from './fineplanner/[stepSlug]';
import { useRouter } from 'next/router';
import WhiteBox from '@/components/Layout/WhiteBox';
import { useSession } from 'next-auth/react';
import { fetchGET, fetchPOST } from '@/lib/backend';

AfterVE.auth = true;
export default function AfterVE() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const [steps, setSteps] = useState<IFineStep[]>([defaultFineStepData]);
    const [shareAsGoodPractiseChosen, setShareAsGoodPractiseChosen] = useState(false);
    const [veModel, setVeModel] = useState('');
    const [reflection, setReflection] = useState('');
    const [evaluation, setEvaluation] = useState('');

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

        await router.push({ pathname: '/overviewProjects' });
    };

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
            return;
        }

        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    if (data.plan.steps?.length > 0) {
                        setSteps(data.plan.steps);
                        setShareAsGoodPractiseChosen(data.plan.is_good_practise);
                        setVeModel(data.plan.underlying_ve_model);
                        setReflection(data.plan.reflection);
                        setEvaluation(data.plan.good_practise_evaluation);
                    }
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
                                            <Link target="_blank" href={'/content/VE-Planung'}>
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
                                                            pathname:
                                                                '/startingWizard/broadPlanner',
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
                                                    zusammen, falls vorhanden.
                                                </p>
                                                <textarea
                                                    className="border border-gray-400 rounded-lg w-full p-2 mt-2"
                                                    rows={5}
                                                    placeholder="Beschreibe die Evaluation der Teilnehmenden"
                                                    value={evaluation}
                                                    onChange={(e) => setEvaluation(e.target.value)}
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
                                            pathname: '/startingWizard/finish',
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
                                        onClick={onSubmit}
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
