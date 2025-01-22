// function Error({ statusCode }) {
//     return (
//         <p>
//             {statusCode
//                 ? `An error ${statusCode} occurred on server`
//                 : 'An error occurred on client'}
//         </p>
//     );
// }

// Error.getInitialProps = ({ res, err }) => {
//     const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
//     return { statusCode };
// };

// export default Error;

import { GetStaticPropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { GiSadCrab } from 'react-icons/gi';
import CustomHead from '@/components/metaData/CustomHead';

export default function Error() {
    const { t } = useTranslation('common');

    return (
        <>
            <CustomHead pageTitle={'404'} pageSlug={'404'} />
            <div className="flex items-start w-1/2 mx-auto my-20">
                <GiSadCrab size={60} className="-rotate-12" />
                <div className="flex flex-col items-start ml-6">
                    <div className="text-xl text-slate-900">{t('page_not_found')}</div>
                    <Link
                        href="/"
                        className="inline-block px-6 py-2 my-4 bg-ve-collab-orange rounded-lg text-white"
                    >
                        {t('back_to_start')}
                    </Link>
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
