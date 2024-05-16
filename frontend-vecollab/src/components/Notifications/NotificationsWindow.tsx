import { Dispatch, SetStateAction, useEffect } from 'react';
import { MdKeyboardDoubleArrowRight } from 'react-icons/md';
import { Socket } from 'socket.io-client';
import AllNotifications from '@/components/Notifications/AllNotifications';
import GroupInvitationNotification from '@/components/Notifications/GroupInvitationNotification';
import GroupJoinRequestNotification from '@/components/Notifications/GroupJoinRequestNotification';
import VeInvitationNotification from '@/components/Notifications/VeInvitationNotification';
import VeInvitationReplyNotification from '@/components/Notifications/VeInvitationReplyNotification';
import Tabs from '@/components/profile/Tabs';
import { Notification } from '@/interfaces/socketio';

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
        <div
            className={`absolute z-30 right-0 top-20 w-1/5 min-w-[15rem] min-h-[18rem] px-2 py-4 shadow rounded-l bg-white border`}
        >
            <div
                style={{ clipPath: 'inset(-5px 1px -5px -5px)', borderRight: '0' }}
                className="absolute flex top-1/3 -ml-2 -left-[16px] w-[26px] h-[90px] bg-white rounded-l border shadow"
            >
                <button
                    onClick={(e) => toggleNotifWindow()}
                    className="p-1 h-full w-full hover:bg-slate-100"
                >
                    <MdKeyboardDoubleArrowRight />
                </button>
            </div>

            <div className="h-[60vh] min-h-[16rem] overflow-y-auto content-scrollbar text-sm">
                <Tabs>
                    <div tabname="neu">
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
                                </div>
                            ))}
                        </ul>
                    </div>
                    <div tabname="alle">
                        <div className="-mt-4">
                            <AllNotifications socket={socket} />
                        </div>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
