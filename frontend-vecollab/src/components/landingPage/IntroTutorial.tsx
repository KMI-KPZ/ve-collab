import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useCookies } from 'react-cookie';

import 'swiper/css';
import 'swiper/css/navigation';

import { useTranslation } from 'next-i18next';
import Dialog from '../profile/Dialog';
import { useSession } from 'next-auth/react';
import { MdPlayCircle } from 'react-icons/md';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import { VIDEO_TUTORIALS } from '@/pages/help';

const COOKIE = 'firstvisit-tutorial';

export default function IntroTutorial() {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [cookies, setCookie] = useCookies([COOKIE]);
    const [visable, setVisable] = useState(
        cookies[COOKIE] === undefined || cookies[COOKIE] === true
    );
    const [showOverview, setShowOverview] = useState<boolean>(false);
    const [idx, setIdx] = useState<number>(0);

    const handleClose = () => {
        // TODO backend save in user profile!
        // determine tomorrows Date for cookie expires attribute
        const expiryTomorrow = new Date();
        expiryTomorrow.setDate(expiryTomorrow.getDate() + 1);

        setCookie(COOKIE, 'false', { expires: expiryTomorrow });
        setVisable(false);
    };

    const handlePlay = (i: number) => {
        setIdx(i);
        setShowOverview(false);
    };

    if (!session) return <></>;

    if (visable === false) return null;

    return (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm">
            <Dialog
                isOpen={true}
                onClose={() => {
                    if (showOverview) handleClose();
                    else setShowOverview(true);
                }}
                title={showOverview ? 'Video-Tutorials' : VIDEO_TUTORIALS[idx].title}
            >
                <div className="w-[50vw] min-w-[420px]">
                    {!showOverview ? (
                        <video
                            width="320"
                            height="240"
                            controls
                            preload="none"
                            className="w-full h-auto m-auto rounded-md"
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
                            <div className="flex items-center justify-center">
                                {VIDEO_TUTORIALS.map((video, i) => (
                                    <div
                                        key={i}
                                        className={`group m-4 w-[208px] h-[155px] rounded-md shadow relative flex items-center justify-center cursor-pointer absolute transition ease-in-out hover:scale-105`}
                                        onClick={(e) => handlePlay(i)}
                                    >
                                        <Image
                                            src={video.poster}
                                            alt={video.title}
                                            width={208}
                                            height={155}
                                            className="w-full h-auto absolute rounded-md"
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
                            <ButtonPrimary
                                onClick={handleClose}
                                className="my-2 block ml-auto text-right"
                            >
                                {'close'}
                            </ButtonPrimary>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    );
}
