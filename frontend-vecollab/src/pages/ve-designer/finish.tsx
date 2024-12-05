import React, { useState } from 'react';
import { PlanSummary } from '@/components/planSummary/PlanSummary';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Socket } from 'socket.io-client';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';

interface Props {
    socket: Socket;
    feedbackFormURL: string;
}

Finished.auth = true;
Finished.autoForward = true;
export default function Finished({ socket, feedbackFormURL }: Props): JSX.Element {
    const { t } = useTranslation(['designer', 'common']);

    const [plan, setPlanData] = useState<IPlan>();

    return (
        <>
            <CustomHead pageTitle={t('finish.title')} pageSlug={'ve-designer/finish'} />
            <Wrapper
                socket={socket}
                title={t('finish.title')}
                subtitle={t('finish.subtitle')}
                methods={useForm<any>()}
                preventToLeave={false}
                nextpage="/ve-designer/post-process"
                nextpageBtnLabel={t('finish.to_post_process')}
                stageInMenu="finish"
                planerDataCallback={(d) => {
                    setPlanData(d);
                    return {};
                }}
                submitCallback={(d) => {}}
            >
                {typeof plan !== 'undefined' ? <PlanSummary plan={plan} /> : <LoadingAnimation />}
                {feedbackFormURL && (
                    <div className="mt-4 font-bold text-lg">
                        {t('finish.feedback_1')}
                        <a
                            className="underline text-ve-collab-orange"
                            href={feedbackFormURL}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {t('common:here')}
                        </a>{' '}
                        {t('finish.feedback_2')}
                    </div>
                )}
            </Wrapper>
        </>
    );
}

export async function getServerSideProps({ locale }: { locale: any }) {
    const feedbackFormURL = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL;
    return {
        props: {
            feedbackFormURL: feedbackFormURL ?? null,
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'designer'])),
        },
    };
}
