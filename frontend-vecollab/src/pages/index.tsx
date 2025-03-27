import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import BackgroundAnimation from '@/components/landingPage/BackgroundAnimation';
import Frontpage from '@/components/landingPage/Frontpage';
import CustomHead from '@/components/metaData/CustomHead';

export default function Home(): JSX.Element {
    const { t } = useTranslation('common');

    return (
        <>
            <CustomHead pageDescription={t('frontpage.description')} />
            <div>
                <BackgroundAnimation className="-z-10" enable={true} />
                <div className="flex flex-col m-auto py-6 px-2 sm:p-12 max-w-(--breakpoint-2xl) z-0 relative gap-y-12">
                    <Frontpage />
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
