import { useTranslation } from 'next-i18next';
import Link from 'next/link';

export default function ExcludedFromMatchingBanner() {
    const { t } = useTranslation('common');

    return (
        <div className="w-full h-12 flex justify-center items-center bg-red-500 text-white">
            <p>
                {t('excluded_from_matching_banner_1')}
                <Link className="underline" href={'/profile/edit'}>
                    {t('here')}
                </Link>
                {t('excluded_from_matching_banner_2')}
            </p>
        </div>
    );
}
