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
import { Tooltip } from '@/components/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import WhiteBox from '@/components/Layout/WhiteBox';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { Controller, FormProvider, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import SideProgressBarSectionBroadPlannerWithReactHookForm from '@/components/StartingWizard/SideProgressBarSectionBroadPlannerWithReactHookForm';
import PopupSaveData from '@/components/StartingWizard/PopupSaveData';

export interface EvaluationPerPartner {
    username: string;
    is_graded: boolean;
    task_type: string;
    assessment_type: string;
    evaluation_while: string;
    evaluation_after: string;
}

interface FormValues {
    evaluationPerPartner: EvaluationPerPartner[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.evaluationPerPartner.every((partner) => {
        return (
            !partner.is_graded &&
            partner.task_type === '' &&
            partner.assessment_type === '' &&
            partner.evaluation_while === '' &&
            partner.evaluation_after === ''
        );
    });
};

Evaluation.auth = true;
export default function Evaluation() {
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
            evaluationPerPartner: [
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
                    is_graded: false,
                    task_type: '',
                    assessment_type: '',
                    evaluation_while: '',
                    evaluation_after: '',
                },
            ],
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
                (data: { plan: IPlan }) => {
                    if (data.plan !== undefined) {
                        setSideMenuStepsProgress(data.plan.progress);
                        setSteps(data.plan.steps);
                        if (data.plan.evaluation.length !== 0) {
                            methods.setValue('evaluationPerPartner', data.plan.evaluation);
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
                }
            );
        }
    }, [session, status, router, methods]);

    const { fields } = useFieldArray({
        name: 'evaluationPerPartner',
        control: methods.control,
    });

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (!areAllFormValuesEmpty(data)) {
            await fetchPOST(
                '/planner/update_fields',
                {
                    update: [
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'evaluation',
                            value: data.evaluationPerPartner,
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'progress',
                            value: {
                                ...sideMenuStepsProgress,
                                evaluation: ProgressState.completed,
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

    function radioBooleanInput(control: any, name: any): JSX.Element {
        return (
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <div className="flex my-1">
                            <div>
                                <label className="px-2 py-2">Ja</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(true)} // send value to hook form
                                    checked={value === true}
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
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(false)} // send value to hook form
                                    checked={value === false}
                                />
                            </div>
                        </div>
                    </>
                )}
            />
        );
    }

    function renderEvaluationInfoBox(): JSX.Element[] {
        return fields.map((evaluationPerPartner, index) => (
            <div key={evaluationPerPartner.id} className="flex justify-center mx-2">
                <WhiteBox className="h-fit w-[28rem]">
                    <div className="flex flex-col">
                        <div className="font-bold text-lg mb-4 text-center">
                            {partnerProfileSnippets[evaluationPerPartner.username]
                                ? partnerProfileSnippets[evaluationPerPartner.username].first_name +
                                  ' ' +
                                  partnerProfileSnippets[evaluationPerPartner.username].last_name
                                : evaluationPerPartner.username}
                        </div>
                        <div className="flex items-center">
                            <p className="">Erfolgt eine Bewertung?</p>
                            <div className="flex w-36 justify-end gap-x-3">
                                {radioBooleanInput(
                                    methods.control,
                                    `evaluationPerPartner.${index}.is_graded`
                                )}
                            </div>
                        </div>
                        {methods.watch(`evaluationPerPartner.${index}.is_graded`) && (
                            <>
                                <div className="flex items-center justify-between my-1">
                                    <p className="">Art der Leistung</p>
                                    <input
                                        type="text"
                                        className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                        {...methods.register(
                                            `evaluationPerPartner.${index}.task_type`
                                        )}
                                    />
                                </div>
                                <div className="flex items-center justify-between my-1">
                                    <p className="">Art der Bewertung</p>
                                    <input
                                        type="text"
                                        className="border border-gray-400 rounded-lg p-2 ml-2 w-64"
                                        {...methods.register(
                                            `evaluationPerPartner.${index}.assessment_type`
                                        )}
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
                                {...methods.register(
                                    `evaluationPerPartner.${index}.evaluation_while`
                                )}
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
                                {...methods.register(
                                    `evaluationPerPartner.${index}.evaluation_after`
                                )}
                                placeholder="z. B. anonymer Feedbackbogen, Zielscheibenfeedback, etc."
                            />
                        </div>
                    </div>
                </WhiteBox>
            </div>
        ));
    }

    return (
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/startingWizard/generalInformation/languages',
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
                                    <div className="flex justify-center">
                                        <div className={'font-bold text-4xl mb-2 w-fit relative'}>
                                            Bewertung / Evaluation
                                            <Tooltip tooltipsText="Mehr zur Evaluation von VE findest du hier in den Selbstlernmaterialien …">
                                                <Link target="_blank" href={'/content/Evaluation'}>
                                                    <PiBookOpenText size={30} color="#00748f" />
                                                </Link>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className={'text-center mb-4'}>optional</div>
                                    <div className="flex flex-wrap justify-center">
                                        {renderEvaluationInfoBox()}
                                    </div>
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/startingWizard/generalInformation/languages'
                                                )
                                            )}
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
                                                        '/startingWizard/generalInformation/courseFormat'
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
