import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { PlanOverview } from '@/components/planSummary/planOverview';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
    feedbackFormURL: string;
}

Finished.auth = true;
export default function Finished({ socket, feedbackFormURL }: Props): JSX.Element {
    const router = useRouter();
    const { data: plan, isLoading } = useGetPlanById(router.query.plannerId as string);

    return (
        <Wrapper
            socket={socket}
            title="Fertig"
            subtitle="Herzlichen Glückwunsch, du hast den VE erfolgreich geplant!"
            methods={useForm<any>()}
            preventToLeave={false}
            stageInMenu="finish"
            planerDataCallback={(d) => {}}
            submitCallback={(d) => {}}
        >
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
            <div className="flex justify-around w-full mt-10">
                <div>
                    <Link
                        href={{
                            pathname: `/plans`
                        }}
                        onClick={() => {
                            socket.emit('drop_plan_lock', { plan_id: router.query.plannerId }, (response: any) => {
                                // TODO error handling ?
                            });
                        }}
                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg ml-2"
                    >
                        Weiter zur Übersicht
                    </Link>

                    <Link
                        href={{
                            pathname: `/ve-designer/post-process`,
                            query: { plannerId: router.query.plannerId },
                        }}
                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg ml-2"
                    >
                        zur Nachbearbeitung
                    </Link>
                </div>
            </div>
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
