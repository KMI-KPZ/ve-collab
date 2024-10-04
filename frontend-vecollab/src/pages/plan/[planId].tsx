import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Link from 'next/link';
import { MdEdit, MdOutlineFileDownload } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { GiSadCrab } from 'react-icons/gi';
import { PlanSummary } from '@/components/planSummary/PlanSummary';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';

Plan.auth = true;
export default function Plan() {
    const { data: session } = useSession();
    const { t } = useTranslation('common')

    const router = useRouter();
    const { data: plan, isLoading } = useGetPlanById(router.query.planId as string);

    const username = session?.user.preferred_username;

    if (!isLoading && !plan._id) {
        return (
            <div className="flex flex-col items-center justify-center font-bold">
                <div className="flex items-center">
                    <GiSadCrab size={60} className="m-4" />
                    <div className="text-xl text-slate-900">
                        Dieser Plan wurde nicht gefunden.
                    </div>
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
                            <h1 className='text-4xl'>Plan</h1>
                            <div className='flex gap-x-4'>

                                {username && (
                                    <>
                                        {plan.write_access.includes(username) && (
                                            <ButtonLightBlue
                                                onClick={() =>
                                                    router.push({
                                                        pathname: '/ve-designer/name',
                                                        query: { plannerId: plan._id },
                                                    })
                                                }
                                            >
                                                <MdEdit className="inline" /> Bearbeiten
                                            </ButtonLightBlue>
                                        )}
                                    </>
                                )}
                                <ButtonLightBlue
                                    onClick={() => {
                                        router.push({
                                            pathname: `/api/pdf-plan`,
                                            query: { planId: plan._id },
                                        })
                                    }}
                                >
                                    <MdOutlineFileDownload className="inline" /> Herunterladen
                                </ButtonLightBlue>
                            </div>
                        </div>
                        <div className={'text-gray-500 text-xl'}>Zusammenfassung des Plans</div>
                    </div>
                    <div className="flex w-full">
                        <PlanSummary plan={plan} />
                    </div>
                </>
            )}
        </>
    );
}

export async function getServerSideProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
