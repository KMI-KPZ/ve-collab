import React, { useEffect, useState } from 'react';
import HeaderSection from '@/components/Layout/HeaderSection';
import FooterSection from '@/components/Layout/FooterSection';
import { useSession } from 'next-auth/react';
import ExcludedFromMatchingBanner from '../profile/ExcludedFromMatchingBanner';
import { fetchGET } from '@/lib/backend';
import { Notification } from '@/interfaces/socketio';

interface Props {
    children: React.ReactNode;
    messageEvents: any[];
    notificationEvents: Notification[];
}
export default function LayoutSection({ children, notificationEvents, messageEvents }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const [excludedFromMatching, setExcludedFromMatching] = useState(false);

    useEffect(() => {
        // if router or session is not yet ready, don't make any requests, just wait for the next re-render
        if (status === 'loading') {
            return;
        }
        // if a user is logged in, determine if he is excluded from matching and set warning banner accordingly
        if (session) {
            fetchGET(`/matching_exclusion_info`, session?.accessToken).then((data) => {
                setExcludedFromMatching(data.excluded_from_matching)
            });
        }
    }, [session, status]);

    return (
        <>
            <HeaderSection notificationEvents={notificationEvents} messageEvents={messageEvents}/>
            <main>
                {excludedFromMatching && <ExcludedFromMatchingBanner />}
                <>{children}</>
            </main>
            <FooterSection />
        </>
    );
}
