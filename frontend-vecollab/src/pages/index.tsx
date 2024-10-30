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
import Swiper from '@/components/landingPage/Swiper';
import { MdArrowRight } from 'react-icons/md';
import ButtonLight from '@/components/common/buttons/ButtongLight';
import Button from '@/components/common/buttons/Button';
import Image from 'next/image';

import teamCollabImg from '@/images/team-collab_sm.jpg';

export default function Home(): JSX.Element {
    const { data: session, status } = useSession();
    const socket = useContext(SocketContext);
    const { t } = useTranslation('common');

    return (
        <div className="">
            <div>
                <BackgroundAnimation className="-z-10" enable={true} />
            </div>
            <div className="flex flex-col m-auto p-12 max-w-screen-2xl z-0 relative gap-y-12">
                <h1 className="px-6 mt-6 text-white font-bold uppercase text-2xl md:text-4xl">
                    Lehre kooperativ, digital und international
                </h1>

                <div className="flex flex-wrap items-center justify-center lg:w-5/6 m-auto">
                    <p className="w-1/2 p-4 text-white lg:text-xl">
                        VE-Collab unterstützt Lehrende mit vielfältigen Qualifizierungsangeboten
                        beim eigenen Kompetenzaufbau und gibt Hilfestellungen bei der
                        Initialisierung, Planung und Durchführung internationaler und nationaler
                        virtueller Austausche (eng. virtual exchanges). Durch den Aufbau einer
                        Community of Practice fördern wir zudem den aktiven kollegialen (virtuellen)
                        Austausch.
                    </p>

                    <div className="w-1/2 min-w-96 my-10 flex justify-center">
                        <div className="-space-y-14 w-fit p-6 rounded-[3rem] border border-4 border-ve-collab-orange bg-white text-white shadow">
                            <div className="w-[160px] h-[160px] mix-blend-multiply bg-[#ae6afc]/75 rounded-full m-auto flex justify-center cursor-pointer transition ease-in-out hover:scale-105">
                                <span className="pt-12 drop-shadow-[0_0_4px_#fff]">VE Planer</span>
                            </div>
                            <div className="h-16 flex items-center justify-center z-10 relative top-3">
                                <div className="py-1 px-2 rounded-md text-black bg-white/75">
                                    <span className="text-ve-collab-orange">VE</span>{' '}
                                    <span className="text-ve-collab-blue">Collab</span>
                                </div>
                            </div>
                            <div className="flex justify-center -space-x-12">
                                <div className="w-[160px] h-[160px] mix-blend-multiply bg-[#f37b27]/75 rounded-full flex items-center cursor-pointer transition ease-in-out hover:scale-105">
                                    <span className="ml-2 drop-shadow-[0_0_4px_#fff]">
                                        Netzwerk
                                    </span>
                                </div>
                                <div className="w-[160px] h-[160px] mix-blend-multiply bg-[#1f9dba]/75 rounded-full flex items-center justify-end cursor-pointer transition ease-in-out hover:scale-105">
                                    <span className="mr-2 drop-shadow-[0_0_4px_#fff]">
                                        Qualifikation
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* w-svw -ml-12 2xl:ml-[calc(-1*((100svw-1536px)/2)-3.5rem)] */}

                <div className="w-[calc(100svw-1rem)] ml-[50%] -translate-x-1/2 bg-white/75">
                    <div className="m-auto p-6 lg:p-12 max-w-screen-2xl">
                        <Swiper className="" />
                    </div>
                </div>

                {status != 'loading' && (
                    <>
                        {session ? (
                            <ButtonNewPlan
                                socket={socket}
                                label={t('btn_new_va')}
                                className="bg-none"
                            >
                                <div className="w-fit m-auto p-8 flex items-center justify-center bg-white border-4 border-ve-collab-orange drop-shadow rounded-full cursor-pointer transition ease-in-out hover:scale-105">
                                    <Image
                                        src={teamCollabImg}
                                        alt="Eine Gruppe von Menschen"
                                        className="w-[200px]"
                                    />
                                    <div className="p-6 text-center">
                                        <div className="text-2xl mb-6">
                                            <span className="text-ve-collab-orange">VE</span>{' '}
                                            <span className="text-ve-collab-blue">Collab</span>
                                        </div>

                                        {t('btn_new_va')}
                                    </div>
                                </div>
                            </ButtonNewPlan>
                        ) : (
                            <Button
                                onClick={() => {
                                    signIn('keycloak');
                                }}
                            >
                                <div className="w-fit m-auto p-8 flex items-center justify-center bg-white border-4 border-ve-collab-orange drop-shadow rounded-full cursor-pointer transition ease-in-out hover:scale-105">
                                    <Image
                                        src={teamCollabImg}
                                        alt="Eine Gruppe von Menschen"
                                        className="w-[200px]"
                                    />
                                    <div className="p-6 text-center">
                                        <div className="text-2xl mb-6">
                                            <span className="text-ve-collab-orange">VE</span>{' '}
                                            <span className="text-ve-collab-blue">Collab</span>
                                        </div>
                                        Jetzt registrieren und loslegen
                                    </div>
                                </div>
                            </Button>
                        )}
                    </>
                )}

                <div className="m-auto flex gap-x-12 lg:w-5/6 justify-center">
                    <div className="w-1/2 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg">
                        <div className="bg-ve-collab-orange-light w-[272px] h-[272px] -bottom-[136px] -right-[136px] absolute -z-10 rotate-45"></div>
                        <div className="bg-ve-collab-orange/75 w-[232px] h-[232px] -bottom-[116px] -right-[116px] absolute -z-10 rotate-45"></div>
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2 relative">
                            Für Universitäten
                        </span>
                        <p className="">
                            Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy
                            eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam
                            voluptua. At vero eos et accusam et justo duo dolores et ea rebum.
                        </p>
                        <div className="mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                            <Button onClick={() => {}}>
                                Mehr <MdArrowRight size={24} className="inline mx-1" />
                            </Button>
                        </div>
                    </div>

                    <div className="w-1/2 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg">
                        <div className="bg-ve-collab-orange-light w-[272px] h-[272px] -bottom-[136px] -right-[136px] absolute -z-10 rotate-45"></div>
                        <div className="bg-ve-collab-orange/75 w-[232px] h-[232px] -bottom-[116px] -right-[116px] absolute -z-10 rotate-45"></div>
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2 relative">
                            Für Lehrende
                        </span>
                        <p className="">
                            Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy
                            eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam
                            voluptua. At vero eos et accusam et justo duo dolores et ea rebum.
                        </p>
                        <div className="mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                            <Button onClick={() => {}}>
                                Mehr <MdArrowRight size={24} className="inline mx-1" />
                            </Button>
                        </div>
                    </div>
                </div>

                {session && (
                    <div className="lg:w-1/2 m-auto bg-white px-6 rounded-md ">
                        <Timeline socket={socket} />
                    </div>
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
