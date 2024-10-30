import React from 'react';
import bmbfLogo from '@/images/footer/bmbf_logo.svg';
import euFundingLogo from '@/images/footer/eu_funding.png';
import Image from 'next/image';
import Link from 'next/link';
import Disclaimer from '../Disclaimer';
import { usePathname } from 'next/navigation';

export default function FooterSection() {
    const isFrontpage = usePathname() == '/';
    return (
        // <footer className="pb-4 bg-footer-pattern shadow-inner">
        <footer
            className={`pb-4 z-0 shadow-inner ${
                isFrontpage ? 'bg-white text-black' : 'bg-footer-pattern text-white'
            }`}
        >
            <div className="flex flex-wrap items-center max-w-screen-2xl md:w-8/12 mx-auto py-4 md:py-10">
                <div className="flex-none">
                    <Image src={bmbfLogo} height={120} alt={''}></Image>
                </div>
                <div className="flex-none">
                    <Image src={euFundingLogo} height={100} alt={''}></Image>
                </div>
                <p className="flex-1 mx-4">
                    Dieses Forschungs- und Entwicklungsprojekt wird im Rahmen der Maßnahme
                    „Initiative Nationale Bildungsplattform” (Förderkennzeichen 16INB2032A/B) vom
                    Bundesministerium für Bildung und Forschung (BMBF) gefördert und vom
                    Projektträger VDI-VDE IT betreut. Die Verantwortung für den Inhalt dieser
                    Veröffentlichung liegt bei den Autor:innen.
                </p>
            </div>
            <hr className="w-8/12 mx-auto mb-4 border-gray-400/50 border-0.5" />
            <div className="flex flex-wrap justify-center">
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
                {process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL && (
                    <p className="mx-2 font-bold">
                        <a href={process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL}>Feedback</a>
                    </p>
                )}
            </div>
            <Disclaimer />
        </footer>
    );
}
