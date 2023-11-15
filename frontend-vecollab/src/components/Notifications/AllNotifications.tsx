import { useGetNotifications } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import VeInvitationNotification from './VeInvitationNotification';
import { Socket } from 'socket.io-client';
import VeInvitationReplyNotification from './VeInvitationReplyNotification';

interface Props {
    socket: Socket;
}

AllNotifications.auth = true;
export default function AllNotifications({ socket }: Props) {
    const { data: session, status } = useSession();

    const {data: notifications, isLoading, error, mutate} = useGetNotifications(session!.accessToken)

    console.log(notifications);

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
                                    key={index}
                                    socket={socket}
                                    notification={notification}
                                    removeNotificationCallback={function (
                                        notificationId: string
                                    ): void {}}
                                />
                            )}
                            {notification.type === 've_invitation_reply' && (
                                <VeInvitationReplyNotification
                                    key={index}
                                    socket={socket}
                                    notification={notification}
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
