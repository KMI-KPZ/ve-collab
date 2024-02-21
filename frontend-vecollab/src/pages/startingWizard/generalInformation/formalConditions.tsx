import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
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

interface FormalConditionPartner {
    partnerName: string;
    time: boolean;
    place: boolean;
    technicalEquipment: boolean;
    institutionalRequirements: boolean;
    examinationRegulations: boolean;
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
            partnerName: session!.user.name as string,
            time: false,
            place: false,
            technicalEquipment: false,
            institutionalRequirements: false,
            examinationRegulations: false,
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
        console.log('Submitted data:', formalConditions);
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
                formalCon.partnerName === partnerName ? { ...formalCon, [key]: value } : formalCon
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
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'place', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p> Ort / Raum</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        onChange={(e) =>
                            handleCheckboxChange(
                                partnerName,
                                'technicalEquipment',
                                e.target.checked
                            )
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p>Technik</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        onChange={(e) =>
                            handleCheckboxChange(
                                partnerName,
                                'institutionalRequirements',
                                e.target.checked
                            )
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p>Institutionelle Vorgaben</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        onChange={(e) =>
                            handleCheckboxChange(
                                partnerName,
                                'examinationRegulations',
                                e.target.checked
                            )
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p>Prüfungsordnung (Prüfungsleistung, Anrechnung etc.)</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        onChange={(e) =>
                            handleCheckboxChange(partnerName, 'dataProtection', e.target.checked)
                        }
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p>Datenschutz</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Formale Rahmenbedingungen
                            </div>
                            <div className={'text-center mb-4'}>optional</div>
                            <div className={'text-center'}>
                                Bevor es mit der inhaltlichen und didaktischen Planung losgeht:
                            </div>
                            <div className="text-center mb-10">
                                Sind die folgenden formalen Rahmenbedingungen bei allen Beteiligten
                                erfüllt?
                            </div>
                            <div className="grid grid-cols-2 gap-1 mt-7  mb-10">
                                {formalConditions.map((formalConditionPartner) =>
                                    renderCheckBoxes(formalConditionPartner.partnerName)
                                )}
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/tools',
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
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={() => {}}
                    isValid={true}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
