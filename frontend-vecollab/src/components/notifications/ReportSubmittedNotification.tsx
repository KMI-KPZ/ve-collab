import { Notification } from '@/interfaces/socketio';
import Timestamp from '@/components/common/Timestamp';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function ReportSubmittedNotification({
    notification,
    acknowledgeNotificationCallback,
    removeNotificationCallback,
}: Props) {
    const router = useRouter();
    const { t } = useTranslation('common');

    return (
        <>
            <li className="flex mx-2 py-4 items-center rounded-xl hover:bg-slate-200">
                <div
                    className="px-2 cursor-pointer"
                    onClick={(e) => {
                        acknowledgeNotificationCallback(notification._id);
                        removeNotificationCallback(notification._id);
                        router.push('/admin');
                    }}
                >
                    <p className="mb-1 underline decoration-ve-collab-blue">
                        {t('notifications.report_submitted.title')}
                    </p>
                    <p>{t('notifications.report_submitted.text1')}</p>
                    <Timestamp
                        className="text-sm text-gray-500"
                        timestamp={notification.creation_timestamp}
                    />
                </div>
            </li>
        </>
    );
}
