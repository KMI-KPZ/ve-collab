import React, { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import WhiteBox from '@/components/common/WhiteBox';
import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import H1 from '@/components/common/H1';

export default function Invitation(): JSX.Element {
    const { t } = useTranslation('common');
    const router = useRouter();

    return (
        <>
            <CustomHead pageDescription={t('frontpage.description')} />
            <div>
                <div className="flex flex-col m-auto py-6 px-2 sm:p-12 max-w-(--breakpoint-2xl) z-0 relative gap-y-12">
                    <H1>Invitation</H1>
                    <div>ID: {router.query.invitationId}</div>
                    <WhiteBox className="w-2/3 flex items-center gap-4">
                        <ButtonSecondary
                            onClick={() =>
                                signIn('keycloak', {
                                    callbackUrl: `/home?invitationId=${router.query.invitationId}`,
                                })
                            }
                        >
                            {t('login')}
                        </ButtonSecondary>

                        <ButtonSecondary
                            onClick={() =>
                                signIn('keycloak', {
                                    callbackUrl: `/home?invitationId=${router.query.invitationId}`,
                                })
                            }
                        >
                            {t('register')}
                        </ButtonSecondary>
                    </WhiteBox>
                </div>
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
