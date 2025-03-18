import { useState } from 'react';
import Image from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';

import { useTranslation } from 'next-i18next';
import Dialog from '../profile/Dialog';
import { useSession } from 'next-auth/react';
import { MdPlayCircle } from 'react-icons/md';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import { VIDEO_TUTORIALS } from '@/pages/help';
import { fetchPOST, useGetOwnProfile } from '@/lib/backend';

export default function IntroTutorial() {
    const { data: session } = useSession();
    const { t } = useTranslation(['common']);

    const {
        data: userProfile,
        isLoading,
        mutate,
    } = useGetOwnProfile(session?.accessToken ? session.accessToken : '');

    const [showOverview, setShowOverview] = useState<boolean>(false);
    const [idx, setIdx] = useState<number>(0);

    const handleClose = async () => {
        await fetchPOST(
            '/profileinformation',
            {
                first_view: true,
            },
            session?.accessToken
        );

        mutate();
    };

    const handlePlay = (i: number) => {
        setIdx(i);
        setShowOverview(false);
    };

    if (!session || isLoading) return <></>;
    if (userProfile.profile.first_view === true) return null;

    return (
        <div className="fixed inset-0 z-[99] bg-black/25 backdrop-blur-sm">
            <Dialog
                isOpen={true}
                onClose={() => {
                    if (showOverview) handleClose();
                    else setShowOverview(true);
                }}
                title={showOverview ? t('help.video_tutorials') : VIDEO_TUTORIALS[idx].title}
            >
                <div className="w-[50vw] min-w-[420px]">
                    {!showOverview ? (
                        <video
                            width="320"
                            height="240"
                            controls
                            preload="none"
                            className="w-full h-auto m-auto rounded-md cursor-pointer"
                            poster={VIDEO_TUTORIALS[idx].poster}
                            autoPlay
                            onEnded={() => setTimeout(() => setShowOverview(true), 3000)}
                        >
                            <source
                                src={VIDEO_TUTORIALS[idx].src}
                                type="video/mp4"
                                title={VIDEO_TUTORIALS[idx].title}
                            />
                            {t('common:video_not_supported')}
                        </video>
                    ) : (
                        <div>
                            <div className="flex items-center justify-center my-20">
                                {VIDEO_TUTORIALS.map((video, i) => (
                                    <div
                                        key={i}
                                        className={`group m-4 w-[210px] h-[118  px] rounded-md shadow relative flex items-center justify-center cursor-pointer transition ease-in-out hover:scale-105`}
                                        onClick={(e) => handlePlay(i)}
                                    >
                                        <Image
                                            src={video.poster}
                                            alt={video.title}
                                            width={210}
                                            height={118}
                                            className="w-full h-auto absolute rounded-md"
                                        />
                                        <MdPlayCircle
                                            className="absolute z-10 bg-white rounded-full text-gray-500 hover:text-gray-800"
                                            size={32}
                                        />
                                        <span className="absolute font-bold bg-white/75 top-0 p-2 w-full">
                                            {video.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <ButtonPrimary
                                onClick={handleClose}
                                className="my-2 block ml-auto text-right"
                            >
                                {t('close')}
                            </ButtonPrimary>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    );
}
