import React from 'react';
import bmbfLogo from '@/images/footer/bmbf_logo.svg';
import euFundingLogo from '@/images/footer/eu_funding.png';
import Image from 'next/image';
import Link from 'next/link';
import Disclaimer from '../Disclaimer';

export default function FooterSection() {
    return (
        <footer className="pb-4 bg-footer-pattern shadow-inner">
            <div className="h-12"></div>
            <div className="flex w-8/12 mx-auto mb-4 ">
                <Image src={bmbfLogo} height={120} alt={''}></Image>
                <Image src={euFundingLogo} height={100} alt={''}></Image>
                <p className="ml-4 text-white">
                    Dieses Forschungs- und Entwicklungsprojekt wird im Rahmen der Maßnahme
                    „Initiative Nationale Bildungsplattform” (Förderkennzeichen 16INB2032A/B) vom
                    Bundesministerium für Bildung und Forschung (BMBF) gefördert und vom
                    Projektträger VDI-VDE IT betreut. Die Verantwortung für den Inhalt dieser
                    Veröffentlichung liegt bei den Autor:innen.
                </p>
            </div>
            <hr className="w-8/12 mx-auto mb-4 border-gray-400/50 border-0.5" />
            <div className="text-white flex justify-center">
                <p className="mx-2">© 2024 VE-Collab</p>
                <p className="mx-2">
                    <Link target="_blank" href="https://infai.org/das-institut/impressum/">
                        Impressum
                    </Link>
                </p>
                <p className="mx-2">
                    <Link target="_blank" href="https://infai.org/datenschutzerklaerung-2/">
                        Datenschutzerklärung
                    </Link>
                </p>
                <p className="mx-2">
                    <a href="mailto:schlecht@infai.org,mihaela.markovic@uni-leipzig.de">
                        Kontaktiere uns
                    </a>
                </p>
            </div>
            <Disclaimer />
        </footer>
    );
}
