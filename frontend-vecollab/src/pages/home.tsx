import React, { useContext } from 'react';
import { useSession } from 'next-auth/react';
import { SocketContext } from './_app';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import BackgroundAnimation from '@/components/landingPage/BackgroundAnimation';

import { Notification } from '@/interfaces/socketio';
import CustomHead from '@/components/metaData/CustomHead';
import Dashboard from '@/components/landingPage/Dashboard';

interface Props {
    notificationEvents: Notification[];
    toggleNotifWindow(value?: boolean): void;
}

Home.auth = true;
Home.autoForward = true;
// Home.noAuthPreview = <GroupsNoAuthPreview />;

export default function Home({ notificationEvents, toggleNotifWindow }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const socket = useContext(SocketContext);
    const { t } = useTranslation('common');

    return (
        <>
            <CustomHead
                pageTitle={t('home')}
                pageSlug={'home'}
                pageDescription={t('dashboard_description')}
            />
            <div className="">
                <div>
                    <BackgroundAnimation className="relative -z-10" enable={true} />
                </div>
                <div className="flex flex-col m-auto py-6 sm:p-12 max-w-(--breakpoint-2xl) z-0 relative gap-y-12">
                    {status != 'loading' && (
                        <>
                            {session && (
                                <Dashboard
                                    notificationEvents={notificationEvents}
                                    toggleNotifWindow={toggleNotifWindow}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
