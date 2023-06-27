import React from 'react';
import veCollabLogo from '@/images/veCollabLogo.png';
import Image from 'next/image';
import Link from 'next/link';

export default function FooterSection() {
    return (
        <footer className="pb-4 bg-footer-pattern shadow-inner">
            <div className="h-52 px-5 pt-9 w-screen grid grid-cols-5 gap-4 text-white max-w-screen-2xl m-auto">
                <div className="col-span-2 ">
                    <Image src={veCollabLogo} alt="Ve Collab Logo" width={300} height={300}></Image>
                </div>
                <div className="space-y-2"></div>
                <div className="space-y-2">
                    <div>
                        <Link href="/">Startseite</Link>
                    </div>
                    <div>
                        <Link href="/profile">Profil</Link>
                    </div>
                    <div>Gruppen</div>
                </div>
                <div className="space-y-2">
                    <div>
                        <Link target="_blank" href="https://infai.org/das-institut/impressum/">
                            Impressum
                        </Link>
                    </div>
                    <div>
                        <a href="mailto:schlecht@infai.org,zinke@infai.org,mihaela.markovic@uni-leipzig.de,nicola.wuerffel@uni-leipzig.de">
                            Kontaktiere uns
                        </a>
                    </div>
                </div>
            </div>
            <hr className="w-8/12 mx-auto mb-4 border-gray-400/50 border-0.5" />
            <p className="text-white flex justify-center">© 2023 VE-Collab. All rights reserved.</p>
        </footer>
    );
}
