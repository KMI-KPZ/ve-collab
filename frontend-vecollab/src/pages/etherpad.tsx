import { fetchGET } from '@/lib/backend';
import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { getSession, signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect} from 'react';

interface Props {
    padID: string | null | undefined;
}

export default function Etherpad({
    padID,
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
        } else if (padID === null || padID == undefined) {
            // pad-id null means no session was available server side and we have to force a login
            signIn('keycloak');
        }
    }, [router, padID]);

    return (
        <>
            {padID !== '' && (
                <iframe
                    src={`${process.env.NEXT_PUBLIC_ETHERPAD_URL}/p/${padID}`}
                    width={600}
                    height={400}
                ></iframe>
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
            props: { padID: null },
        };
    }

    const response = await fetchGET(
        `/etherpad_integration/get_pad_session?plan_id=${context.query.planID}`,
        session.accessToken
    );
    context.res.setHeader('Set-Cookie', `sessionID=${response.session_id}`);
    
    return {
        props: { padID: response.pad_id },
    };
    
};
