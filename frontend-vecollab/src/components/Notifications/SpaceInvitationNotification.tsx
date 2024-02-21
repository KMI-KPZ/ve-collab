import { RxDotsVertical } from 'react-icons/rx';
import SmallTimestamp from '../SmallTimestamp';
import { Socket } from 'socket.io-client';
import { Notification } from '@/interfaces/socketio';
import { useEffect, useState } from 'react';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import Dialog from '../profile/Dialog';
import Link from 'next/link';

interface Props {
    socket: Socket;
    notification: Notification;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function SpaceInvitationNotification({
    socket,
    notification,
    removeNotificationCallback,
}: Props) {
    const { data: session } = useSession();

    const [invitedFromUser, setInvitedFromUser] = useState<UserSnippet>();

    const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);

    const handleOpenNotificationsDialog = () => {
        setIsNotificationsDialogOpen(true);
    };

    const handleCloseNotificationsDialog = () => {
        setIsNotificationsDialogOpen(false);
    };

    const acknowledgeNotification = () => {
        socket.emit('acknowledge_notification', { notification_id: notification._id });
    };

    const replyInvitation = (accept: boolean) => {
        if (accept) {
            fetchPOST(
                `/spaceadministration/accept_invite?id=${notification.payload.space_id}`,
                {},
                session?.accessToken
            );
        } else {
            fetchPOST(
                `/spaceadministration/decline_invite?id=${notification.payload.space_id}`,
                {},
                session?.accessToken
            );
        }
    };

    useEffect(() => {
        fetchPOST(
            '/profile_snippets',
            { usernames: [notification.payload.invitation_sender] },
            session?.accessToken
        ).then((data) => {
            setInvitedFromUser({
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
                        acknowledgeNotification();
                        handleOpenNotificationsDialog();
                    }}
                >
                    <p>
                        Du wurdest von <b>{invitedFromUser?.name}</b> in die Gruppe{' '}
                        <b>{notification.payload.space_name}</b> eingeladen
                    </p>
                    <SmallTimestamp
                        className="text-gray-500"
                        timestamp={notification.creation_timestamp}
                    />
                </div>
                <div className="flex ml-auto px-2 items-center justify-center">
                    <button
                        onClick={(e) => {
                            console.log('hi');
                        }}
                    >
                        <RxDotsVertical size={25} />
                    </button>
                </div>
            </li>
            <Dialog
                isOpen={isNotificationsDialogOpen}
                title={'neue Gruppen-Einladung'}
                onClose={() => {
                    removeNotificationCallback(notification._id);
                    handleCloseNotificationsDialog();
                }}
            >
                <div className="w-[30rem] min-h-[10rem] relative">
                    <div>
                        <p>
                            <Link href={`/profile?username=${invitedFromUser?.preferredUsername}`}>
                                <b>{invitedFromUser?.name}</b>
                            </Link>{' '}
                            hat dich in die Gruppe{' '}
                            <Link href={`/space?id=${notification.payload.space_id}`}>
                                <b>{notification.payload.space_name}</b>
                            </Link>{' '}
                            eingeladen.
                        </p>
                        <p className="my-4">
                            Du kannst die Einladung sofort beantworten, oder später in deinen{' '}
                            <Link href={'/spaces'}>
                                {/* TODO direct link to correct tab in spaces overview*/}
                                <b>gesammelten Anfragen</b>
                            </Link>
                            .
                        </p>
                    </div>
                    <div className="flex absolute bottom-0 w-full">
                        <button
                            className={
                                'bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                            }
                            onClick={(e) => {
                                removeNotificationCallback(notification._id);
                                replyInvitation(false);
                                handleCloseNotificationsDialog();
                            }}
                        >
                            <span>Ablehnen</span>
                        </button>
                        <button
                            className={
                                'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                removeNotificationCallback(notification._id);
                                replyInvitation(true);
                                handleCloseNotificationsDialog();
                            }}
                        >
                            <span>Annehmen</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </>
    );
}
