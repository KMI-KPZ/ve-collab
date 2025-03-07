import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import Image from 'next/image';
import H1 from '@/components/common/H1';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Autoplay, EffectFlip } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-flip';

import RegisterButton from '@/components/common/RegisterButton';
import { useRouter } from 'next/router';

export default function AboutVCoP(): JSX.Element {
    const { t } = useTranslation('common');
    const router = useRouter();

    const slides_de = [
        '/images/about-pages/groups-5.png',
        '/images/about-pages/groups-4.png',
        '/images/about-pages/groups-7.png',
        '/images/about-pages/groups-14.png',
        '/images/about-pages/groups-20.png',
    ];

    const slides_en = [
        '/images/about-pages/groups-6.png',
        '/images/about-pages/groups-3.png',
        '/images/about-pages/groups-10.png',
        '/images/about-pages/groups-13.png',
        '/images/about-pages/groups-21.png',
    ];

    const slides = router.locale === 'en' ? slides_en : slides_de;

    return (
        <>
            <CustomHead
                pageTitle={t('about-vcop.title')}
                pageSlug={`about-virtual-community-of-practice`}
            />

            <H1 className="mt-12">{t('about-vcop.title')}</H1>

            <div className="flex flex-wrap flex-wrap-reverse my-8 lg:my-12 lg:mx-8">
                <div className="w-full lg:w-1/2 px-10 pt-8">
                    <ul className="list-disc p-6 ml-6 gap-4 space-y-4">
                        {(t('about-vcop.text', { returnObjects: true }) as Array<string>).map(
                            (value, i) => {
                                return <li key={i}>{value}</li>;
                            }
                        )}
                    </ul>

                    <div className="py-2 px-4">
                        <RegisterButton />
                    </div>
                </div>
                <div className="w-full lg:w-1/2 lg:pl-10 ">
                    <Swiper
                        modules={[Navigation, A11y, EffectFlip, Autoplay]}
                        navigation
                        autoplay={{ delay: 3000 }}
                        speed={750}
                        loop
                        slidesPerView={1}
                        effect="flip"
                    >
                        {slides.map((slide, i) => (
                            <SwiperSlide key={i}>
                                <Image
                                    src={slide}
                                    width={1280}
                                    height={970}
                                    alt={t('vcop_screenshot')}
                                    className="max-h-[320px] md:max-h-[460px] lg:max-h-[560px] h-auto w-auto shadow border rounded-md mx-auto"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
