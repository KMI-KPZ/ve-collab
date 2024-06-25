import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Socket } from 'socket.io-client';

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
            (partner.task_type === '' || partner.task_type === null) &&
            (partner.assessment_type === '' || partner.assessment_type === null) &&
            (partner.evaluation_while === '' || partner.evaluation_while === null) &&
            (partner.evaluation_after === '' || partner.evaluation_after === null)
        );
    });
};

interface Props {
    socket: Socket;
}

Evaluation.auth = true;
export default function Evaluation({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});

    const prevpage = '/ve-designer/methodology';
    const nextpage = '/ve-designer/checklist';

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

    const { fields, replace } = useFieldArray({
        name: 'evaluationPerPartner',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            if (plan.evaluation.length !== 0) {
                replace(plan.evaluation)
            }
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }

            // fetch profile snippets to be able to display the full name instead of username only
            fetchPOST(
                '/profile_snippets',
                { usernames: [...plan.partners, plan.author] },
                session?.accessToken
            ).then((snippets: BackendProfileSnippetsResponse) => {
                let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
                snippets.user_snippets.forEach((element: BackendUserSnippet) => {
                    partnerSnippets[element.username] = element;
                });
                setPartnerProfileSnippets(partnerSnippets);
            });
        },
        [replace, session]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllFormValuesEmpty(data)) return;

        return [
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
        ];
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
            <div key={evaluationPerPartner.id} className="flex mx-2">
                <div className="rounded shadow px-3 py-4 h-fit w-fit">
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
                </div>
            </div>
        ));
    }

    return (
        <Wrapper
            socket={socket}
            title="Bewertung / Evaluation"
            subtitle='Wie kann der VE während der Durchführung oder abschließend bewertet und evaluiert werden?'
            description="Reflektiert an dieser Stelle, ob euer VE eher prozess- oder produktorientiert ausgerichtet ist. Tragt jeweils ein, ob auf eurer Seite eine Bewertung (von Prozessen oder Produkten) des VE vorgesehen ist. Wählt darüber hinaus passende formative und/oder summative Evaluationsmethoden."
            tooltip={{
                text: 'mehr zu Optionen der Bewertung findest du im Modul VA-Planung > Aushandlungsphase',
                link: '/learning-material/left-bubble/VA-Planung',
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="flex flex-wrap ">{renderEvaluationInfoBox()}</div>
        </Wrapper>
    );
}
