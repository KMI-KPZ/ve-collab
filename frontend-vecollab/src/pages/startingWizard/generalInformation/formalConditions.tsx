import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { SubmitHandler, useForm } from 'react-hook-form';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';

interface FormValues {
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
    const { validateAndRoute } = useValidation();
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [partners, setPartners] = useState<string[]>([]);

    const {
        register,
        handleSubmit,
        formState: { isValid },
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            time: undefined,
            place: undefined,
            technicalEquipment: undefined,
            institutionalRequirements: undefined,
            examinationRegulations: undefined,
            dataProtection: undefined,
        },
    });

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
                    if (session.user.name && data.plan.partners) {
                        setPartners([session.user.name, ...data.plan.partners]);
                    }
                }
            );
        }
    }, [session, status, router]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'name',
                        value: data,
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

    function renderCheckBoxes(partner: string): JSX.Element {
        return (
            <div className="w-4/5 space-y-3 py-8">
                <div className="flex justify-center items-center font-bold text-lg mb-4">
                    {partner}
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        {...register(`place`)}
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p> Ort / Raum</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        {...register(`technicalEquipment`)}
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p>Technik</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        {...register(`institutionalRequirements`)}
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p>Institutionelle Vorgaben</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        {...register(`examinationRegulations`)}
                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                    />
                    <p>Prüfungsordnung (Prüfungsleistung, Anrechnung etc.)</p>
                </div>
                <div className="flex justify-start items-center">
                    <input
                        type="checkbox"
                        {...register(`dataProtection`)}
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
                                {partners.map((partner: string) => renderCheckBoxes(partner))}
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/generalInformation/tools',
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
                                            isValid
                                        );
                                    }}
                                >
                                    Zurück
                                </button>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/broadPlanner',
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
                                            isValid
                                        );
                                    }}
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={handleSubmit(onSubmit)}
                    isValid={isValid}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
