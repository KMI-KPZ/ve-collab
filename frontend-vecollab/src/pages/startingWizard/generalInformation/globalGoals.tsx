import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSectionBroadPlanner from '@/components/StartingWizard/SideProgressBarSectionBroadPlanner';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { MultiValue, ActionMeta } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';
import { FiInfo } from 'react-icons/fi';

GlobalGoals.auth = true;
export default function GlobalGoals() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [learningGoals, setLearningGoals] = useState<string[]>([]);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

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

                    setLearningGoals(data.plan.learning_goals);
                    setSteps(data.plan.steps);
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router]);

    const onSubmit = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'learning_goals',
                        value: learningGoals,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            learning_goals: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );

        await router.push({
            pathname: '/startingWizard/generalInformation/targetGroups',
            query: { plannerId: router.query.plannerId },
        });
    };

    function handleChange(
        newValue: MultiValue<{ value: string; label: string }>,
        actionMeta: ActionMeta<{ value: string; label: string }>
    ): void {
        setLearningGoals(newValue.map((chosenOptions) => chosenOptions.value));
    }

    console.log(learningGoals);

    return (
        <div className="flex bg-pattern-left-blue-small bg-no-repeat">
            <div className="flex flex-grow justify-center">
                <div className="flex flex-col">
                    <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-between">
                            <div>
                                <div className={'text-center font-bold text-4xl mb-2 relative'}>
                                    Welche Richtlernziele sollen im VE erreicht werden?
                                    <Tooltip tooltipsText="Mehr zu Richtlernzielen findest du hier in den Selbstlernmaterialien …">
                                        <Link target="_blank" href={'/content/Potenziale'}>
                                            <FiInfo size={30} color="#00748f" />
                                        </Link>
                                    </Tooltip>
                                </div>
                                <div className={'text-center mb-20'}>optional</div>
                                <CreatableSelect
                                    isMulti
                                    closeMenuOnSelect={false}
                                    options={[
                                        {
                                            value: 'Förderung kritischen Denkens',
                                            label: 'Förderung kritischen Denkens',
                                        },
                                        {
                                            value: 'Förderung kreativen Denkens',
                                            label: 'Förderung kreativen Denkens',
                                        },
                                        {
                                            value: 'Förderung kollaborativen Arbeitens',
                                            label: 'Förderung kollaborativen Arbeitens',
                                        },
                                        {
                                            value: 'Förderung kommunikativer Fähigkeiten',
                                            label: 'Förderung kommunikativer Fähigkeiten',
                                        },
                                        {
                                            value: 'Förderung digitaler Kompetenzen',
                                            label: 'Förderung digitaler Kompetenzen',
                                        },
                                        {
                                            value: 'Förderung sozialer Kompetenzen',
                                            label: 'Förderung sozialer Kompetenzen',
                                        },
                                        {
                                            value: 'Förderung der kulturellen Kompetenz',
                                            label: 'Förderung der kulturellen Kompetenz',
                                        },
                                        {
                                            value: 'Förderung der Sprachkompetenz',
                                            label: 'Förderung der Sprachkompetenz',
                                        },
                                        {
                                            value: 'Förderung fachlicher Kompetenzen (Wissen, Fertigkeiten)',
                                            label: 'Förderung fachlicher Kompetenzen (Wissen, Fertigkeiten)',
                                        },
                                    ]}
                                    value={learningGoals.map((goal) => {
                                        return { value: goal, label: goal };
                                    })}
                                    onChange={handleChange}
                                    formatCreateLabel={(inputValue) => `Sonstige: ${inputValue}`}
                                    placeholder="Richtlernziele auswählen oder neue durch Tippen hinzufügen"
                                />
                            </div>
                            <div className="flex justify-between w-full max-w-xl">
                                <div>
                                    <Link
                                        href={{
                                            pathname:
                                                '/startingWizard/generalInformation/participatingCourses',
                                            query: { plannerId: router.query.plannerId },
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                        >
                                            Zurück
                                        </button>
                                    </Link>
                                </div>
                                <div>
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                        onClick={onSubmit}
                                    >
                                        Weiter
                                    </button>
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
            />
        </div>
    );
}
