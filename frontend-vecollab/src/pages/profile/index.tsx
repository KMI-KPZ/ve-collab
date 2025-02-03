import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React from 'react';
import { getSession } from 'next-auth/react';

RedirectToProfile.auth = true;
RedirectToProfile.autoForward = true;

export default function RedirectToProfile() {
    return <></>;
}

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    const session = await getSession(context);

    return {
        redirect: {
            destination: session
                ? `${
                      context.locale == context.defaultLocale ? '' : '/' + context.locale
                  }/profile/user/${session?.user.preferred_username}`
                : `/`,
            permanent: false,
            ...(await serverSideTranslations(context.locale ?? 'en', ['common'])),
        },
    };
};
