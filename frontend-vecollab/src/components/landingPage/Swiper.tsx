import { Swiper as SwiperJS, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y, Autoplay } from 'swiper/modules';
import Image, { StaticImageData } from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import vecollabNotebook from '@/images/frontpage/VeCollabNotebook.png';

import screenshotLearningMaterial from '@/images/frontpage/screenshotLearningMaterial.jpg';
import screenshotSocialNetwork from '@/images/frontpage/screenshotSocialNetwork.jpg';
import screenshotVeDesigner from '@/images/frontpage/screenshotVeDesigner.jpg';
import { useTranslation } from 'next-i18next';
import ButtonLight from '../common/buttons/ButtongLight';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import Link from 'next/link';
import ButtonLightBlue from '../common/buttons/ButtonLightBlue';

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
                <h1 className="mb-4 text-xl font-bold">{title}</h1>
                <p className="">{text}</p>
                <p className="text-right my-4">
                    <Link
                        href={link}
                        className='px-4 py-2 bg-white/15 hover:bg-white/25 rounded-md transition easy-in-out"'
                    >
                        {linkText || 'Mehr erfahren'}
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
            autoplay={{ delay: 5000 }}
            loop
            spaceBetween={50}
            slidesPerView={1}
        >
            <SwiperSlide>
                <SlideContent
                    title="Wir machen Sie fit für Virtuelle Austausche/Virtual Exchanges"
                    text="Wollen Sie Ihre Lehre kooperativer, digitaler und internationaler
                            machen? VE-Collab bietet Ihnen vielfältige Qualifizierungsangebote und
                            gibt Hilfestellungen bei der Initialisierung, Planung und Durchführung
                            internationaler und nationaler virtueller Austausche (engl. virtual
                            exchanges)."
                    link="/#features"
                    img={vecollabNotebook}
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title="Finden Sie geeignete Partner*innen und vernetzen Sie sich"
                    text="Finden Sie in unserer virtual Community of Practice VA-Partner*innen,
                            teilen Sie Good-Practice-Beispiele und vernetzen Sie sich international."
                    link="/about-virtual-community-of-practice"
                    img={screenshotSocialNetwork}
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title="Wir helfen Ihnen Schritt für Schritt bei der Planung"
                    text="Mit unserem “VE-Designer” ermöglichen wir Noviz*innen einen leichten
                            Einstieg in die VE-Planung und Expert*innen eine individuell anpassbare
                            Maske für die kollegiale Planung der gemeinsamen virtuellen Austausche."
                    link="/about-ve-designer"
                    img={screenshotVeDesigner}
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title="Für Institutionen"
                    text="VE sind ein niedrigschwelliges Angebot zur Steigerung der
                            Internationalisierung der Lehre und der Digital Literacy von Lehrenden
                            und Studierenden. VE-Collab bietet Ihnen eine Plattform, mit der Sie VE
                            an Ihrer Hochschule bekannt machen können, Lehrende qualifizieren und VE
                            langfristig unterstützen können. Bauen Sie Kompetenzen auf und Hürden ab
                            - stärken Sie die Internationalisierung an Ihrer Institution."
                    link="/#institutional-values"
                />
            </SwiperSlide>

            <SwiperSlide>
                <SlideContent
                    title="Für Lehrende"
                    text="Mit VE können Sie sich und ihre Studierenden international vernetzen und
                            die Welt in Ihre Veranstaltungen holen. VE-Collab hilft Ihnen, sich
                            anhand kurzer Lehreinheiten mit VE vertraut zu machen, wichtige
                            Grundlagen für die Durchführung von VE zu erwerben, und unterstützt Sie
                            bei Ihrer Lehrplanung. Nutzen Sie VE-Collab außerdem, um sich in einer
                            weltweiten Community zu VE zu vernetzen und auszutauschen."
                    link="/#teachers-values"
                />
            </SwiperSlide>
        </SwiperJS>
    );
}
