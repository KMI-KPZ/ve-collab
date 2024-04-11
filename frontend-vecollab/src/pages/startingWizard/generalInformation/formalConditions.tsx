import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
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
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import Link from 'next/link';
import { TooltipList } from '@/components/TooltipList';
import { Tooltip } from '@/components/Tooltip';
import { PiBookOpenText } from "react-icons/pi";
import { FormProvider, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import PopupSaveData from '@/components/StartingWizard/PopupSaveData';
import SideProgressBarSectionBroadPlannerWithReactHookForm from '@/components/StartingWizard/SideProgressBarSectionBroadPlannerWithReactHookForm';
import { BackendUserSnippet, BackendProfileSnippetsResponse } from '@/interfaces/api/apiInterfaces';

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

interface FormValues {
    formalConditions: FormalConditionPartner[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.formalConditions.every((formalCondition) => {
        return (
            !formalCondition.time &&
            !formalCondition.format &&
            !formalCondition.topic &&
            !formalCondition.goals &&
            !formalCondition.languages &&
            !formalCondition.media &&
            !formalCondition.technicalEquipment &&
            !formalCondition.evaluation &&
            !formalCondition.institutionalRequirements &&
            !formalCondition.dataProtection
        );
    });
};

FormalConditions.auth = true;
export default function FormalConditions() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            formalConditions: [
                {
                    username: 'loading...',
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
            ],
        },
    });

    const { fields } = useFieldArray({
        name: 'formalConditions',
        control: methods.control,
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
                    if (
                        data.plan.formalities &&
                        Array.isArray(data.plan.formalities) &&
                        data.plan.formalities.length > 0
                    ) {
                        methods.setValue('formalConditions', data.plan.formalities);
                    }

                    // fetch profile snippets to be able to display the full name instead of username only
                    fetchPOST(
                        '/profile_snippets',
                        { usernames: [...data.plan.partners, data.plan.author] },
                        session.accessToken
                    ).then((snippets: BackendProfileSnippetsResponse) => {
                        let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
                        snippets.user_snippets.forEach((element: BackendUserSnippet) => {
                            partnerSnippets[element.username] = element;
                        });
                        setPartnerProfileSnippets(partnerSnippets);
                        setLoading(false);
                    });
                }
            );
        }
    }, [session, status, router, methods]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (!areAllFormValuesEmpty(data)) {
            await fetchPOST(
                '/planner/update_fields',
                {
                    update: [
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'formalities',
                            value: data.formalConditions,
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
        }
    };

    const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    function renderCheckBoxes(): JSX.Element[] {
        return fields.map((userCheckForm, index) => (
            <div key={userCheckForm.id} className="flex justify-center">
                <div className="w-4/5 space-y-3 py-8 flex flex-col">
                    <div className="flex justify-start items-center font-bold text-lg mb-4">
                        {partnerProfileSnippets[userCheckForm.username]
                            ? partnerProfileSnippets[userCheckForm.username].first_name +
                              ' ' +
                              partnerProfileSnippets[userCheckForm.username].last_name
                            : userCheckForm.username}
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`formalConditions.${index}.time`)}
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
                            {...methods.register(`formalConditions.${index}.format`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={['Format(e) des VE']}>
                            <p>Format</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`formalConditions.${index}.topic`)}
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
                            {...methods.register(`formalConditions.${index}.goals`)}
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
                            {...methods.register(`formalConditions.${index}.languages`)}
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
                            {...methods.register(`formalConditions.${index}.media`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Learning Management System, das im VE verwendet wird',
                            ]}
                        >
                            <p>Medien</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`formalConditions.${index}.technicalEquipment`)}
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
                            {...methods.register(`formalConditions.${index}.evaluation`)}
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
                            {...methods.register(
                                `formalConditions.${index}.institutionalRequirements`
                            )}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={['Umgang mit Anwesenheit und Mitarbeit']}>
                            <div>
                                <p>institutionelle</p>
                                <p>Vorgaben</p>
                            </div>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`formalConditions.${index}.dataProtection`)}
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
            </div>
        ));
    }

    return (
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/startingWizard/broadPlanner',
                        query: {
                            plannerId: router.query.plannerId,
                        },
                    });
                }}
                handleCancel={() => setIsPopupOpen(false)}
            />
            <div className="flex bg-pattern-left-blue-small bg-no-repeat">
                <div className="flex flex-grow justify-center">
                    <div className="flex flex-col">
                        <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-center">
                                <div>
                                    <div className={'text-center font-bold text-4xl mb-2 relative'}>
                                        Formale Rahmenbedingungen
                                        <Tooltip tooltipsText="Mehr zu formalen Rahmenbedingungen findest du hier in den Selbstlernmaterialien …">
                                            <Link
                                                target="_blank"
                                                href={'/content/Herausforderungen'}
                                            >
                                                <PiBookOpenText size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                    <div className={'text-center mb-4'}>optional</div>
                                    <div className={'text-center'}>
                                        Bevor es mit der inhaltlichen und didaktischen Planung
                                        losgeht:
                                    </div>
                                    <div className="text-center mb-10">
                                        Sind die folgenden formalen Rahmenbedingungen bei allen
                                        Beteiligten erfüllt?
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 mt-7 mb-10">
                                        {renderCheckBoxes()}
                                    </div>
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) => {
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/startingWizard/generalInformation/learningPlatform'
                                                );
                                            })}
                                        >
                                            Zurück
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit(
                                                (data) => {
                                                    combinedSubmitRouteAndUpdate(
                                                        data,
                                                        '/startingWizard/broadPlanner'
                                                    );
                                                },
                                                async () => setIsPopupOpen(true)
                                            )}
                                        >
                                            Weiter
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
                <SideProgressBarSectionBroadPlannerWithReactHookForm
                    progressState={sideMenuStepsProgress}
                    onSubmit={onSubmit}
                />
            </div>
        </FormProvider>
    );
}
