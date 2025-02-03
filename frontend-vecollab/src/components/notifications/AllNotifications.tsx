import { useGetNotifications } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import VeInvitationNotification from './VeInvitationNotification';
import { Socket } from 'socket.io-client';
import VeInvitationReplyNotification from './VeInvitationReplyNotification';
import GroupInvitationNotification from './GroupInvitationNotification';
import GroupJoinRequestNotification from './GroupJoinRequestNotification';
import ReminderNotification from './ReminderNotification';
import AchievementLevelUpNotification from './AchievementLevelUpNotification';
import PlanAccessGrantedNotification from './PlanAccessGrantedNotification';
import PlanAddedAsPartnerNotification from './PlanAddedAsPartnerNotification';

interface Props {
    socket: Socket;
}

AllNotifications.auth = true;
export default function AllNotifications({ socket }: Props) {
    const { data: session, status } = useSession();

    const {
        data: notifications,
        isLoading,
        error,
        mutate,
    } = useGetNotifications(session!.accessToken);

    // TODO probably dont need socket and also not the remove callback here, refactor component structure
    // or create a new one

    // TODO for increased performance: profile snippets should be retrieved from api here in bulk instead
    // of each time in the notification component, saves many api calls in case notifications contain
    // the same persons
    return (
        <>
            {notifications !== undefined && (
                <>
                    {notifications.map((notification, index) => (
                        <div key={index}>
                            {notification.type === 've_invitation' && (
                                <VeInvitationNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {notification.type === 've_invitation_reply' && (
                                <VeInvitationReplyNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {notification.type === 'space_invitation' && (
                                <GroupInvitationNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {notification.type === 'space_join_request' && (
                                <GroupJoinRequestNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {notification.type === 'achievement_level_up' && (
                                <AchievementLevelUpNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {[
                                'reminder_evaluation',
                                'reminder_good_practise_examples',
                                'reminder_icebreaker',
                            ].includes(notification.type) && (
                                <ReminderNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {notification.type === 'plan_access_granted' && (
                                <PlanAccessGrantedNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {notification.type === 'plan_added_as_partner' && (
                                <PlanAddedAsPartnerNotification
                                    notification={notification}
                                    acknowledgeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                        </div>
                    ))}
                </>
            )}
        </>
    );
}
