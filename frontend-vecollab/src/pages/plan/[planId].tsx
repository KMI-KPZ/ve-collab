import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Link from 'next/link';
import { MdEdit, MdOutlineFileDownload } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { GiSadCrab } from 'react-icons/gi';
import { PlanSummary } from '@/components/planSummary/PlanSummary';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Trans, useTranslation } from 'next-i18next';
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';
import { GetServerSidePropsContext } from 'next';

Plan.auth = true;
export default function Plan() {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    const router = useRouter();
    const { data: plan, isLoading } = useGetPlanById(router.query.planId as string);

    const username = session?.user.preferred_username;

    if (!isLoading && !plan._id) {
        return (
            <div className="flex flex-col items-center justify-center font-bold">
                <div className="flex items-center">
                    <GiSadCrab size={60} className="m-4" />
                    <div className="text-xl text-slate-900">Dieser Plan wurde nicht gefunden.</div>
                </div>
                <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
                    <Link href="/plans">Zurück zur Übersicht</Link>
                </button>
            </div>
        );
    }

    return (
        <>
            {isLoading ? (
                <LoadingAnimation />
            ) : (
                <>
                    <div className="mb-6 mt-12">
                        <div className={'flex justify-between font-bold mb-2'}>
                            <h1 className="text-3xl font-bold text-slate-650">{plan.name}</h1>
                            <div className="flex gap-x-4 print:hidden">
                                {username && (
                                    <>
                                        {plan.write_access.includes(username) && (
                                            <ButtonLightBlue
                                                classNameExtend="text-nowrap"
                                                onClick={() =>
                                                    router.push({
                                                        pathname: '/ve-designer/name',
                                                        query: { plannerId: plan._id },
                                                    })
                                                }
                                            >
                                                <MdEdit className="inline" /> {t('edit')}
                                            </ButtonLightBlue>
                                        )}
                                    </>
                                )}
                                <ButtonLightBlue
                                    classNameExtend="text-nowrap"
                                    onClick={() => {
                                        router.push({
                                            pathname: `/api/pdf-plan`,
                                            query: { planId: plan._id, locale: router.locale },
                                        });
                                    }}
                                >
                                    <MdOutlineFileDownload className="inline" /> {t('download')}
                                </ButtonLightBlue>
                            </div>
                        </div>
                        <div className="text-2xl font-semibold text-slate-500">
                            <Trans i18nKey="summary">
                                Summary of the
                                <span className="ml-2 before:block before:absolute before:-inset-1 before:-skew-y-3 before:bg-ve-collab-orange relative inline-block">
                                    <span className="relative text-white">plan</span>
                                </span>
                            </Trans>
                        </div>
                    </div>
                    <div className="flex w-full">
                        <PlanSummary plan={plan} openAllBoxes={true} isSingleView={true} />
                    </div>
                </>
            )}
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
