import { fetchGET } from '@/lib/backend';
import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { getSession, signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface Props {
    padID: string | null | undefined;
    error: string | null;
}

export default function Etherpad({
    padID,
    error,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const { data: session, status } = useSession();
    const router = useRouter();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    useEffect(() => {
        if (!router.isReady) {
            return;
        } else if (error === 'no_auth') {
            // pad-id null means no session was available server side and we have to force a login
            signIn('keycloak');
        }
    }, [router, padID]);

    return (
        <>
            {error === null ? (
                <iframe
                    src={`${process.env.NEXT_PUBLIC_ETHERPAD_URL}/p/${padID}`}
                    width={600}
                    height={400}
                ></iframe>
            ) : (
                <div className="w-full flex justify-center">
                    <div className="w-2/3 min-h-[80vh] flex justify-center items-center">
                        <p className="font-bold text-6xl text-center text-gray-500">
                            Sorry, du hast keinen Zugriff auf dieses Pad, da du keine Schreibrechte
                            zum zugehörigen Plan besitzt!
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}

export const getServerSideProps: GetServerSideProps<Props> = async (
    context: GetServerSidePropsContext
) => {
    const session = await getSession(context);
    // break if not session --> force signIn from client side
    if (!session) {
        return {
            props: { padID: null, error: 'no_auth' },
        };
    }

    const response = await fetchGET(
        `/etherpad_integration/get_pad_session?plan_id=${context.query.planID}`,
        session.accessToken
    );

    if (response.success === true) {
        context.res.setHeader('Set-Cookie', `sessionID=${response.session_id}`);

        return {
            props: { padID: response.pad_id, error: null },
        };
    } else {
        return {
            props: { padID: null, error: response.reason },
        };
    }
};
