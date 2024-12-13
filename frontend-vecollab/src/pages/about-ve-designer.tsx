import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import Image from 'next/image';
import H1 from '@/components/common/H1';
import { signIn } from 'next-auth/react';

import teamCollabImg from '@/images/team-collab_sm.jpg';

export default function AboutVeDesigner(): JSX.Element {
    const { t } = useTranslation('common');

    return (
        <>
            <CustomHead pageTitle={t('about-ve-designer.title')} pageSlug={`about-ve-designer`} />

            <H1 className="mt-12">{t('about-ve-designer.title')}</H1>

            <div className="flex justify-between my-12">
                <div>
                    <ul className="list-disc p-6 ml-6 gap-4 space-y-4">
                        {(
                            t('about-ve-designer.text', { returnObjects: true }) as Array<string>
                        ).map((value, i) => {
                            return <li key={i}>{value}</li>;
                        })}
                    </ul>

                    <div className="py-2 px-4">
                        <div
                            onClick={() => {
                                signIn('keycloak');
                            }}
                            className="w-fit m-auto px-6 py-4  flex items-center justify-center bg-white border-4 border-ve-collab-orange drop-shadow rounded-full cursor-pointer transition ease-in-out hover:scale-105"
                        >
                            <Image
                                src={teamCollabImg}
                                alt={t("about-ve-designer.image_alt")}
                                className="w-[200px] rounded-full"
                            />
                            <div className="pl-6 text-center">
                                <div className="text-2xl mb-6">
                                    <span className="text-ve-collab-orange">VE</span>{' '}
                                    <span className="text-ve-collab-blue">Collab</span>
                                </div>
                                {t('join_now')}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full">
                    <video width="100%" controls className="rounded-md">
                        <source src="/videos/screencast-web.webm" type="video/webm" />
                        {t('common:video_not_supported')}
                    </video>
                </div>
            </div>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
