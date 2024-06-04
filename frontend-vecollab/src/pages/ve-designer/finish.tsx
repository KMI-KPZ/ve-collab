import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { PlanOverview } from '@/components/planSummary/planOverview';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';

interface Props {
    feedbackFormURL: string;
}

Finished.auth = true;
export default function Finished({ feedbackFormURL }: Props): JSX.Element {
    const router = useRouter();
    const { data: plan, isLoading } = useGetPlanById(router.query.plannerId as string);

    const ActionButtons = () => {
        return (
            <div className="flex justify-around w-full mt-10">
                <div>
                    <Link
                        href={{
                            pathname: `/ve-designer/step-data/${plan.steps
                                ? encodeURIComponent(plan.steps[0]?.name)
                                : ''
                            }`,
                            query: { plannerId: router.query.plannerId },
                        }}
                    >
                        <button
                            type="button"
                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                        >
                            Zurück zur Feinplanung
                        </button>
                    </Link>
                </div>
                <div>
                    <Link href={'/plans'}>
                        <button
                            type="submit"
                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg mr-2"
                        >
                            Weiter zur Übersicht
                        </button>
                    </Link>
                    <Link
                        href={{
                            pathname: `/ve-designer/post-process`,
                            query: { plannerId: router.query.plannerId },
                        }}
                    >
                        <button
                            type="submit"
                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg ml-2"
                        >
                            zur Nachbearbeitung
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <Wrapper
            methods={useForm<any>({})}
            setProgress={() => {}}
            sideMenuStepsData={[]}
            progressBarStage={3}
            preventToLeave={false}
            planerDataCallback={d => {}}
            submitCallback={d => {}}
        >
            <div>
                <div className={'text-center font-bold text-4xl mb-2'}>Fertig</div>
                <div className={'text-center mb-10'}>
                    Herzlichen Glückwunsch, du hast den VE erfolgreich geplant!
                </div>
            </div>
            {isLoading ? <LoadingAnimation /> : <PlanOverview plan={plan} />}
            {feedbackFormURL && (
                <div className="mt-4 font-bold text-lg">
                    Du hast Feedback zum VE-Designer oder zur Plattform? Lass es uns{' '}
                    <a
                        className="underline text-ve-collab-orange"
                        href={feedbackFormURL}
                        target="_blank"
                        rel="noreferrer"
                    >
                        hier
                    </a>{' '}
                    wissen!
                </div>
            )}
            <ActionButtons />
        </Wrapper>
    );
}

export async function getServerSideProps() {
    const feedbackFormURL = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL;
    return {
        props: {
            feedbackFormURL: feedbackFormURL ?? null,
        },
    };
}
