import React from 'react';
import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { signIn, useSession } from 'next-auth/react';
import Timeline from '@/components/network/Timeline';
import ButtonNewPlan from '@/components/Plannner/ButtonNewPlan';
import ButtonPrimary from '@/components/ButtonPrimary';
import WhiteBox from '@/components/Layout/WhiteBox';

export default function Home() {
    const { data: session, status } = useSession();

    return (
        <div className="bg-slate-100 bg-pattern-left-blue bg-no-repeat">
            <div className="flex flex-col m-auto p-12 max-w-screen-2xl items-center">
                <div className="flex justify-center w-full md:w-5/6 h-40 mt-2 p-12 rounded-2xl bg-footer-pattern-rounded">
                    <h1 className='text-center content-center text-white font-bold uppercase text-2xl md:text-4xl'>
                        Lehre kooperativ, digital und international
                    </h1>
                </div>

                <p className="md:w-1/2 my-10 font-konnect lg:text-xl">
                    VE-Collab unterstützt Lehrende mit vielfältigen Qualifizierungsangeboten beim
                    eigenen Kompetenzaufbau und gibt Hilfestellungen bei der Initialisierung,
                    Planung und Durchführung internationaler und nationaler virtueller Austausche
                    (eng. virtual exchanges). Durch den Aufbau einer Community of Practice fördern
                    wir zudem den aktiven kollegialen (virtuellen) Austausch.
                </p>

                {status != 'loading' && (
                    <> { session
                        ? <>
                            <ButtonNewPlan label='Neuen VA planen' />
                            <div className="w-1/2">
                                <Timeline />
                            </div>
                        </> : <WhiteBox><div className='text-center lg:text-xl'>
                            <h2 className='text-2xl m-10'><span className='text-ve-collab-orange'>VE</span> <span className='text-ve-collab-blue'>Designer</span></h2>
                            <p>Logge dich ein um einen neuen VA zu planen</p>
                            <ButtonPrimary label='Login' onClick={() => signIn('keycloak')} classNameExtend='m-10' />
                        </div></WhiteBox>
                    } </>
                )}
            </div>
        </div>
    );
}
