import React from 'react';
import HeaderSection from '@/components/Layout/HeaderSection';
import FooterSection from '@/components/Layout/FooterSection';
import { useSession } from 'next-auth/react';
import ExcludedFromMatchingBanner from '../profile/ExcludedFromMatchingBanner';
import { useGetExcludedFromMatching } from '@/lib/backend';
import { Notification } from '@/interfaces/socketio';

interface Props {
    children: React.ReactNode;
    messageEvents: any[];
    notificationEvents: Notification[];
}
export default function LayoutSection({ children, notificationEvents, messageEvents }: Props): JSX.Element {
    const { data: session, status } = useSession();

    const {
        data: excludedFromMatching,
        isLoading,
        error,
        mutate,
    } = useGetExcludedFromMatching(session?.accessToken);

    return (
        <>
            <HeaderSection notificationEvents={notificationEvents} messageEvents={messageEvents}/>
            <main>
                {!isLoading && excludedFromMatching && <ExcludedFromMatchingBanner />}
                <>{children}</>
            </main>
            <FooterSection />
        </>
    );
}
