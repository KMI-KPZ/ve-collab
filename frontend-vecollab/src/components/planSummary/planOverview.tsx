import React, { useEffect, useState } from 'react';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import ViewAfterVE from './ViewAfterVE';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useSession } from 'next-auth/react';
import { fetchPOST } from '@/lib/backend';
import LoadingAnimation from '../LoadingAnimation';

interface Props {
    plan: IPlan;
    openAllBoxes?: boolean;
}

PlanOverview.auth = true;
export function PlanOverview({ plan, openAllBoxes }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});

    useEffect(() => {
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            // fetch profile snippets to be able to display the full name instead of username only
            fetchPOST(
                '/profile_snippets',
                { usernames: [...plan.partners, plan.author] },
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
    }, [session, status, plan]);

    if (loading) {
        return <LoadingAnimation />;
    }

    return (
        <div className="bg-white rounded-lg p-4 w-full">
            <ViewAttributes plan={plan} partnerProfileSnippets={partnerProfileSnippets} openAllBoxes={openAllBoxes}/>
            <hr className="h-px my-10 bg-gray-400 border-0" />
            <div className="text-2xl font-semibold mb-4 ml-4">Etappen</div>
            {plan.steps !== undefined && plan.steps.length > 0 ? (
                plan.steps.map((fineStep, index) => (
                    <ViewFinestep key={index} fineStep={fineStep} openAllBoxes={openAllBoxes}/>
                ))
            ) : (
                <div className="ml-4"> Noch keine erstellt</div>
            )}
            <hr className="h-px my-10 bg-gray-400 border-0" />
            <ViewAfterVE plan={plan} openAllBoxes={openAllBoxes}/>
        </div>
    );
}

export const showDataOrEmptySign = (data: any) => {
    if (data === null || data === undefined || data === '') {
        return '/';
    } else {
        return data;
    }
};
