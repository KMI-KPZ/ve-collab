import { Notification } from '@/interfaces/socketio';
import Timestamp from '@/components/common/Timestamp';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function ContentDeletedDueToReportNotification({
    notification,
    acknowledgeNotificationCallback,
    removeNotificationCallback,
}: Props) {
    const { t } = useTranslation('common');

    return (
        <>
            <li className="flex mx-2 py-4 items-center rounded-xl hover:bg-slate-200">
                <div
                    className="px-2 cursor-pointer"
                    onClick={(e) => {
                        acknowledgeNotificationCallback(notification._id);
                        removeNotificationCallback(notification._id);
                    }}
                >
                    <p className="mb-1 underline decoration-ve-collab-blue">
                        {t('notifications.content_deleted_due_to_report.title')}
                    </p>
                    <p>{t('notifications.content_deleted_due_to_report.text1')}</p>
                    <Timestamp
                        className="text-sm text-gray-500"
                        timestamp={notification.creation_timestamp}
                    />
                </div>
            </li>
        </>
    );
}
