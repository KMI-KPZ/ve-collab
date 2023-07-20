import { VeInvitation } from '@/interfaces/socketio';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import VeInvitationNotification from './VeInvitationNotification';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
}

export default function AllNotifications({ socket }: Props) {
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<VeInvitation[]>([]);

    useEffect(() => {
        fetchGET('/notifications', session?.accessToken).then((data: { notifications: any[] }) => {
            setNotifications(
                data.notifications.sort((a, b) => {
                    return a.creation_timestamp < b.creation_timestamp ? 1 : -1;
                })
            );
        });
    }, [session]);

    console.log(notifications);

    // TODO probably dont need socket and also not the remove callback here, refactor component structure
    // or create a new one
    return (
        <>
            {notifications !== undefined && (
                <>
                    {notifications.map((notification, index) => (
                        <VeInvitationNotification
                            key={index}
                            socket={socket}
                            notification={notification}
                            removeNotificationCallback={function (notificationId: string): void {}}
                        />
                    ))}
                </>
            )}
        </>
    );
}
