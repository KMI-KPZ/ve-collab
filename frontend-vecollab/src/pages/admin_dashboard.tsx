import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import LoadingAnimation from '@/components/LoadingAnimation';
import Timestamp from '@/components/Timestamp';
import Timeline from '@/components/network/Timeline';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchPOST, useGetAllPlans } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

AdminDashboard.auth = true;
export default function AdminDashboard() {
    const { data: session } = useSession();
    const { data: plans, isLoading, error, mutate } = useGetAllPlans(session!.accessToken);

    const [userProfileSnippets, setUserProfileSnippets] = useState<BackendUserSnippet[]>();

    useEffect(() => {
        if (isLoading) {
            return;
        }

        fetchPOST(
            '/profile_snippets',
            {
                usernames: [...new Set(plans.map((plan) => plan.author))],
            },
            session!.accessToken
        ).then((data) => {
            console.log(data);
            setUserProfileSnippets(data.user_snippets);
        });
    }, [isLoading, session, plans]);

    return (
        <Container>
            <WhiteBox>
                <VerticalTabs>
                    <div tabname="Posts">
                        <div className="h-screen overflow-y-auto">
                            <Timeline userIsAdmin={true} adminDashboard={true} />
                        </div>
                    </div>
                    <div tabname="VE-Pläne">
                        <div className="h-screen overflow-y-auto">
                            {isLoading && <LoadingAnimation />}
                            <ul className="divide-y">
                                {plans.map((plan) => (
                                    <li className="py-2" key={plan._id}>
                                        <div className="flex">
                                            <div className="mx-2">
                                                <Link
                                                    href={`/planSummary/${plan._id}`}
                                                    target="_blank"
                                                    className="text-xl font-bold leading-tight text-gray-800"
                                                >
                                                    {plan.name}
                                                </Link>
                                                <Link
                                                    href={`/profile?username=${plan.author}`}
                                                    target="_blank"
                                                >
                                                    <div className="text-md text-gray-500">
                                                        {userProfileSnippets?.find(
                                                            (snippet) =>
                                                                snippet.username === plan.author
                                                        )?.first_name +
                                                            ' ' +
                                                            userProfileSnippets?.find(
                                                                (snippet) =>
                                                                    snippet.username === plan.author
                                                            )?.last_name}
                                                    </div>
                                                    <div className="text-md text-gray-500">
                                                        {plan.author}
                                                    </div>
                                                </Link>
                                            </div>
                                            <div className="mx-2 flex items-end">
                                                <div>
                                                    <div className="flex">
                                                        <p className="text-md text-gray-500 mx-2">
                                                            Erstellt:
                                                        </p>
                                                        <Timestamp
                                                            timestamp={plan.creation_timestamp}
                                                        />
                                                    </div>
                                                    <div className="flex">
                                                        <p className="text-md text-gray-500 mx-2">
                                                            Zuletzt bearbeitet:
                                                        </p>

                                                        <Timestamp timestamp={plan.last_modified} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </VerticalTabs>
            </WhiteBox>
        </Container>
    );
}
