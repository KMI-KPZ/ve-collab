import React from 'react';
import HeaderSection from '@/components/layout/HeaderSection';
import FooterSection from '@/components/layout/FooterSection';
import { useSession } from 'next-auth/react';
import ExcludedFromMatchingBanner from '../profile/ExcludedFromMatchingBanner';
import { useGetExcludedFromMatching } from '@/lib/backend';
import { Notification } from '@/interfaces/socketio';
import { useRouter } from 'next/router';
import FeedbackBanner from '../FeedbackBanner';

interface Props {
    children: JSX.Element;
    headerBarMessageEvents: any[];
    notificationEvents: Notification[];
    toggleChatWindow(value?: boolean): void;
    toggleNotifWindow(value?: boolean): void;
}
export default function LayoutSection({
    children,
    notificationEvents,
    headerBarMessageEvents,
    toggleChatWindow,
    toggleNotifWindow,
}: Props): JSX.Element {
    const { data: session } = useSession();

    const router = useRouter();
    const language = router.locale;

    const { data: excludedFromMatching } = useGetExcludedFromMatching(
        session ? session.accessToken : ''
    );

    if (router.pathname === '/plan/pdf/[planId]') {
        return <main>{children}</main>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-100">
            <HeaderSection
                notificationEvents={notificationEvents}
                headerBarMessageEvents={headerBarMessageEvents}
                toggleChatWindow={toggleChatWindow}
                toggleNotifWindow={toggleNotifWindow}
            />
            <main className="flex-1 p-5 bg-pattern-left-blue bg-no-repeat min-h-96">
                {excludedFromMatching && <ExcludedFromMatchingBanner />}
                <FeedbackBanner />
                <div className="container mx-auto max-w-screen-2xl">{children}</div>
            </main>
            <FooterSection />
        </div>
    );
}
