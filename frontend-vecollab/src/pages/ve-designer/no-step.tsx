import { fetchGET } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { IFineStep } from '@/pages/ve-designer/step/[stepName]';
import { useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
}

// Error page for the case that the user tries to access the fine planning without having set any steps
NoStep.auth = true;
export default function NoStep({ socket }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
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
            router.push('/plans');
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router]);

    const ActionButtons = () => {
        return (
            <div className="flex justify-around w-full mt-10">
                <div>
                    <Link
                        href={{
                            pathname: `/ve-designer/step-names`,
                            query: { plannerId: router.query.plannerId },
                        }}
                    >
                        <button
                            type="submit"
                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg mr-2"
                        >
                            Zurück
                        </button>
                    </Link>
                    <Link
                        href={{
                            pathname: `/ve-designer/finish`,
                            query: { plannerId: router.query.plannerId },
                        }}
                    >
                        <button
                            type="submit"
                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg ml-2"
                        >
                            Ohne Etappen fortfahren
                        </button>
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <Wrapper
            socket={socket}
            title="Etappenplaner"
            subtitle="Bitte legen Sie zuerst Schritte fest bevor Sie mit der Feinplanung fortsetzen"
            methods={useForm<any>()}
            preventToLeave={false}
            stageInMenu="steps"
            planerDataCallback={(d) => ({})}
            submitCallback={(d) => {}}
        >
            <ActionButtons />
        </Wrapper>
    );
}
