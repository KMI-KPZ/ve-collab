import React from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';

export default function HeaderSection() {
    return (
        <header className="bg-white px-4 lg:px-6 py-2.5 drop-shadow-lg">
            <nav className="flex flex-wrap justify-between items-center mx-auto max-w-screen-2xl">
                <Link href="/">
                    <Image src={veCollabLogo} alt="Ve Collab Logo" width={250} height={250}></Image>
                </Link>
                <ul className="flex items-center font-semibold space-x-14">
                    <li>
                        <Link href="/">Start</Link>
                    </li>
                    <li>
                        <Link href="/projects">Projekte</Link>
                    </li>
                    <li>
                        <Link href="#">Gruppen</Link>
                    </li>
                    <li>
                        <Link href="#">Mitteilungen</Link>
                    </li>
                </ul>
                <ul className="flex items-center font-semibold space-x-8">
                    <li className="bg-kavaqOrange text-white py-4 pr-6 pl-5 rounded-lg">
                        <Link href="#">Login</Link>
                    </li>
                    <li>
                        <Link href="/projects">Registrieren</Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}
