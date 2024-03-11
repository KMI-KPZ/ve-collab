import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSectionBroadPlanner from '@/components/StartingWizard/SideProgressBarSectionBroadPlanner';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { RxMinus, RxPlus } from 'react-icons/rx';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';
import { FiInfo } from 'react-icons/fi';

export default function Topics() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [topics, setTopics] = useState<string[]>(['']);
    const [steps, setSteps] = useState<IFineStep[]>([]);

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
                    console.log(data.plan);
                    setLoading(false);

                    if (data.plan.topics.length > 0) {
                        setTopics(data.plan.topics);
                    } else {
                        setTopics(['']);
                    }

                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router]);

    const onSubmit = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    { plan_id: router.query.plannerId, field_name: 'topics', value: topics },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            topics: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );

        await router.push({
            pathname: '/startingWizard/generalInformation/languages',
            query: { plannerId: router.query.plannerId },
        });
    };

    function modifyTopics(index: number, value: string): void {
        const newTopics = [...topics];
        newTopics[index] = value;
        setTopics(newTopics);
    }

    function addTopicInputField() {
        setTopics([...topics, '']);
    }

    function removeTopicInputField() {
        if (topics.length > 1) {
            const newTopics = [...topics];
            newTopics.pop();
            setTopics(newTopics);
        }
    }

    return (
        <div className="flex bg-pattern-left-blue-small bg-no-repeat">
            <div className="flex flex-grow justify-center">
                <div className="flex flex-col">
                    <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <form className="gap-y-6 w-full p-12 max-w-7xl items-center flex flex-col flex-grow justify-between">
                            <div>
                                <div className={'text-center font-bold text-4xl mb-2 relative'}>
                                    Zu welchem Thema / welchen Themen findet der VE statt?
                                    <Tooltip tooltipsText="Inspiration zu fachbezogenen Themen verschiedener Disziplinen findest du hier in den Selbstlernmaterialien …">
                                        <Link
                                            target="_blank"
                                            href={'/content/Beispiele%20aus%20der%20Praxis'}
                                        >
                                            <FiInfo size={30} color="#00748f" />
                                        </Link>
                                    </Tooltip>
                                </div>
                                <div className={'text-center mb-20'}>optional</div>
                                <div className="flex flex-col justify-center">
                                    {topics.map((topic, index) => (
                                        <div key={index} className="flex justify-center mt-2">
                                            <input
                                                type="text"
                                                placeholder="Thema eingeben"
                                                className="border border-gray-300 rounded-lg w-3/4 p-2"
                                                value={topic}
                                                onChange={(e) =>
                                                    modifyTopics(index, e.target.value)
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full flex justify-center">
                                    <div className={'mt-3 mx-2 flex justify-end w-3/4'}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                removeTopicInputField();
                                            }}
                                        >
                                            <RxMinus size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                addTopicInputField();
                                            }}
                                        >
                                            <RxPlus size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between w-full max-w-xl">
                                <div>
                                    <Link
                                        href={{
                                            pathname:
                                                '/startingWizard/generalInformation/targetGroups',
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
                sideMenuStepsData={sideMenuStepsData}
            />
        </div>
    );
}
