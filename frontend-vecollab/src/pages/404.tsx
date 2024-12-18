import { GetStaticPropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GiSadCrab } from 'react-icons/gi';
import CustomHead from '@/components/metaData/CustomHead';
import ButtonPrimary from '@/components/common/buttons/ButtonPrimary';

export default function Custom404() {
    const { t } = useTranslation('common');

    return (
        <>
            <CustomHead pageTitle={'404'} pageSlug={'404'} />
            <div className="flex items-start w-1/2 mx-auto my-20">
                <GiSadCrab size={60} className="-rotate-12" />
                <div className="flex flex-col items-start ml-6">
                    <div className="text-xl text-slate-900 mb-4">{t('page_not_found')}</div>
                    <ButtonPrimary link="/">{t('back_to_start')}</ButtonPrimary>
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
