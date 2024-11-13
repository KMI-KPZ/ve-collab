import { fetchGET } from '@/lib/backend';
import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { getSession, signIn } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface Props {
    padID: string | null | undefined;
    error: string | null;
}

Etherpad.auth = true;
export default function Etherpad({
    padID,
    error,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const { t } = useTranslation('common');

    useEffect(() => {
        if (!router.isReady) {
            return;
        } else if (error === 'no_auth') {
            // no_auth error means no session was available server side and we have to force a login
            signIn('keycloak');
        }
    }, [router, padID, error]);

    return (
        <>
            {error === null ? (
                <iframe
                    src={`${process.env.NEXT_PUBLIC_ETHERPAD_BASE_URL}/p/${padID}`}
                    width={600}
                    height={400}
                ></iframe>
            ) : (
                <div className="w-full flex justify-center">
                    <div className="w-2/3 min-h-[80vh] flex justify-center items-center">
                        <p className="font-bold text-6xl text-center text-gray-500">
                            {t('no_pad_access')}
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
            props: {
                padID: null,
                error: 'no_auth',
                ...(await serverSideTranslations(context.locale ?? 'en', ['common'])),
            },
        };
    }

    const response = await fetchGET(
        `/etherpad_integration/get_pad_session?plan_id=${context.query.id as string}`,
        session.accessToken
    );

    if (response.success === true) {
        context.res.setHeader('Set-Cookie', `sessionID=${response.session_id}`);

        return {
            props: {
                padID: response.pad_id,
                error: null,
                ...(await serverSideTranslations(context.locale ?? 'en', ['common'])),
            },
        };
    } else {
        return {
            props: {
                padID: null,
                error: response.reason,
                ...(await serverSideTranslations(context.locale ?? 'en', ['common'])),
            },
        };
    }
};
