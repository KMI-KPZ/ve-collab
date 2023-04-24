import React from 'react';
import { fetchPOST } from '@/lib/backend';
import { useRouter } from 'next/router';
import Image from "next/image"
import blueBackground from "@/images/footer/KAVAQ_Footer_rounded.png"
import { signIn, useSession } from 'next-auth/react';

export default function Home() {
    const router = useRouter();
    const { data: session } = useSession();
    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);
        await router.push({
            pathname: '/startingWizard/generalInformation/1projectName',
            query: { plannerId: newPlanner.inserted_id },
        });
    };

    return (
        <div className="bg-slate-100">
            <div className="flex flex-col m-auto p-12 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">
                <div className={"w-5/6 h-40 mt-2 relative rounded-2xl z-10"}>
                    <Image fill src={blueBackground} alt={""} />
                    <div className={"absolute top-10 bottom-10 left-20 right-20 text-center items-center"}>
                        <h1 className={"text-6xl text-white font-bold"}>LEHRE KOOPERATIV, DIGITAL UND INTERNATIONAL</h1>
                    </div>
                </div>
                <p className="w-1/2 my-10 font-konnect">
                    VE-Collab unterstützt Lehrenden beim eigenen Kompetenzaufbau sowie bei der Planung internationaler und nationaler virtueller Austausche (eng. virtual exchanges). Bei uns finden Sie Qualifizierungsangebote, Hilfestellungen bei der Initialisierung, Planung und dem Design von VE. Wir möchten die Internationalisierung der Lehre stärken und eine Community of Practice im VE-Bereich für den aktiven Austausch aufbauen.
                </p>

                {session && (
                    <button
                        onClick={createAndForwardNewPlanner}
                        className="py-4 pr-6 pl-5 m-10 bg-ve-collab-orange rounded-lg text-white"
                    >
                        neuen VA planen
                    </button>
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
