import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { format, parseISO } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import { MdClose } from 'react-icons/md';
import { useGetMaintenanceBanner } from '@/lib/backend';

const DISMISSED_STORAGE_KEY = 'maintenance_banner_dismissed';

export default function MaintenanceBanner() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const { data: banner } = useGetMaintenanceBanner();
    const [dismissed, setDismissed] = useState(true);

    const serialized = banner.enabled ? JSON.stringify(banner) : '';

    useEffect(() => {
        if (!banner.enabled) {
            setDismissed(true);
            return;
        }
        try {
            setDismissed(localStorage.getItem(DISMISSED_STORAGE_KEY) === serialized);
        } catch (e) {
            setDismissed(false);
        }
    }, [banner.enabled, serialized]);

    if (!banner.enabled || dismissed) {
        return <></>;
    }

    const locale = router.locale === 'de' ? de : enGB;
    const formatDate = (value?: string) =>
        value ? format(parseISO(value), 'd. MMM yyyy', { locale }) : '';

    let message = '';
    if (banner.mode === 'date') {
        message = t('maintenance_banner_date', { date: formatDate(banner.date) });
    } else if (banner.mode === 'timeframe') {
        message = t('maintenance_banner_timeframe', {
            date: formatDate(banner.date),
            start: banner.start_time,
            end: banner.end_time,
        });
    } else if (banner.mode === 'range') {
        message = t('maintenance_banner_range', {
            start: formatDate(banner.start_date),
            end: formatDate(banner.end_date),
        });
    }

    const handleDismiss = () => {
        try {
            localStorage.setItem(DISMISSED_STORAGE_KEY, serialized);
        } catch (e) {}
        setDismissed(true);
    };

    return (
        <div className="w-full flex items-center justify-center gap-2 bg-ve-collab-blue-light text-ve-collab-blue text-sm py-1.5 px-4">
            <span>{message}</span>
            <button
                type="button"
                title={t('close')}
                className="cursor-pointer shrink-0"
                onClick={handleDismiss}
            >
                <MdClose />
            </button>
        </div>
    );
}
