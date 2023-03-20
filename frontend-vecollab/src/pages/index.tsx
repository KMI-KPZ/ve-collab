import React from 'react';
import Link from 'next/link';

export default function Home() {
    return (
        <div className="bg-slate-100">
            <div className="flex flex-col m-auto p-12 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">
                <h1 className="text-4xl font-bold m-7">Willkommen</h1>
                <p className="w-1/2 font-konnect">
                    orem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula
                    eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient
                    montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque
                    eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo,
                    fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut,
                    imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium.
                    Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate
                    eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac,
                    enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus
                    viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam
                    ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui.
                    Etiam
                </p>
                <Link
                    href="/startingWizard/generalInformation/essentialInformation"
                    className="py-4 pr-6 pl-5 m-10 bg-ve-collab-orange rounded-lg text-white"
                >
                    Starte dein Projekt
                </Link>
            </div>
        </div>
    );
}
