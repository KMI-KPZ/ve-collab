import React, { useRef, useState } from 'react';
import Image from 'next/image';

import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import H1 from '@/components/common/H1';
import { MdPlayCircle } from 'react-icons/md';
import H2 from '@/components/common/H2';

export const VIDEO_TUTORIALS: { title: string; src: string; poster: string }[] = [
    {
        title: 'Einführung',
        src: '/videos/screencast-web-1.mp4',
        poster: '/images/video-thumbnails/screencast.png',
    },
    {
        title: 'VE Designer',
        src: '/videos/screencast-web-1.mp4',
        poster: '/images/video-thumbnails/screencast.png',
    },
    {
        title: 'Community',
        src: '/videos/screencast-web-1.mp4',
        poster: '/images/video-thumbnails/screencast.png',
    },
];

export default function Help(): JSX.Element {
    const { t } = useTranslation('common');
    const videoRef = useRef<HTMLVideoElement>(null);

    const [idx, setIdx] = useState<number>(0);

    const handlePlay = (i: number) => {
        setIdx(i);
        videoRef.current?.load();
    };

    return (
        <>
            <CustomHead
                pageTitle={t('help')}
                pageSlug={'help'}
                pageDescription={t('help.description')}
            />

            <div className="m-auto p-6 sm:p-12">
                <div className="flex flex-wrap  items-center mb-10 mt-12">
                    <div>
                        <H1>{t('help')}</H1>
                        <div className={'text-gray-500 text-xl'}>{t('help_instructions')}</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border-1 border-gray-800 py-6 px-4 space-x-4">
                    <H2>{t('video_tutorials')}</H2>

                    <div className="flex flex-wrap">
                        <div className="flex flex-row sm:flex-col items-center w-full sm:w-1/4">
                            {VIDEO_TUTORIALS.map((video, i) => (
                                <div
                                    key={i}
                                    className={`relative w-auto inline-block min-w-[100px] group m-4 p-1 rounded-md shadow flex items-center justify-center cursor-pointer transition ease-in-out hover:scale-105 ${
                                        idx == i ? 'border border-2 border-slate-800' : ''
                                    }`}
                                    onClick={(e) => handlePlay(i)}
                                >
                                    <Image
                                        src={video.poster}
                                        alt={video.title}
                                        width={208}
                                        height={155}
                                        className="w-full h-auto  rounded-md"
                                    />
                                    <MdPlayCircle
                                        className="absolute text-gray-500 hover:text-gray-800"
                                        size={32}
                                    />
                                    <span className="absolute font-bold bg-white/75 top-0 p-2 w-full">
                                        {video.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="w-3/4 pr-6 max-w-[1280px] min-w-[320px]">
                            <span className="block mb-4 text-xl font-bold">
                                {VIDEO_TUTORIALS[idx].title}
                            </span>
                            <video
                                ref={videoRef}
                                width="320"
                                height="240"
                                controls
                                preload="none"
                                className="w-full h-auto m-auto rounded-md shadow"
                                poster={VIDEO_TUTORIALS[idx].poster}
                                autoPlay
                            >
                                <source
                                    src={VIDEO_TUTORIALS[idx].src}
                                    type="video/mp4"
                                    title={VIDEO_TUTORIALS[idx].title}
                                />
                                {t('common:video_not_supported')}
                            </video>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
