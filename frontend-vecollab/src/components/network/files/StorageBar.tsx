import { BackendFileShareStorage } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';
import { formatBytes } from './fileUtils';

interface Props {
    storage: BackendFileShareStorage;
}

/**
 * used and available storage of the group's file share
 */
export default function StorageBar({ storage }: Props) {
    const { t } = useTranslation('community');

    const percent = Math.min(
        100,
        Math.round((storage.used_bytes / Math.max(1, storage.max_bytes)) * 100)
    );

    return (
        <div className="text-xs text-gray-500">
            <div className="flex justify-between mb-1">
                <span>{t('fileshare_storage')}</span>
                <span>
                    {formatBytes(storage.used_bytes)} / {formatBytes(storage.max_bytes)}
                </span>
            </div>
            <div className="h-1.5 w-full rounded bg-gray-200">
                <div className="h-1.5 rounded bg-ve-collab-blue" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
