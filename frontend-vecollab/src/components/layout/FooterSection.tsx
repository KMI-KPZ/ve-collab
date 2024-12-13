import React from 'react';
import bmbfLogo from '@/images/footer/bmbf_logo.svg';
import euFundingLogo from '@/images/footer/eu_funding.png';
import Image from 'next/image';
import Link from 'next/link';
import Disclaimer from '../Disclaimer';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'next-i18next';

export default function FooterSection() {
    const isFrontpage = usePathname() == '/';
    const { t } = useTranslation('common');

    return (
        <footer
            className={`pb-4 z-0 shadow-inner ${
                isFrontpage
                    ? 'bg-white text-black border-t border-gray-400/50 border-0.5'
                    : 'bg-footer-pattern text-white'
            }`}
        >
            <div className="flex flex-wrap items-center max-w-screen-2xl md:w-8/12 mx-auto py-4 md:py-10">
                <div className="flex-none">
                    <Image src={bmbfLogo} height={120} alt="BMBF Logo"></Image>
                </div>
                <div className="flex-none">
                    <Image src={euFundingLogo} height={100} alt="NextGenerationEU Logo"></Image>
                </div>
                <p className="flex-1 mx-4">{t('funding')}</p>
            </div>
            <hr className="w-8/12 mx-auto mb-4 border-gray-400/50 border-0.5" />
            <div className="flex flex-wrap justify-center">
                <p className="mx-2">© 2024 VE-Collab</p>
                <p className="mx-2">
                    <Link target="_blank" href="https://infai.org/das-institut/impressum/">
                        {t('imprint')}
                    </Link>
                </p>
                <p className="mx-2">
                    <Link target="_blank" href="https://infai.org/datenschutzerklaerung-2/">
                        {t('privacy')}
                    </Link>
                </p>
                <p className="mx-2">
                    <a href="mailto:schlecht@infai.org,elisa.mueller@uni-leipzig.de">
                        {t('contact_us')}
                    </a>
                </p>
                {process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL && (
                    <p className="mx-2 font-bold">
                        <a href={process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL}>{t('feedback')}</a>
                    </p>
                )}
            </div>
            <Disclaimer />
        </footer>
    );
}
