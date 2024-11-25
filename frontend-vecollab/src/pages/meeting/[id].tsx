import LoadingAnimation from '@/components/common/LoadingAnimation';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import CustomHead from '@/components/metaData/CustomHead';

Meeting.auth = true;
export default function Meeting() {
    const router = useRouter();
    const id = router.query.id as string;
    const [loading, setLoading] = useState(true);

    // we need to wait for the router to be ready to initialize the jitsi meeting,
    // otherwise router.query.meetingId would be undefined, cause Jitsi to crash
    useEffect(() => {
        if (!router.isReady) {
            setLoading(true);
            return;
        } else {
            setLoading(false);
        }
    }, [router]);

    return (
        <>
            <CustomHead pageTitle={'Meeting'} pageSlug={`meeting/${id}`} />
            {loading ? (
                <div className="h-96 flex items-center justify-center">
                    <LoadingAnimation />
                </div>
            ) : (
                <JitsiMeeting roomName={router.query.id as string} />
            )}
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
