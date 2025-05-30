import { GetStaticPropsContext } from 'next';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// callback page that is being linked to if the client initiated account linking flow
// was successful. however, keycloak does not manage to fire the attribute importers
// that way, so we have to trigger a signOut and re-signIn with orcid as the external IdP
export default function OrcidAccountLinkCallback() {
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');

    const router = useRouter();

    const [tryingRelog, setTryingRelog] = useState(true);
    const [relogSuccessful, setRelogSuccessful] = useState(false);

    useEffect(() => {
        if (!router.isReady || status === 'loading') {
            return;
        }
        if (router.query.logout === 'true') {
            setTryingRelog(true);
            signOut({
                callbackUrl: `/orcidAccountLinkCallback?login=true&fwd=${router.query.fwd}`,
            });
        }
        if (!session && router.query.login === 'true') {
            signIn('keycloak', undefined, {
                kc_idp_hint: 'orcid',
            });
        } else {
            setTryingRelog(false);
            setRelogSuccessful(true);
            let targetUrl = router.query.fwd === undefined ? '/' : router.query.fwd.toString();
            router.push(targetUrl);
        }
    }, [router, session, status]);

    return (
        <div>
            {tryingRelog && (
                <p>
                    {t('orcid_link_successful')}
                    <a
                        className="font-bold text-ve-collab-blue"
                        onClick={() => {
                            signIn('keycloak', undefined, {
                                kc_idp_hint: 'orcid',
                            });
                        }}
                    >
                        {t('here')}
                    </a>
                </p>
            )}
            {relogSuccessful && (
                <p>
                    {t('orcid_link_relog_successful')}
                    <a
                        className="font-bold text-ve-collab-blue"
                        href={router.query.fwd === undefined ? '/' : router.query.fwd.toString()}
                    >
                        {t('here')}
                    </a>
                </p>
            )}
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
