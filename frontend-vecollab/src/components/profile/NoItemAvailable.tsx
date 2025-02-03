import { useTranslation } from 'next-i18next';

export default function NoItemAvailable() {
    const { t } = useTranslation(['community', 'common']);
    return <span className="italic text-slate-600">{t('no_item_available')}</span>;
}
