import React, { useContext } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Timeline from '@/components/network/Timeline';
import ButtonNewPlan from '@/components/plans/ButtonNewPlan';
import ButtonPrimary from '@/components/common/buttons/ButtonPrimary';
import WhiteBox from '@/components/common/WhiteBox';
import { SocketContext } from './_app';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import BackgroundAnimation from '@/components/landingPage/BackgroundAnimation';

export default function Home(): JSX.Element {
    const { data: session, status } = useSession();
    const socket = useContext(SocketContext);
    const { t } = useTranslation('common');

    return (
        <div>
            <div>
                <BackgroundAnimation className="-z-10" />
            </div>
            <div className="flex flex-col m-auto p-12 max-w-screen-2xl items-center z-0 relative">
                <div className="flex justify-center w-full md:w-5/6 h-40 mt-2 p-12 rounded-2xl">
                    <h1 className="text-center content-center text-white font-bold uppercase text-2xl md:text-4xl">
                        Lehre kooperativ, digital und international
                    </h1>
                </div>

                <p className="md:w-1/2 my-10 font-konnect lg:text-xl bg-white p-6">
                    VE-Collab unterstützt Lehrende mit vielfältigen Qualifizierungsangeboten beim
                    eigenen Kompetenzaufbau und gibt Hilfestellungen bei der Initialisierung,
                    Planung und Durchführung internationaler und nationaler virtueller Austausche
                    (eng. virtual exchanges). Durch den Aufbau einer Community of Practice fördern
                    wir zudem den aktiven kollegialen (virtuellen) Austausch.
                </p>

                {status != 'loading' && (
                    <>
                        {' '}
                        {session ? (
                            <>
                                <WhiteBox>
                                    <div className="text-center lg:text-xl p-6">
                                        <h2 className="text-2xl mb-4">
                                            <span className="text-ve-collab-orange">VE</span>{' '}
                                            <span className="text-ve-collab-blue">Designer</span>
                                        </h2>
                                        <ButtonNewPlan socket={socket} label={t('btn_new_va')} />
                                    </div>
                                </WhiteBox>
                                <div className="w-1/2">
                                    <Timeline socket={socket} />
                                </div>
                            </>
                        ) : (
                            <WhiteBox>
                                <div className="text-center lg:text-xl">
                                    <h2 className="text-2xl m-10">
                                        <span className="text-ve-collab-orange">VE</span>{' '}
                                        <span className="text-ve-collab-blue">Designer</span>
                                    </h2>
                                    <p>Logge dich ein, um einen neuen VA zu planen.</p>
                                    <ButtonPrimary
                                        label="Login"
                                        onClick={() => signIn('keycloak')}
                                        classNameExtend="m-10"
                                    />
                                </div>
                            </WhiteBox>
                        )}{' '}
                    </>
                )}
            </div>
        </div>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
