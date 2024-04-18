import React from 'react';
import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { signIn, useSession } from 'next-auth/react';
import Timeline from '@/components/network/Timeline';
import ButtonNewPlan from '@/components/Plannner/ButtonNewPlan';

export default function Home() {
    const { data: session } = useSession();

    return (
        <div className="bg-slate-100">
            <div className="flex flex-col m-auto p-12 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">
                <div className="w-5/6 h-40 mt-2 relative rounded-2xl z-10">
                    <Image fill src={blueBackground} alt={''} />
                    <div
                        className={
                            'absolute top-10 bottom-10 left-20 right-20 text-center items-center'
                        }
                    >
                        <h1 className={'text-6xl text-white font-bold'}>
                            LEHRE KOOPERATIV, DIGITAL UND INTERNATIONAL
                        </h1>
                    </div>
                </div>
                <p className="w-1/2 my-10 font-konnect">
                    VE-Collab unterstützt Lehrende mit vielfältigen Qualifizierungsangeboten beim
                    eigenen Kompetenzaufbau und gibt Hilfestellungen bei der Initialisierung,
                    Planung und Durchführung internationaler und nationaler virtueller Austausche
                    (eng. virtual exchanges). Durch den Aufbau einer Community of Practice fördern
                    wir zudem den aktiven kollegialen (virtuellen) Austausch.
                </p>

                {session && (
                    <>
                        <ButtonNewPlan label='Neuen VA planen' />
                        <div className="w-1/2">
                            <Timeline />
                        </div>
                    </>
                )}
                {!session && (
                    <div
                        onClick={() => signIn('keycloak')}
                        className="py-4 pr-6 pl-5 m-10 bg-ve-collab-orange rounded-lg text-white cursor-pointer"
                    >
                        Logge dich ein, um einen neuen VA zu planen
                    </div>
                )}
            </div>
        </div>
    );
}
