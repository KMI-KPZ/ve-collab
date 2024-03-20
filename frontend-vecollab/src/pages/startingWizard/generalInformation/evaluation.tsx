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
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';
import { FiInfo } from 'react-icons/fi';
import WhiteBox from '@/components/Layout/WhiteBox';

export interface EvaluationPerPartner {
    username: string;
    is_graded: boolean;
    task_type: string;
    assessment_type: string;
    evaluation_while: string;
    evaluation_after: string;
}

export default function FormalConditions() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [evaluationInfo, setEvaluationInfo] = useState<EvaluationPerPartner[]>([
        {
            username: 'Dozent*in 1',
            is_graded: false,
            task_type: '',
            assessment_type: '',
            evaluation_while: '',
            evaluation_after: '',
        },
        {
            username: 'Dozent*in 2',
            is_graded: true,
            task_type: 'Referat',
            assessment_type: 'Mündlich',
            evaluation_while: 'Feedback',
            evaluation_after: 'Notenvergabe',
        },
        {
            username: 'Dozent*in 3',
            is_graded: true,
            task_type: 'Referat',
            assessment_type: 'Mündlich',
            evaluation_while: 'Feedback',
            evaluation_after: 'Notenvergabe',
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

                    /*
                    if (data.plan.formalities && Array.isArray(data.plan.formalities)) {
                        setFormalConditions(data.plan.formalities);
                    }
                    */
                }
            );
        }
    }, [session, status, router]);

    const handleSubmit = async () => {
        /*
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
        */
    };

    const modifyIsGraded = (username: string, newGraded: boolean) => {
        const newEvaluationInfo = evaluationInfo.map((evaluation) => {
            if (evaluation.username === username) {
                return { ...evaluation, is_graded: newGraded };
            }
            return evaluation;
        });
        setEvaluationInfo(newEvaluationInfo);
    };

    const modifyTaskType = (username: string, newTaskType: string) => {
        const newEvaluationInfo = evaluationInfo.map((evaluation) => {
            if (evaluation.username === username) {
                return { ...evaluation, task_type: newTaskType };
            }
            return evaluation;
        });
        setEvaluationInfo(newEvaluationInfo);
    };

    const modifyAssessmentType = (username: string, newAssessmentType: string) => {
        const newEvaluationInfo = evaluationInfo.map((evaluation) => {
            if (evaluation.username === username) {
                return { ...evaluation, assessment_type: newAssessmentType };
            }
            return evaluation;
        });
        setEvaluationInfo(newEvaluationInfo);
    };

    const modifyEvaluationWhile = (username: string, newEvaluationWhile: string) => {
        const newEvaluationInfo = evaluationInfo.map((evaluation) => {
            if (evaluation.username === username) {
                return { ...evaluation, evaluation_while: newEvaluationWhile };
            }
            return evaluation;
        });
        setEvaluationInfo(newEvaluationInfo);
    };

    const modifyEvaluationAfter = (username: string, newEvaluationAfter: string) => {
        const newEvaluationInfo = evaluationInfo.map((evaluation) => {
            if (evaluation.username === username) {
                return { ...evaluation, evaluation_after: newEvaluationAfter };
            }
            return evaluation;
        });
        setEvaluationInfo(newEvaluationInfo);
    };

    function renderEvaluationInfoBox(evaluationPerPartner: EvaluationPerPartner): JSX.Element {
        return (
            <WhiteBox className="h-fit w-[28rem]">
                <div className="flex flex-col">
                    <div className="font-bold text-lg mb-4 text-center">
                        {evaluationPerPartner.username}
                    </div>
                    <div className="flex items-center">
                        <p className="">Erfolgt eine Bewertung?</p>
                        <div className="flex w-36 justify-end gap-x-3">
                            <div className="flex my-1">
                                <div>
                                    <label className="px-2 py-2">Ja</label>
                                </div>
                                <div>
                                    <input
                                        type="radio"
                                        name={'physicalMobility' + evaluationPerPartner.username}
                                        value="true"
                                        checked={evaluationPerPartner.is_graded}
                                        className="border border-gray-400 rounded-lg p-2"
                                        onChange={() =>
                                            modifyIsGraded(evaluationPerPartner.username, true)
                                        }
                                    />
                                </div>
                            </div>
                            <div className="flex my-1">
                                <div>
                                    <label className="px-2 py-2">Nein</label>
                                </div>
                                <div>
                                    <input
                                        type="radio"
                                        name={'physicalMobility' + evaluationPerPartner.username}
                                        value="false"
                                        checked={!evaluationPerPartner.is_graded}
                                        className="border border-gray-400 rounded-lg p-2"
                                        onChange={() =>
                                            modifyIsGraded(evaluationPerPartner.username, false)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {evaluationPerPartner.is_graded && (
                        <>
                            <div className="flex items-center justify-between my-1">
                                <p className="">Art der Leistung</p>
                                <input
                                    type="text"
                                    className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                    value={evaluationPerPartner.task_type}
                                    onChange={(e) =>
                                        modifyTaskType(
                                            evaluationPerPartner.username,
                                            e.target.value
                                        )
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between my-1">
                                <p className="">Art der Bewertung</p>
                                <input
                                    type="text"
                                    className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                    value={evaluationPerPartner.assessment_type}
                                    onChange={(e) =>
                                        modifyAssessmentType(
                                            evaluationPerPartner.username,
                                            e.target.value
                                        )
                                    }
                                    placeholder="z.B. benotet, unbenotet"
                                />
                            </div>
                        </>
                    )}
                    <p className="mt-10 mb-1">Wie erfolgt die Evaluation des VE?</p>
                    <div className="flex items-center justify-between my-1">
                        <div>
                            <p>während des VE</p>
                            <p>(formativ)</p>
                        </div>
                        <textarea
                            className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                            value={evaluationPerPartner.evaluation_while}
                            onChange={(e) =>
                                modifyEvaluationWhile(evaluationPerPartner.username, e.target.value)
                            }
                            rows={2}
                            placeholder="z. B. Teaching Analysis Poll, Feedback-Runden, etc."
                        />
                    </div>
                    <div className="flex items-center justify-between my-1">
                        <div>
                            <p>nach dem VE</p>
                            <p>(summativ)</p>
                        </div>
                        <textarea
                            className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                            value={evaluationPerPartner.evaluation_after}
                            onChange={(e) =>
                                modifyEvaluationAfter(evaluationPerPartner.username, e.target.value)
                            }
                            placeholder="z. B. anonymer Feedbackbogen, Zielscheibenfeedback, etc."
                        />
                    </div>
                </div>
            </WhiteBox>
        );
    }

    return (
        <div className="flex bg-pattern-left-blue-small bg-no-repeat">
            <div className="flex flex-grow justify-center">
                <div className="flex flex-col">
                    <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-center">
                            <div>
                                <div className="flex justify-center">
                                    <div className={'font-bold text-4xl mb-2 w-fit relative'}>
                                        Bewertung / Evaluation
                                        <Tooltip tooltipsText="Mehr zur Evaluation von VE findest du hier in den Selbstlernmaterialien …">
                                            <Link target="_blank" href={'/content/Evaluation'}>
                                                <FiInfo size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className={'text-center mb-4'}>optional</div>
                                <div className="flex flex-wrap justify-center">
                                    {evaluationInfo.map((evaluation, index) => (
                                        <div key={index} className="flex justify-center mx-2">
                                            {renderEvaluationInfoBox(evaluation)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between w-full max-w-xl">
                                <div>
                                    <Link
                                        href={{
                                            pathname:
                                                '/startingWizard/generalInformation/languages',
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
                                            pathname:
                                                '/startingWizard/generalInformation/courseFormat',
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
            />
        </div>
    );
}
