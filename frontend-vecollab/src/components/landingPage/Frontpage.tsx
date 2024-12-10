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
import logoInfai from '@/images/logo_infai.png';
import logoUniLeipzig from '@/images/logo_uni_leipzig.png';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Frontpage() {
    const router = useRouter();
    const { t } = useTranslation('common');

    const FeatureBox = ({
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
            className={`group/box w-1/3 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg ${
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

            <span className="block mb-4 text-xl font-bold">{title}</span>

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

    const InfoBox = ({
        title,
        text,
        image,
    }: {
        title: string;
        text: string;
        image: React.ReactNode;
    }) => (
        <div className={`w-1/3 bg-white p-6 relative overflow-hidden`}>
            {image}

            <span className="block mb-4 text-xl font-bold">{title}</span>

            <p>{text}</p>
        </div>
    );

    return (
        <>
            <div className="m-auto p-6 w-full lg:px-12 lh:py-6 max-w-screen-2xl text-white">
                <Swiper />
            </div>

            <div className="w-[calc(100svw-1rem)] ml-[50%] -translate-x-1/2 bg-white/95">
                <div className="w-5/6 m-auto p-2 max-w-screen-xl flex justify-center items-center gap-x-8">
                    <Image src={logoInfai} alt="Logo InfAI" className="h-[100px] w-auto"></Image>
                    <Image
                        src={logoUniLeipzig}
                        alt="Logo Universität Leipzig"
                        className="h-[85px] w-auto"
                    ></Image>
                </div>
            </div>

            <div
                className="w-[calc(100svw-1rem)] ml-[50%] -translate-x-1/2 bg-white/75 -m-12"
                id="features"
            >
                <div className="w-5/6 mx-auto my-10 max-w-screen-xl">
                    <H2 className="mb-8 font-bold !text-2xl md:!text-3xl text-center">
                        {t('frontpage.features.title')}
                    </H2>

                    <div className="mx-auto flex gap-x-12 lg:w-5/6 justify-center text-center">
                        <FeatureBox
                            title="Selbstlernmaterialien"
                            text="Stetig wachsendes Angebot interaktiver Weiterbildungsmaterialien als OER"
                            link="/learning-material"
                            image={
                                <Image
                                    src={featuresLearningsImg}
                                    alt="workingdesk"
                                    className="h-[220px] w-auto m-auto hue-rotate-[86deg] saturate-100 group-hover/box:saturate-200"
                                ></Image>
                            }
                        />

                        <FeatureBox
                            title="VA-Planungstool “VE-Designer”"
                            text="Schritt für Schritt Unterstützung bei der (gemeinsamen) VA-Planung"
                            image={
                                <Image
                                    src={featureboxDesigner}
                                    alt="frame of a planing tool"
                                    className="h-[220px] w-auto m-auto transition ease-in-out hue-rotate-[256deg] saturate-100 group-hover/box:saturate-200"
                                ></Image>
                            }
                            link="/about-ve-designer"
                        />

                        <FeatureBox
                            title="Virtual Community of Practice"
                            text="VA-Partner*innen finden, Good-Practice-Beispiele teilen, (international)
                        vernetzen"
                            image={
                                <Image
                                    src={featureboxcommunity}
                                    alt="network of people"
                                    className="h-[220px] w-auto m-auto hue-rotate-[86deg] saturate-100 group-hover/box:saturate-200"
                                ></Image>
                            }
                            link="/about-virtual-community-of-practice"
                        />
                    </div>
                </div>
            </div>

            <div className="m-auto lg:w-5/6 p-12">
                <div className="max-w-screen-xl flex justify-center rounded-md drop-shadow-lg">
                    <video width="320" height="240" controls className="w-full h-auto rounded-md">
                        <source src="/videos/ve-collab-promo.mp4" type="video/webm" />
                        {t('video_not_supported')}
                    </video>
                </div>
            </div>

            <div className="w-[calc(100svw-1rem)] ml-[50%] -translate-x-1/2 bg-white -mb-12">
                <div className="w-5/6 mx-auto my-10 max-w-screen-xl" id="institutional-values">
                    <H2 className="mb-12 font-bold !text-2xl md:!text-3xl text-center">
                        Mehrwerte für Institutionen
                    </H2>
                    <div className="mx-auto my-4 flex gap-x-12 lg:w-5/6 justify-center text-center">
                        <InfoBox
                            title="Kompetenzen aufbauen - Hürden abbauen"
                            text="Unterstützen Sie durch die Qualifikations- und Unterstützungsangebote von
                        VE-Collab ihre Lehrenden und Mitarbeitenden bei der Anbahnung und
                        Durchführung virtueller Austausche."
                            image={
                                <Image
                                    src={featureboxCompetence}
                                    alt="workingdesk"
                                    className="h-[220px] w-auto m-auto hue-rotate-[256deg] saturate-200"
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
                                    className="h-[220px] w-auto m-auto hue-rotate-[256deg] saturate-200"
                                ></Image>
                            }
                        />
                    </div>
                </div>

                <div className="w-5/6 mx-auto my-10 max-w-screen-xl" id="teachers-values">
                    <H2 className="mb-12 font-bold !text-2xl md:!text-3xl text-center">
                        Mehrwerte für Lehrende
                    </H2>
                    <div className="mx-auto my-4 flex gap-x-12 lg:w-5/6 justify-center text-center">
                        <InfoBox
                            title="Qualifikation"
                            text="Bilden Sie sich mit den Selbstlernmaterialien von VE-Collab flexibel weiter
                        und bringen Sie so Ihre eigene Lehre auf ein neues Level."
                            image={
                                <Image
                                    src={featureboxQualification}
                                    alt="workingdesk"
                                    className="h-[220px] w-auto m-auto hue-rotate-[86deg] saturate-200"
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
                                    className="h-[220px] w-auto m-auto hue-rotate-[256deg] saturate-200"
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
                                    className="h-[220px] w-auto m-auto hue-rotate-[86deg] saturate-200"
                                ></Image>
                            }
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
