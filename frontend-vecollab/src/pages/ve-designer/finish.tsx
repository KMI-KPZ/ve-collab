import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { PlanSummary } from '@/components/planSummary/PlanSummary';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { Socket } from 'socket.io-client';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { dropPlanLock } from '@/components/VE-designer/PlanSocket';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

interface Props {
    socket: Socket;
    feedbackFormURL: string;
}

Finished.auth = true;
export default function Finished({ socket, feedbackFormURL }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation('common');

    // TODO
    const [plan, setPlanData] = useState<IPlan>();

    return (
        <Wrapper
            socket={socket}
            title={t('designer_finish_title')}
            subtitle={t('designer_finish_subtitle')}
            methods={useForm<any>()}
            preventToLeave={false}
            nextpage="/ve-designer/post-process"
            nextpageBtnLabel={t('designer_finish_to_post_process')}
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
                    {t('designer_finish_feedback_1')}
                    <a
                        className="underline text-ve-collab-orange"
                        href={feedbackFormURL}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t('here')}
                    </a>{' '}
                    {t('designer_finish_feedback_2')}
                </div>
            )}
        </Wrapper>
    );
}

export async function getServerSideProps({ locale }: { locale: any }) {
    const feedbackFormURL = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL;
    return {
        props: {
            feedbackFormURL: feedbackFormURL ?? null,
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
