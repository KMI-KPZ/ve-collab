import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { PlanOverview } from '@/components/planSummary/planOverview';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Socket } from 'socket.io-client';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { dropPlanLock } from '@/components/VE-designer/PlanSocket';

interface Props {
    socket: Socket;
    feedbackFormURL: string;
}

Finished.auth = true;
export default function Finished({ socket, feedbackFormURL }: Props): JSX.Element {
    const router = useRouter();
    // TODO
    const [plan, setPlanData] = useState<IPlan>()

    return (
        <Wrapper
            socket={socket}
            title="Fertig"
            subtitle="Herzlichen Glückwunsch, du hast den VE erfolgreich geplant!"
            methods={useForm<any>()}
            preventToLeave={false}
            nextpage='/ve-designer/post-process'
            nextpageBtnLabel='Zur Nachbearbeitung'
            stageInMenu="finish"
            planerDataCallback={(d) => {
                setPlanData(d)
                return {}
            }}
            submitCallback={(d) => {}}
        >
            {typeof plan !== 'undefined' ? <PlanOverview plan={plan} /> : <LoadingAnimation />}
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
