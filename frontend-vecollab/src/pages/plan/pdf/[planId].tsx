import React from 'react';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { PlanSummary } from '@/components/planSummary/PlanSummary';
import Link from 'next/link';
import { GiSadCrab } from 'react-icons/gi';
import { GetServerSidePropsContext } from 'next';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { PlanSummaryPDF } from '@/components/planSummary/PlanSummaryPDF';

// This is the component that gets rendered into the PDF of a plan
// In contrast to the other pages, it is only accessible by directly
// supplying the JWT Access Token via Bearer Authorization Header
// which is realized by an intermittent API route /api/pdf-plan.ts.

interface Props {
    plan: IPlan | null;
    partnerProfileSnippets: { [Key: string]: BackendUserSnippet };
    availablePlans: IPlan[];
    error: string | null;
}

export default function PDFPlan({ plan, error, partnerProfileSnippets, availablePlans }: Props) {
    const Wrapper = ({ children }: { children: JSX.Element }) => {
        return (
            <div className="max-w-screen-[1500] min-h-[70vh] bg-pattern-left-blue-small bg-no-repeat">
                <div className="container mx-auto mb-14 px-5 p-12">{children}</div>
            </div>
        );
    };

    if (error) {
        let message = '';
        switch (error) {
            case 'fetch_failed':
                message = 'Fehler beim Laden des Plans.';
                break;
            case 'missing_key:_id':
                message = 'Es wurde keine Plan-ID übergeben.';
                break;
            case 'no_logged_in_user':
                message = 'Sie sind nicht eingeloggt.';
                break;
            case 'insufficient_permission':
                message = 'Sie haben keine Berechtigung, diesen Plan herunterzuladen.';
                break;
            case 'plan_doesnt_exist':
                message = 'Der Plan existiert nicht.';
                break;
            default:
                message = 'Unbekannter Fehler.';
                break;
        }

        return (
            <Wrapper>
                <div className="flex flex-col items-center justify-center font-bold">
                    <div className="flex items-center">
                        <GiSadCrab size={60} className="m-4" />
                        <div className="text-xl text-slate-900">{message}</div>
                    </div>
                    <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
                        <Link href="/plans">Zurück zur Übersicht</Link>
                    </button>
                </div>
            </Wrapper>
        );
    }
    return (
        <Wrapper>
            <>
                <div className="mb-6">
                    <div className={'flex justify-between font-bold text-4xl mb-2'}>
                        <h1>{plan!.name}</h1>
                    </div>
                    <div className={'text-gray-500 text-xl'}>Zusammenfassung des Plans</div>
                </div>
                <div className="flex w-full">
                    <PlanSummaryPDF
                        plan={plan!}
                        openAllBoxes={true}
                        partnerProfileSnippets={partnerProfileSnippets}
                        availablePlans={availablePlans}

                    />
                </div>
            </>
        </Wrapper>
    );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
    // use the token from the request to fetch the plan
    // respecting access rights or errors along the way
    let token = context.req.headers.authorization;
    token = token?.replace('Bearer ', '');

    const planResponse = await fetchGET(`/planner/get?_id=${context.params?.planId}`, token);
    if (planResponse.success === true) {
        const availablePlansResponse = await fetchGET('/planner/get_available', token)
        const userSnippetsResponse: BackendProfileSnippetsResponse = await fetchPOST(
            '/profile_snippets',
            { usernames: [...planResponse.plan.partners, planResponse.plan.author.username] },
            token
        );
        let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
        userSnippetsResponse.user_snippets.forEach((element: BackendUserSnippet) => {
            partnerSnippets[element.username] = element;
        });
        return {
            props: {
                plan: planResponse.plan,
                partnerProfileSnippets: partnerSnippets,
                availablePlans: availablePlansResponse.plans,
                error: null,
            },
        };
    } else {
        return {
            props: {
                plan: null,
                partnerProfileSnippets: {},
                availablePlans: [],
                error: planResponse.reason ? planResponse.reason : 'fetch_failed',
            },
        };
    }
}
