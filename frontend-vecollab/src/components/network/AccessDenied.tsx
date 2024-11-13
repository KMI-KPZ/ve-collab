import { useTranslation } from 'next-i18next';
import Link from 'next/link';

export const AccessDenied = (): JSX.Element => {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="flex justify-center items-center pt-20 pb-20">
            <div className="flex flex-col w-1/2 justify-center items-center rounded-lg shadow-md bg-white p-10">
                <p className="font-bold text-3xl pt-5 pb-3">{t('common:access_denied')}</p>
                <p className="pb-10">{t('no_group_member')}</p>
                <Link href="/groups">
                    <button
                        type="button"
                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                    >
                        {t('back_to_groups_overview')}
                    </button>
                </Link>
            </div>
        </div>
    );
};
