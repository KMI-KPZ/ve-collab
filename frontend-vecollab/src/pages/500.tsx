import { GetStaticPropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { GiSadCrab } from 'react-icons/gi';

export default function Custom500() {
    const { t } = useTranslation('common');

    return (
        <div className="flex items-start w-1/2 mx-auto my-20">
            <GiSadCrab size={60} className="-rotate-12" />
            <div className="flex flex-col items-start ml-6">
                <div className="text-xl text-slate-900">{t('generic_error')}</div>
                <Link
                    href="/"
                    className="inline-block px-6 py-2 my-4 bg-ve-collab-orange rounded-lg text-white"
                >
                    {t('back_to_start')}
                </Link>
            </div>
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
