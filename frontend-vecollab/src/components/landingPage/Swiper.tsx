import { Swiper as SwiperJS, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y, Autoplay } from 'swiper/modules';
import Image from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import img1 from '@/images/frontpageSwiper/1.jpg';
import img2 from '@/images/frontpageSwiper/2.jpg';
import img3 from '@/images/frontpageSwiper/3.jpg';
import { useTranslation } from 'next-i18next';

interface Props {
    className?: string;
}

export default function Swiper({ className }: Props) {
    const { t } = useTranslation('common');

    return (
        <SwiperJS
            modules={[Navigation, Pagination, A11y, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000 }}
            loop
            spaceBetween={50}
            slidesPerView={1}
        >
            <SwiperSlide>
                <div className="flex flex-wrap-reverse mx-12 my-2 gap-x-12 gap-y-6 pb-6 items-center justify-center">
                    {/* drop-shadow-[0_0_8px_#00748f] */}
                    <Image
                        src={img1}
                        alt={t('designer_screenshot')}
                        className="h-[220px] w-auto outline outline-2 outline-offset-2 outline-ve-collab-blue rounded-md"
                    ></Image>

                    <div className="w-1/2 min-w-96">
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2">
                            VE-Designer
                        </span>
                        <ul className="list-disc ml-6">
                            <li>{t('ve_designer_li_1')}</li>
                            <li>{t('ve_designer_li_2')}</li>
                        </ul>
                    </div>
                </div>
            </SwiperSlide>
            <SwiperSlide>
                <div className="flex flex-wrap-reverse mx-12 my-2 gap-x-12 gap-y-6 pb-6 items-center justify-center">
                    {/* drop-shadow-[0_0_8px_#00748f] */}
                    <Image
                        src={img2}
                        alt={t('material_screenshot')}
                        className="h-[220px] w-auto outline outline-2 outline-offset-2 outline-ve-collab-blue rounded-md"
                    ></Image>

                    <div className="w-1/2 min-w-96">
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2">
                            {t('materials')}
                        </span>
                        <ul className="list-disc ml-6">
                            <li>{t('materials_li_1')}</li>
                            <li>{t('materials_li_2')}</li>
                            <li>{t('materials_li_3')}</li>
                        </ul>
                    </div>
                </div>
            </SwiperSlide>
            <SwiperSlide>
                <div className="flex flex-wrap-reverse mx-12 my-2 gap-x-12 gap-y-6 pb-6 items-center justify-center">
                    {/* drop-shadow-[0_0_8px_#00748f] */}
                    <Image
                        src={img3}
                        alt={t('community_screenshot')}
                        className="h-[220px] w-auto outline outline-2 outline-offset-2 outline-ve-collab-blue rounded-md"
                    ></Image>

                    <div className="w-1/2 min-w-96">
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2">
                            {t('virtual_community_of_practice')}
                        </span>
                        <ul className="list-disc ml-6">
                            <li>{t('community_li_1')}</li>
                            <li>{t('community_li_2')}</li>
                            <li>{t('community_li_3')}</li>
                        </ul>
                    </div>
                </div>
            </SwiperSlide>
        </SwiperJS>
    );
}
