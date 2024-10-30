import { useEffect, useMemo, useState } from 'react';
import { Swiper as SwiperJS, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar, A11y } from 'swiper/modules';
import Image from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import '@/styles/frontpageSwiper.css';

import img1 from '@/images/frontpageSwiper/1.jpg';
import img2 from '@/images/frontpageSwiper/2.jpg';
import img3 from '@/images/frontpageSwiper/3.jpg';

interface Props {
    className: string;
}

export default function Swiper({ className }: Props) {
    // this should be run only once per application lifetime
    useEffect(() => {}, []);

    return (
        <SwiperJS
            modules={[Navigation, Pagination, A11y]}
            navigation
            pagination={{ clickable: true }}
            // scrollbar={{ draggable: true }}

            spaceBetween={50}
            slidesPerView={1}
            // onSlideChange={() => console.log('slide change')}
            // onSwiper={(swiper: any) => console.log(swiper)}
        >
            <SwiperSlide>
                <div className="flex flex-wrap-reverse mx-12 my-2 gap-x-12 gap-y-6 pb-6 items-center justify-center">
                    {/* drop-shadow-[0_0_8px_#00748f] */}
                    <Image
                        src={img1}
                        alt={'Screenshot des VE-Designers'}
                        className="h-[220px] w-auto outline outline-2 outline-offset-2 outline-ve-collab-blue rounded-md"
                    ></Image>

                    <div className="w-1/2 min-w-96">
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2">
                            VE-Planungsassistent
                        </span>
                        <ul className="list-disc ml-6">
                            <li>
                                leitet VE-Partner:innen Schritt für Schritt durch die Planung eines
                                VE
                            </li>
                            <li>
                                Möglichkeit, erarbeitete VA-Pläne der Community als
                                Good-Practise-Beispiele zur Verfügung zu stellen
                            </li>
                        </ul>
                    </div>
                </div>
            </SwiperSlide>
            <SwiperSlide>
                <div className="flex flex-wrap-reverse mx-12 my-2 gap-x-12 gap-y-6 pb-6 items-center justify-center">
                    {/* drop-shadow-[0_0_8px_#00748f] */}
                    <Image
                        src={img2}
                        alt={'Screenshot des VE-Designers'}
                        className="h-[220px] w-auto outline outline-2 outline-offset-2 outline-ve-collab-blue rounded-md"
                    ></Image>

                    <div className="w-1/2 min-w-96">
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2">
                            Selbstlernmaterialien
                        </span>
                        <ul className="list-disc ml-6">
                            <li>
                                Interaktive, kontinuierlich erweiterte Qualifizierungsmaterialien
                                als OER
                            </li>
                            <li>
                                thematische Cluster: Grundlagen, Planung, Zusammenarbeit, technische
                                Aspekte
                            </li>
                            <li>
                                sowohl einführende als auch vertiefende Module für Novizen und
                                Expert:innen
                            </li>
                        </ul>
                    </div>
                </div>
            </SwiperSlide>
            <SwiperSlide>
                <div className="flex flex-wrap-reverse mx-12 my-2 gap-x-12 gap-y-6 pb-6 items-center justify-center">
                    {/* drop-shadow-[0_0_8px_#00748f] */}
                    <Image
                        src={img3}
                        alt={'Screenshot des VE-Designers'}
                        className="h-[220px] w-auto outline outline-2 outline-offset-2 outline-ve-collab-blue rounded-md"
                    ></Image>

                    <div className="w-1/2 min-w-96">
                        <span className="block mb-4 text-xl text-ve-collab-blue underline underline-offset-2">
                            Virtual Community of Practise
                        </span>
                        <ul className="list-disc ml-6">
                            <li>
                                themengebundener Austausch mit anderen Personen weltweit, öffentlich
                                und privat
                            </li>
                            <li>Profilinformationen als Grundlage für Partner:innen-Matching</li>
                            <li>VE-Schaufenster für aktuelle und vergangene Projekte</li>
                        </ul>
                    </div>
                </div>
            </SwiperSlide>
        </SwiperJS>
    );
}
