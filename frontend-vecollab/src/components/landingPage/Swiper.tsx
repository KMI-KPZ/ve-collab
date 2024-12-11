import { Swiper as SwiperJS, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y, Autoplay } from 'swiper/modules';
import Image, { StaticImageData } from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import vecollabNotebook from '@/images/frontpage/VeCollabNotebook.png';

import screenshotSocialNetwork from '@/images/frontpage/screenshotSocialNetwork.jpg';
import screenshotVeDesigner from '@/images/frontpage/screenshotVeDesigner.jpg';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

interface Props {
    className?: string;
}

export default function Swiper({ className }: Props) {
    const { t } = useTranslation('common');

    const SlideContent = ({
        title,
        text,
        link,
        linkText,
        img,
        imgAlt,
    }: {
        title: string;
        text: string;
        link: string;
        linkText?: string;
        img?: StaticImageData;
        imgAlt?: string;
    }) => (
        <div className="flex flex-wrap-reverse mx-12 my-6 gap-x-12 gap-y-6 pb-6 items-center justify-center">
            <div className="w-1/2 min-w-96">
                <h1 className="mb-4 text-2xl md:text-3xl font-bold">{title}</h1>
                <p className="">{text}</p>
                <p className="text-right my-4">
                    <Link
                        href={link}
                        className="px-4 py-2 rounded-md bg-ve-collab-orange hover:shadow-button-primary transition easy-in-out"
                    >
                        {linkText || t("show_more")}
                    </Link>
                </p>
            </div>
            {img && (
                <Image
                    src={img}
                    alt={imgAlt ? t(imgAlt) : 'image'}
                    className="h-[220px] w-auto outline outline-2 outline-offset-2 outline-ve-collab-blue rounded-md"
                ></Image>
            )}
        </div>
    );

    return (
        <SwiperJS
            modules={[Navigation, Pagination, A11y, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 7500 }}
            loop
            spaceBetween={50}
            slidesPerView={1}
        >
            <SwiperSlide>
                <SlideContent
                    title={t("frontpage.slideshow.slide1.title")}
                    text={t("frontpage.slideshow.slide1.text")}
                    link="/#features"
                    img={vecollabNotebook}
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title={t("frontpage.slideshow.slide2.title")}
                    text={t("frontpage.slideshow.slide2.text")}
                    link="/about-virtual-community-of-practice"
                    img={screenshotSocialNetwork}
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title={t("frontpage.slideshow.slide3.title")}
                    text={t("frontpage.slideshow.slide3.text")}
                    link="/about-ve-designer"
                    img={screenshotVeDesigner}
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title={t("frontpage.slideshow.slide4.title")}
                    text={t("frontpage.slideshow.slide4.text")}
                    link="/#institutional-values"
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title={t("frontpage.slideshow.slide5.title")}
                    text={t("frontpage.slideshow.slide5.text")}
                    link="/#teachers-values"
                />
            </SwiperSlide>
        </SwiperJS>
    );
}
