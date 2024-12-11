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
                    <Link href={'https://infai.org'} target="_blank">
                        <Image
                            src={logoInfai}
                            alt={t('frontpage.logo_infai')}
                            className="h-[100px] w-auto transition ease-in-out delay-150 hover:scale-105"
                        ></Image>
                    </Link>
                    <Link href={'https://www.uni-leipzig.de/'} target="_blank">
                        <Image
                            src={logoUniLeipzig}
                            alt={t('frontpage.logo_uni_leipzig')}
                            className="h-[85px] w-auto transition ease-in-out delay-150 hover:scale-105"
                        ></Image>
                    </Link>
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
                            title={t('frontpage.features.learning_material.title')}
                            text={t('frontpage.features.learning_material.text')}
                            link="/learning-material"
                            image={
                                <Image
                                    src={featuresLearningsImg}
                                    alt={t('frontpage.features.learning_material.image_alt')}
                                    className="h-[220px] w-auto m-auto hue-rotate-[86deg] saturate-100 group-hover/box:saturate-200"
                                ></Image>
                            }
                        />

                        <FeatureBox
                            title={t('frontpage.features.ve_designer.title')}
                            text={t('frontpage.features.ve_designer.text')}
                            image={
                                <Image
                                    src={featureboxDesigner}
                                    alt={t('frontpage.features.ve_designer.image_alt')}
                                    className="h-[220px] w-auto m-auto transition ease-in-out hue-rotate-[256deg] saturate-100 group-hover/box:saturate-200"
                                ></Image>
                            }
                            link="/about-ve-designer"
                        />

                        <FeatureBox
                            title={t('frontpage.features.vcop.title')}
                            text={t('frontpage.features.vcop.text')}
                            image={
                                <Image
                                    src={featureboxcommunity}
                                    alt={t('frontpage.features.vcop.image_alt')}
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
                        {t('frontpage.institutional_values.title')}
                    </H2>
                    <div className="mx-auto my-4 flex gap-x-12 lg:w-5/6 justify-center text-center">
                        <InfoBox
                            title={t('frontpage.institutional_values.value1.title')}
                            text={t('frontpage.institutional_values.value1.text')}
                            image={
                                <Image
                                    src={featureboxCompetence}
                                    alt={t('frontpage.institutional_values.value1.image_alt')}
                                    className="h-[220px] w-auto m-auto hue-rotate-[256deg] saturate-200"
                                ></Image>
                            }
                        />

                        <InfoBox
                            title={t('frontpage.institutional_values.value2.title')}
                            text={t('frontpage.institutional_values.value2.text')}
                            image={
                                <Image
                                    src={featureboxInternationlization}
                                    alt={t('frontpage.institutional_values.value2.image_alt')}
                                    className="h-[220px] w-auto m-auto hue-rotate-[256deg] saturate-200"
                                ></Image>
                            }
                        />
                    </div>
                </div>

                <div className="w-5/6 mx-auto my-10 max-w-screen-xl" id="teachers-values">
                    <H2 className="mb-12 font-bold !text-2xl md:!text-3xl text-center">
                        {t('frontpage.teachers_values.title')}
                    </H2>
                    <div className="mx-auto my-4 flex gap-x-12 lg:w-5/6 justify-center text-center">
                        <InfoBox
                            title={t('frontpage.teachers_values.value1.title')}
                            text={t('frontpage.teachers_values.value1.text')}
                            image={
                                <Image
                                    src={featureboxQualification}
                                    alt={t('frontpage.teachers_values.value1.image_alt')}
                                    className="h-[220px] w-auto m-auto hue-rotate-[86deg] saturate-200"
                                ></Image>
                            }
                        />

                        <InfoBox
                            title={t('frontpage.teachers_values.value2.title')}
                            text={t('frontpage.teachers_values.value2.text')}
                            image={
                                <Image
                                    src={featureboxSupport}
                                    alt={t('frontpage.teachers_values.value2.image_alt')}
                                    className="h-[220px] w-auto m-auto hue-rotate-[256deg] saturate-200"
                                ></Image>
                            }
                        />

                        <InfoBox
                            title={t('frontpage.teachers_values.value3.title')}
                            text={t('frontpage.teachers_values.value3.text')}
                            image={
                                <Image
                                    src={featureboxNetworking}
                                    alt={t('frontpage.teachers_values.value3.image_alt')}
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
