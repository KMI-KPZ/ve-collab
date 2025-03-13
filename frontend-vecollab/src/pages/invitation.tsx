import React, { useEffect, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import WhiteBox from '@/components/common/WhiteBox';
import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import H1 from '@/components/common/H1';
import { fetchPOST } from '@/lib/backend';
import Link from 'next/link';
import LoadingAnimation from '@/components/common/LoadingAnimation';

export default function Invitation(): JSX.Element {
    const { t } = useTranslation('common');
    const router = useRouter();
    const { data: session, status } = useSession();
    const [sending, setSending] = useState<boolean>(false);
    const [error, setError] = useState<string>();
    const invitationId = router.query.invitationId;

    // const { data: invitationDetails } = useGetMailInvitationDetails(
    //         router.query.invitationId as string,
    //         session ? session.accessToken : ''
    //     );

    useEffect(() => {
        if (!invitationId || !session?.accessToken || sending) return;

        setSending(true);
        fetchPOST(
            '/mail_invitation/reply',
            {
                invitation_id: invitationId,
            },
            session?.accessToken
        )
            .catch((e) => {
                setError(e.toString());
                console.log(e);
            })
            .then((res) => {
                if (res.success) {
                    router.replace('/home');
                } else {
                    setError(res.reason.toString());
                    console.log(res);
                }
            });
    }, [invitationId, sending, session?.accessToken, router]);

    if (!invitationId || status == 'loading') return <></>;

    // TODO egal ob angemeldet oder nicht -> Einladungs-Infos zeigen?!

    if (!session) {
        return (
            <div className="fixed inset-0 z-[60] flex justify-center">
                <div className="absolute inset-0 bg-black/50">
                    <WhiteBox className="w-2/3 space-x-4 m-auto py-6 px-2 sm:p-12 max-w-(--breakpoint-2xl)">
                        <H1>{t('mail_invitation_page.title')}</H1>
                        <div className="my-10">{t('mail_invitation_page.intro')}</div>
                        <ButtonSecondary
                            onClick={() =>
                                signIn('keycloak', {
                                    callbackUrl: `/invitation?invitationId=${invitationId}`,
                                })
                            }
                        >
                            {t('login')}
                        </ButtonSecondary>

                        <ButtonSecondary
                            onClick={() =>
                                signIn('keycloak', {
                                    callbackUrl: `/invitation?invitationId=${invitationId}`,
                                })
                            }
                        >
                            {t('register')}
                        </ButtonSecondary>
                    </WhiteBox>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col m-auto py-6 px-2 sm:p-12 max-w-(--breakpoint-2xl)">
                <H1> {t('mail_invitation_page.title')}</H1>
                <div className="">
                    <LoadingAnimation className="inline-block my-10" />
                    {t('you_are_redirected')}
                    <p>
                        {t('after_3_seconds_redirect_click')}
                        <Link href={'/home'}>{t('here')}</Link>
                    </p>
                </div>
                {error !== undefined && <p>An error occured: {error}</p>}
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
