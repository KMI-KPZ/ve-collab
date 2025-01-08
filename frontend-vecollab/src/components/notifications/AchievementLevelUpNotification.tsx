import { Notification } from '@/interfaces/socketio';
import Timestamp from '@/components/common/Timestamp';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function AchievementLevelUpNotification({
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
                        router.push('/profile/edit');
                    }}
                >
                    <p className="mb-1 underline decoration-ve-collab-blue">
                        {t('notifications.achievement_level_up.title')}
                    </p>
                    <p>
                        {t('notifications.achievement_level_up.text1')}
                        <b>
                            {notification.payload.achievement_type === 'social'
                                ? t('notifications.achievement_level_up.social')
                                : t('notifications.achievement_level_up.ve')}
                        </b>
                        {t('notifications.achievement_level_up.text2')}
                    </p>
                    <p>
                        {t('notifications.achievement_level_up.text3')}
                        <b>
                            {t('notifications.achievement_level_up.level_x', {
                                level: notification.payload.level,
                            })}
                        </b>
                        !
                    </p>
                    <Timestamp
                        className="text-sm text-gray-500"
                        timestamp={notification.creation_timestamp}
                    />
                </div>
            </li>
        </>
    );
}
