import LoadingAnimation from '@/components/LoadingAnimation';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Meeting() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    // we need to wait for the router to be ready to initialize the jitsi meeting,
    // otherwise router.query.meetingId would be undefined, cause Jitsi to crash
    useEffect(() => {
        if (!router.isReady) {
            setLoading(true);
            return;
        } else {
            setLoading(false);
        }
    });

    return (
        <>
            {loading ? (
                <div className="h-96 flex items-center justify-center">
                    <LoadingAnimation />
                </div>
            ) : (
                <JitsiMeeting roomName={router.query.meetingId as string} />
            )}
        </>
    );
}
