import React from 'react';
import veCollabLogo from '@/images/oldKavaqLogo.png';
import Image from 'next/image';

export default function FooterSection() {
    return (
        <footer className="bg-footer-pattern shadow-inner">
            <div className="h-64 px-5 pt-9 w-screen grid grid-cols-5 gap-4 text-white max-w-screen-2xl m-auto">
                <div className="col-span-2 ">
                    <Image src={veCollabLogo} alt="Ve Collab Logo" width={250} height={250}></Image>
                </div>
                <div className="space-y-2">
                    <div>Navigation</div>
                    <div>Startseite</div>
                    <div>Profil</div>
                    <div>Gruppen</div>
                </div>
                <div className="space-y-2">
                    <div>Mitgliedschaft</div>
                    <div>Über uns</div>
                </div>
                <div className="space-y-2">
                    <div>Kontaktiere uns</div>
                    <div>Email</div>
                </div>
            </div>
            <hr className="w-96 h-0.5 mx-auto mb-10 bg-gray-400 border-0 rounded" />
            <p className="text-white flex justify-center">
                © 2023 Kavaq. All rights reserved. | Terms and Conditions
            </p>
        </footer>
    );
}
