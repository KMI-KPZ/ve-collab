import React, { Dispatch, SetStateAction, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { SocketContext } from './_app';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import BackgroundAnimation from '@/components/landingPage/BackgroundAnimation';

import Frontpage from '@/components/landingPage/Frontpage';
import Frontpage_LoggedIn from '@/components/landingPage/Frontpage_LoggedIn';

import { Notification } from '@/interfaces/socketio';

interface Props {
    notificationEvents: Notification[];
    toggleNotifWindow(value?: boolean): void;
}

export default function Home({ notificationEvents, toggleNotifWindow }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const socket = useContext(SocketContext);
    const { t } = useTranslation('common');

    return (
        <div className="">
            <div>
                <BackgroundAnimation className="-z-10" enable={true} />
            </div>
            <div className="flex flex-col m-auto p-6 sm:p-12 max-w-screen-2xl z-0 relative gap-y-12">
                {status != 'loading' && (
                    <>
                        {session ? (
                            <Frontpage_LoggedIn
                                notificationEvents={notificationEvents}
                                toggleNotifWindow={toggleNotifWindow}
                            />
                        ) : (
                            <Frontpage />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
