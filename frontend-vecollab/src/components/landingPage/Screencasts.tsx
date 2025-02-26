import { useState } from 'react';
import { useCookies } from 'react-cookie';

import 'swiper/css';
import 'swiper/css/navigation';

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Dialog from '../profile/Dialog';
import { useSession } from 'next-auth/react';

import vecollabNotebook from '@/images/frontpage/VeCollabNotebook.png';

const FIRST_VISIT = 'intro_screencast';

interface Props {
    // className?: string;
    // profileInformation: BackendUser;
}

Screencasts.auth = true;
export default function Screencasts() {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);
    const router = useRouter();

    const [cookies, setCookie] = useCookies([FIRST_VISIT]);
    const [firstVisit, setFirstVisit] = useState(
        cookies[FIRST_VISIT] === undefined || cookies[FIRST_VISIT] === true
    );

    const onClick = () => {
        // e.preventDefault();

        // determine tomorrows Date for cookie expires attribute
        const expiryTomorrow = new Date();
        expiryTomorrow.setDate(expiryTomorrow.getDate() + 1);

        setCookie(FIRST_VISIT, 'false', { expires: expiryTomorrow });
        setFirstVisit(false);
    };

    if (!session) return <></>;

    if (firstVisit === false) return null;

    return (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm">
            <Dialog isOpen={true} onClose={onClick} title={'Einführung'}>
                <div className="w-[50vw] min-w-[420px]">
                    <video
                        width="320"
                        height="240"
                        controls
                        preload="none"
                        className="w-full h-auto m-auto rounded-md bg-red"
                        poster="/images/video-thumbnails/screencast.png"
                    >
                        <source src="/videos/screencast-web-1.mp4" type="video/webm" />
                        {t('common:video_not_supported')}
                    </video>
                </div>
            </Dialog>
        </div>
    );
}
