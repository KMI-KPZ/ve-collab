import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSectionBroadPlanner from '@/components/StartingWizard/SideProgressBarSectionBroadPlanner';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import Link from 'next/link';
import { TooltipList } from '@/components/TooltipList';
import { Tooltip } from '@/components/Tooltip';
import { FiInfo } from 'react-icons/fi';

export interface FormalConditionPartner {
    username: string;
    time: boolean;
    format: boolean;
    topic: boolean;
    goals: boolean;
    languages: boolean;
    media: boolean;
    technicalEquipment: boolean;
    evaluation: boolean;
    institutionalRequirements: boolean;
    dataProtection: boolean;
}

export default function FormalConditions() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [formalConditions, setFormalConditions] = useState<FormalConditionPartner[]>([
        {
            username: 'Dozent*in 1',
            time: false,
            format: false,
            topic: false,
            goals: false,
            languages: false,
            media: false,
            technicalEquipment: false,
            evaluation: false,
            institutionalRequirements: false,
            dataProtection: false,
        },
        {
            username: 'Dozent*in 2',
            time: false,
            format: false,
            topic: false,
            goals: false,
            languages: false,
            media: false,
            technicalEquipment: false,
            evaluation: false,
            institutionalRequirements: false,
            dataProtection: false,
        },
    ]);

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
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    console.log(data.plan);
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                    if (data.plan.formalities && Array.isArray(data.plan.formalities)) {
                        setFormalConditions(data.plan.formalities);
                    }
                }
            );
        }
    }, [session, status, router]);

    const handleSubmit = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'formalities',
                        value: formalConditions,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            formalities: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    const handleCheckboxChange = (
        partnerName: string,
        key: keyof FormalConditionPartner,
        value: boolean
    ) => {
        setFormalConditions((prevFormalCondition) =>
            prevFormalCondition.map((formalCon) =>
                formalCon.username === partnerName ? { ...formalCon, [key]: value } : formalCon
            )
        );
    };

    function renderCheckBoxes(partnerName: string): JSX.Element {
        return (
            <div className="w-4/5 space-y-3 py-8">
                <div className="flex justify-center items-center font-bold text-lg mb-4">
                    {partnerName}
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={formalConditions.find((fc) => fc.username === partnerName)?.time}
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'time', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={[
                            'Zeiten für die gemeinsame Vorbereitung (Zeitplan erstellen)',
                            'Zeitlicher Ablauf des VE',
                            'Zeitslots für den VE, falls synchrone Meetings geplant sind',
                        ]}
                    >
                        <p>Zeit</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={formalConditions.find((fc) => fc.username === partnerName)?.format}
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'format', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList tooltipsTextItems={['Format(e) des VE']}>
                        <p>Format</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={formalConditions.find((fc) => fc.username === partnerName)?.topic}
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'topic', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={[
                            'Thema / Themen des VE, welche(s) mit Modulvorgaben / dem Lehrplan aller beteiligten Partner vereinbar ist / sind',
                        ]}
                    >
                        <p>Thema</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={formalConditions.find((fc) => fc.username === partnerName)?.goals}
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'goals', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={[
                            'Richtlernziele des VE, welche mit Modulvorgaben / dem Lehrplan aller beteiligter Partner verinbar sind',
                        ]}
                    >
                        <p>Ziele</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={
                            formalConditions.find((fc) => fc.username === partnerName)?.languages
                        }
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'languages', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={[
                            'Sprache(n), in der / denen der VE stattfinden soll bzw. in denen im VE kommuniziert werden kann',
                        ]}
                    >
                        <p>Sprache(n)</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={formalConditions.find((fc) => fc.username === partnerName)?.media}
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'media', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={['Learning Management System, das im VE verwendet wird']}
                    >
                        <p>Medien</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={
                            formalConditions.find((fc) => fc.username === partnerName)
                                ?.technicalEquipment
                        }
                        onChange={(e) =>
                            handleCheckboxChange(
                                partnerName,
                                'technicalEquipment',
                                e.target.checked
                            )
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={[
                            'Ausreichende technische Ausstattung zur Durchführung des VE',
                            'Ressourcen für technische Unterstützung während des VE',
                        ]}
                    >
                        <p>Technik</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={
                            formalConditions.find((fc) => fc.username === partnerName)?.evaluation
                        }
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'evaluation', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={[
                            'Vorgehen bei der Bewertung (Art der Leistung und Bewertung), falls Prüfungsleistung im VE',
                        ]}
                    >
                        <p>Bewertung</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={
                            formalConditions.find((fc) => fc.username === partnerName)
                                ?.institutionalRequirements
                        }
                        onChange={(e) =>
                            handleCheckboxChange(
                                partnerName,
                                'institutionalRequirements',
                                e.target.checked
                            )
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList tooltipsTextItems={['Umgang mit Anwesenheit und Mitarbeit']}>
                        <p>institutionelle Gepflogenheiten</p>
                    </TooltipList>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        checked={
                            formalConditions.find((fc) => fc.username === partnerName)
                                ?.dataProtection
                        }
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'dataProtection', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <TooltipList
                        tooltipsTextItems={[
                            'Kenntnis der relevanten Datenschutzbestimmungen deiner Institution / deines Landes',
                        ]}
                    >
                        <p>Datenschutz</p>
                    </TooltipList>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-pattern-left-blue-small bg-no-repeat">
            <div className="flex flex-grow justify-center">
                <div>
                    <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-center">
                            <div>
                                <div className={'text-center font-bold text-4xl mb-2 relative'}>
                                    Formale Rahmenbedingungen
                                    <Tooltip tooltipsText="Mehr zu formalen Rahmenbedingungen findest du hier in den Selbstlernmaterialien …">
                                        <Link target="_blank" href={'/content/Herausforderungen'}>
                                            <FiInfo size={30} color="#00748f" />
                                        </Link>
                                    </Tooltip>
                                </div>
                                <div className={'text-center mb-4'}>optional</div>
                                <div className={'text-center'}>
                                    Bevor es mit der inhaltlichen und didaktischen Planung losgeht:
                                </div>
                                <div className="text-center mb-10">
                                    Sind die folgenden formalen Rahmenbedingungen bei allen
                                    Beteiligten erfüllt?
                                </div>
                                <div className="grid grid-cols-2 gap-1 mt-7  mb-10">
                                    {formalConditions.map((formalConditionPartner, index) => (
                                        <div key={index}>
                                            {renderCheckBoxes(formalConditionPartner.username)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-around w-full">
                                <div>
                                    <Link
                                        href={{
                                            pathname:
                                                '/startingWizard/generalInformation/learningPlatform',
                                            query: { plannerId: router.query.plannerId },
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={() => handleSubmit()}
                                        >
                                            Zurück
                                        </button>
                                    </Link>
                                </div>
                                <div>
                                    <Link
                                        href={{
                                            pathname: '/startingWizard/broadPlanner',
                                            query: { plannerId: router.query.plannerId },
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={() => handleSubmit()}
                                        >
                                            Weiter
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <SideProgressBarSectionBroadPlanner
                progressState={sideMenuStepsProgress}
                handleValidation={() => {}}
                isValid={true}
                sideMenuStepsData={sideMenuStepsData}
            />
        </div>
    );
}
