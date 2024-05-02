import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import AllNotifications from '@/components/Notifications/AllNotifications';
import GroupInvitationNotification from '@/components/Notifications/GroupInvitationNotification';
import GroupJoinRequestNotification from '@/components/Notifications/GroupJoinRequestNotification';
import VeInvitationNotification from '@/components/Notifications/VeInvitationNotification';
import VeInvitationReplyNotification from '@/components/Notifications/VeInvitationReplyNotification';
import Tabs from '@/components/profile/Tabs';
import { Notification } from '@/interfaces/socketio';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
    notificationEvents: Notification[];
    setNotificationEvents: Dispatch<SetStateAction<Notification[]>>;
}

Notifications.auth = true;
export default function Notifications({
    socket,
    notificationEvents,
    setNotificationEvents,
}: Props) {
    const removeNotificationFromList = (notificationId: string) => {
        setNotificationEvents(
            notificationEvents.filter((notification) => notification._id !== notificationId)
        );
    };

    const acknowledgeNotification = (notificationId: string) => {
        socket.emit('acknowledge_notification', { notification_id: notificationId });
    };

    useEffect(() => {
        console.log(notificationEvents);
    }, [notificationEvents]);

    return (
        <Container>
            <div className="flex items-center justify-center">
                <WhiteBox>
                    <div className="w-[50rem] min-h-[30rem]">
                        <Tabs>
                            <div tabname="neu">
                                <ul className="divide-y">
                                    {notificationEvents.map((notification, index) => (
                                        <div key={index}>
                                            {notification.type === 've_invitation' && (
                                                <VeInvitationNotification
                                                    notification={notification}
                                                    acknowledgeNotificationCallback={acknowledgeNotification}
                                                    removeNotificationCallback={
                                                        removeNotificationFromList
                                                    }
                                                />
                                            )}
                                            {notification.type === 've_invitation_reply' && (
                                                <VeInvitationReplyNotification
                                                    notification={notification}
                                                    acknowledgeNotificationCallback={acknowledgeNotification}
                                                    removeNotificationCallback={
                                                        removeNotificationFromList
                                                    }
                                                />
                                            )}
                                            {notification.type === 'space_invitation' && (
                                                <GroupInvitationNotification
                                                    notification={notification}
                                                    acknowledgeNotificationCallback={acknowledgeNotification}
                                                    removeNotificationCallback={
                                                        removeNotificationFromList
                                                    }
                                                />
                                            )}
                                            {notification.type === 'space_join_request' && (
                                                <GroupJoinRequestNotification
                                                    notification={notification}
                                                    acknowledgeNotificationCallback={acknowledgeNotification}
                                                    removeNotificationCallback={
                                                        removeNotificationFromList
                                                    }
                                                />
                                            )}
                                        </div>
                                    ))}
                                </ul>
                            </div>
                            <div tabname="alle">
                                <AllNotifications socket={socket} />
                            </div>
                        </Tabs>
                    </div>
                </WhiteBox>
            </div>
        </Container>
    );
}
