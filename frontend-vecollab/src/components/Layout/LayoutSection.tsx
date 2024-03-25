import React, { Dispatch, SetStateAction } from 'react';
import HeaderSection from '@/components/Layout/HeaderSection';
import FooterSection from '@/components/Layout/FooterSection';
import { useSession } from 'next-auth/react';
import ExcludedFromMatchingBanner from '../profile/ExcludedFromMatchingBanner';
import { useGetExcludedFromMatching } from '@/lib/backend';
import { Notification } from '@/interfaces/socketio';

interface Props {
    children: React.ReactNode;
    headerBarMessageEvents: any[];
    notificationEvents: Notification[];
    toggleChatWindow(value?: boolean): void
}
export default function LayoutSection({
    children,
    notificationEvents,
    headerBarMessageEvents,
    toggleChatWindow
}: Props): JSX.Element {
    const { data: session, status } = useSession();

    const {
        data: excludedFromMatching,
        isLoading,
        error,
        mutate,
    } = useGetExcludedFromMatching(session?.accessToken);

    return (
        <>
            <HeaderSection
                notificationEvents={notificationEvents}
                headerBarMessageEvents={headerBarMessageEvents}
                toggleChatWindow={toggleChatWindow}
            />
            <main>
                {!isLoading && excludedFromMatching && <ExcludedFromMatchingBanner />}
                <>{children}</>
            </main>
            <FooterSection />
        </>
    );
}
