import React from 'react';
import { useTranslation } from 'next-i18next';
import Swiper from '@/components/landingPage/Swiper';
import { MdArrowRight } from 'react-icons/md';
import Image from 'next/image';
import H2 from '../common/H2';

import featuresLearningsImg from '@/images/frontpage/featureboxLearningMaterial.jpg';
import featureboxcommunity from '@/images/frontpage/featureboxCommunity.jpg';
import featureboxDesigner from '@/images/frontpage/featureboxDesigner.jpg';
import featureboxCompetence from '@/images/frontpage/featureboxCompetence.jpg';
import featureboxInternationlization from '@/images/frontpage/featureboxInternationalization.jpg';
import featureboxQualification from '@/images/frontpage/featureboxQualificartion.jpg';
import featureboxSupport from '@/images/frontpage/featureboxSupport.jpg';
import featureboxNetworking from '@/images/frontpage/featureboxNetworking.jpg';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Frontpage() {
    const router = useRouter();
    const { t } = useTranslation('common');

    const InfoBox = ({
        title,
        text,
        image,
        link,
    }: {
        title: string;
        text: string;
        image: React.ReactNode;
        link?: string;
    }) => (
        <div
            className={`w-1/3 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg ${
                link ? 'cursor-pointer transition ease-in-out delay-150 hover:scale-105' : ''
            }`}
            onClick={() => {
                if (link) {
                    router.push(link);
                }
            }}
        >
            <div className="bg-ve-collab-orange-light w-[272px] h-[272px] -bottom-[136px] -right-[136px] absolute -z-10 rotate-45"></div>
            <div className="bg-ve-collab-orange/75 w-[232px] h-[232px] -bottom-[116px] -right-[116px] absolute -z-10 rotate-45"></div>

            {image}

            <span className="block mb-4 text-xl">{title}</span>

            <p>{text}</p>

            {link && (
                <Link
                    href={link}
                    className="py-2 px-4 mt-6 block ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out"
                >
                    {t('more')} <MdArrowRight size={24} className="inline mx-1" />
                </Link>
            )}
        </div>
    );

    return (
        <>
            {/* <h1 className="px-6 mt-6 text-white font-bold uppercase text-2xl md:text-4xl">
                {t('homepage_banner')}
            </h1> */}

            <div className="m-auto p-6 w-full lg:px-12 lh:py-6 max-w-screen-2xl text-white">
                <Swiper />
            </div>

            <div className="m-auto text-left lg:w-5/6" id="features">
                <H2 className="text-white font-bold !text-2xl">{t('frontpage.features.title')}</H2>
            </div>

            <div className="m-auto flex gap-x-12 lg:w-5/6 justify-center text-center">
                <InfoBox
                    title="Selbstlernmaterialien"
                    text="Stetig wachsendes Angebot interaktiver Weiterbildungsmaterialien als OER"
                    link="/learning-material"
                    image={
                        <Image
                            src={featuresLearningsImg}
                            alt="workingdesk"
                            className="h-[220px] w-auto m-auto hue-rotate-[103deg] saturate-200"
                        ></Image>
                    }
                />

                <InfoBox
                    title="VA-Planungstool “VE-Designer”"
                    text="Schritt für Schritt Unterstützung bei der (gemeinsamen) VA-Planung"
                    image={
                        <Image
                            src={featureboxDesigner}
                            alt="frame of a planing tool"
                            className="h-[220px] w-auto m-auto transition ease-in-out saturate-200 grayscale hover:grayscale-0"
                            // hue-rotate-[256deg]
                        ></Image>
                    }
                    link="/about-ve-designer"
                />

                <InfoBox
                    title="Virtual Community of Practice"
                    text="VA-Partner*innen finden, Good-Practice-Beispiele teilen, (international)
                        vernetzen"
                    image={
                        <Image
                            src={featureboxcommunity}
                            alt="network of people"
                            className="h-[220px] w-auto m-auto hue-rotate-[146deg] saturate-200"
                        ></Image>
                    }
                    link="/about-virtual-community-of-practice"
                />
            </div>

            <div className="w-[calc(100svw-1rem)] ml-[50%] -translate-x-1/2 bg-white/75">
                <div className="w-5/6 m-auto  p-6 lg:p-12 max-w-screen-xl flex justify-center rounded-md drop-shadow-lg p-4">
                    <video width="320" height="240" controls className="w-full h-auto rounded-md">
                        <source src="/videos/screencast-web.webm" type="video/webm" />
                        {t('video_not_supported')}
                    </video>
                </div>
            </div>

            <div className="m-auto text-left lg:w-5/6" id="institutional-values">
                <H2 className="text-white font-bold !text-2xl ">Mehrwerte für Institutionen</H2>
            </div>
            <div className="m-auto flex gap-x-12 lg:w-5/6 justify-center text-center">
                <InfoBox
                    title="Kompetenzen aufbauen - Hürden abbauen"
                    text="Unterstützen Sie durch die Qualifikations- und Unterstützungsangebote von
                        VE-Collab ihre Lehrenden und Mitarbeitenden bei der Anbahnung und
                        Durchführung virtueller Austausche."
                    image={
                        <Image
                            src={featureboxCompetence}
                            alt="workingdesk"
                            className="h-[220px] w-auto m-auto hue-rotate-[68deg] saturate-[3.5]"
                        ></Image>
                    }
                />

                <InfoBox
                    title="Internationalisierung und Digital Literacy stärken"
                    text="Stärken Sie die Internationalisierung des Studiums und die Digital Literacy
                        von Lehrenden und Studierenden durch virtuelle Austausche, indem Sie
                        VE-Collab in ihrer Institution verankern."
                    image={
                        <Image
                            src={featureboxInternationlization}
                            alt="workingdesk"
                            className="h-[220px] w-auto m-auto hue-rotate-[68deg] saturate-[3.5]"
                        ></Image>
                    }
                />
            </div>

            <div className="m-auto text-left lg:w-5/6" id="teachers-values">
                <H2 className="text-white font-bold !text-2xl !mb-0">Mehrwerte für Lehrende</H2>
            </div>
            <div className="m-auto flex gap-x-12 lg:w-5/6 justify-center text-center">
                <InfoBox
                    title="Qualifikation"
                    text="Bilden Sie sich mit den Selbstlernmaterialien von VE-Collab flexibel weiter
                        und bringen Sie so Ihre eigene Lehre auf ein neues Level."
                    image={
                        <Image
                            src={featureboxQualification}
                            alt="workingdesk"
                            className="h-[220px] w-auto m-auto hue-rotate-[103deg] saturate-200"
                        ></Image>
                    }
                />

                <InfoBox
                    title="Unterstützung"
                    text="Unser VE-Designer unterstützt Sie Schritt-für-Schritt in der Planung und
                        Organisation Ihres virtuellen Austauschs, zusätzliche Hilfe erhalten Sie in
                        der Community."
                    image={
                        <Image
                            src={featureboxSupport}
                            alt="frame of a planing tool"
                            className="h-[220px] w-auto m-auto transition ease-in-out saturate-100 hue-rotate-[256deg] hover:saturate-200 cursor-pointer"
                        ></Image>
                    }
                />

                <InfoBox
                    title="Vernetzung"
                    text="Durch VE-Collab bauen Sie einfach und unkompliziert neue (internationale)
                        Kontakte für die Durchführung virtueller Austausche auf."
                    image={
                        <Image
                            src={featureboxNetworking}
                            alt="network of people"
                            className="h-[220px] w-auto m-auto hue-rotate-[146deg] saturate-200"
                        ></Image>
                    }
                />
            </div>
        </>
    );
}
