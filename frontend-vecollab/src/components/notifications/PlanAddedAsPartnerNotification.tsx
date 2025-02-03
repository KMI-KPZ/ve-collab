import { Notification } from '@/interfaces/socketio';
import Timestamp from '@/components/common/Timestamp';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { fetchPOST } from '@/lib/backend';
import { useEffect, useState } from 'react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function PlanAddedAsPartnerNotification({
    notification,
    acknowledgeNotificationCallback,
    removeNotificationCallback,
}: Props) {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation('common');

    const [planAuthor, setPlanAuthor] = useState<UserSnippet>();

    useEffect(() => {
        fetchPOST(
            '/profile_snippets',
            { usernames: [notification.payload.author] },
            session?.accessToken
        ).then((data) => {
            setPlanAuthor({
                profilePicUrl: data.user_snippets[0].profile_pic,
                name: data.user_snippets[0].first_name + ' ' + data.user_snippets[0].last_name,
                preferredUsername: data.user_snippets[0].username,
                institution: data.user_snippets[0].institution,
            });
        });
    }, [notification, session]);

    return (
        <>
            <li className="flex mx-2 py-4 items-center rounded-xl hover:bg-slate-200">
                <div
                    className="px-2 cursor-pointer"
                    onClick={(e) => {
                        acknowledgeNotificationCallback(notification._id);
                        removeNotificationCallback(notification._id);
                        router.push('/plans');
                    }}
                >
                    <p className="mb-1 underline decoration-ve-collab-blue">
                        {t('notifications.plan_added_as_partner.title')}
                    </p>
                    <p>
                        <b>
                            {planAuthor !== undefined
                                ? planAuthor.name
                                : notification.payload.author}
                        </b>
                        {t('notifications.plan_added_as_partner.text1')}

                        <b>{notification.payload.plan_name}</b>
                        {t('notifications.plan_added_as_partner.text2')}
                    </p>
                    <p>
                        {t('notifications.plan_added_as_partner.text3')}
                        <Link href={`/plan/${notification.payload.plan_id}`} className="underline">
                            {t('here')}
                        </Link>
                        {t('notifications.plan_added_as_partner.text4')}
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
