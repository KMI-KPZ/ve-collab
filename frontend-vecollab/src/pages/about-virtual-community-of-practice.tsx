import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import H1 from '@/components/common/H1';

import teamCollabImg from '@/images/team-collab_sm.jpg';

export default function AboutVCoP(): JSX.Element {
    const { t } = useTranslation('common');

    return (
        <>
            <CustomHead
                pageTitle={t('about-vcop.title')}
                pageSlug={`about-virtual-community-of-practice`}
            />

            <H1 className="mt-12">{t('about-vcop.title')}</H1>

            <div className="flex justify-between my-12">
                <div>
                    <ul className="list-disc p-6 ml-6 gap-4 space-y-4">
                        {(t('about-vcop.text', { returnObjects: true }) as Array<string>).map(
                            (value, i) => {
                                return <li key={i}>{value}</li>;
                            }
                        )}
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
                                alt="A group of People"
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

                <video
                    width="320"
                    height="240"
                    controls
                    preload="none"
                    className="w-full h-auto m-auto rounded-md"
                >
                    <source src="/videos/screencast-web.webm" type="video/webm" />
                    {t('common:video_not_supported')}
                </video>
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
