import { Dispatch, SetStateAction } from 'react';
import { MdClose } from 'react-icons/md';
import { Socket } from 'socket.io-client';
import AllNotifications from '@/components/notifications/AllNotifications';
import GroupInvitationNotification from '@/components/notifications/GroupInvitationNotification';
import GroupJoinRequestNotification from '@/components/notifications/GroupJoinRequestNotification';
import VeInvitationNotification from '@/components/notifications/VeInvitationNotification';
import VeInvitationReplyNotification from '@/components/notifications/VeInvitationReplyNotification';
import Tabs from '@/components/profile/Tabs';
import { Notification } from '@/interfaces/socketio';
import ReminderNotification from './ReminderNotification';
import { useTranslation } from 'next-i18next';
import AchievementLevelUpNotification from './AchievementLevelUpNotification';
import PlanAccessGrantedNotification from './PlanAccessGrantedNotification';

interface Props {
    socket: Socket;
    notificationEvents: Notification[];
    setNotificationEvents: Dispatch<SetStateAction<Notification[]>>;

    toggleNotifWindow: () => void;
    open: boolean;
}

NotificationsWindow.auth = true;
export default function NotificationsWindow({
    socket,
    notificationEvents,
    setNotificationEvents,

    toggleNotifWindow,
    open,
}: Props) {
    const { t } = useTranslation('common');

    const removeNotificationFromList = (notificationId: string) => {
        setNotificationEvents(
            notificationEvents.filter((notification) => notification._id !== notificationId)
        );
    };

    const acknowledgeNotification = (notificationId: string) => {
        socket.emit('acknowledge_notification', { notification_id: notificationId });
    };

    if (!open) {
        return <></>;
    }

    return (
        <div className="absolute z-50 right-0 top-24 w-1/5 min-w-[15rem] min-h-[18rem] px-2 py-4 shadow rounded-l bg-white border">
            <div className="absolute -top-[16px] -left-[16px]">
                <button
                    onClick={(e) => toggleNotifWindow()}
                    className="bg-white rounded-full shadow p-2 hover:bg-slate-50"
                >
                    <MdClose size={20} />
                </button>
            </div>

            <div className="h-[60vh] min-h-[16rem] overflow-y-auto content-scrollbar text-sm">
                <Tabs>
                    <div tabid="new" tabname={t('new')}>
                        <ul className="-mt-4 divide-y">
                            {notificationEvents.map((notification, index) => (
                                <div key={index}>
                                    {notification.type === 've_invitation' && (
                                        <VeInvitationNotification
                                            notification={notification}
                                            acknowledgeNotificationCallback={
                                                acknowledgeNotification
                                            }
                                            removeNotificationCallback={removeNotificationFromList}
                                        />
                                    )}
                                    {notification.type === 've_invitation_reply' && (
                                        <VeInvitationReplyNotification
                                            notification={notification}
                                            acknowledgeNotificationCallback={
                                                acknowledgeNotification
                                            }
                                            removeNotificationCallback={removeNotificationFromList}
                                        />
                                    )}
                                    {notification.type === 'space_invitation' && (
                                        <GroupInvitationNotification
                                            notification={notification}
                                            acknowledgeNotificationCallback={
                                                acknowledgeNotification
                                            }
                                            removeNotificationCallback={removeNotificationFromList}
                                        />
                                    )}
                                    {notification.type === 'space_join_request' && (
                                        <GroupJoinRequestNotification
                                            notification={notification}
                                            acknowledgeNotificationCallback={
                                                acknowledgeNotification
                                            }
                                            removeNotificationCallback={removeNotificationFromList}
                                        />
                                    )}
                                    {notification.type === 'achievement_level_up' && (
                                        <AchievementLevelUpNotification
                                            notification={notification}
                                            acknowledgeNotificationCallback={
                                                acknowledgeNotification
                                            }
                                            removeNotificationCallback={removeNotificationFromList}
                                        />
                                    )}
                                    {[
                                        'reminder_evaluation',
                                        'reminder_good_practise_examples',
                                        'reminder_icebreaker',
                                    ].includes(notification.type) && (
                                        <ReminderNotification
                                            notification={notification}
                                            acknowledgeNotificationCallback={
                                                acknowledgeNotification
                                            }
                                            removeNotificationCallback={removeNotificationFromList}
                                        />
                                    )}
                                    {notification.type === 'plan_access_granted' && (
                                        <PlanAccessGrantedNotification
                                            notification={notification}
                                            acknowledgeNotificationCallback={
                                                acknowledgeNotification
                                            }
                                            removeNotificationCallback={removeNotificationFromList}
                                        />
                                    )}
                                </div>
                            ))}
                        </ul>
                    </div>
                    <div tabid="all" tabname={t('all')}>
                        <div className="-mt-4">
                            <AllNotifications socket={socket} />
                        </div>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
