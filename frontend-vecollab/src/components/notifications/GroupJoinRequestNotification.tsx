import { RxDotsVertical } from 'react-icons/rx';
import { Notification } from '@/interfaces/socketio';
import { useEffect, useState } from 'react';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import Dialog from '../profile/Dialog';
import Link from 'next/link';
import Timestamp from '@/components/common/Timestamp';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function GroupJoinRequestNotification({
    notification,
    acknowledgeNotificationCallback,
    removeNotificationCallback,
}: Props) {
    const { data: session } = useSession();

    const [requestedUser, setRequestedUser] = useState<UserSnippet>();

    const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);

    const handleOpenNotificationsDialog = () => {
        setIsNotificationsDialogOpen(true);
    };

    const handleCloseNotificationsDialog = () => {
        setIsNotificationsDialogOpen(false);
    };

    const replyRequest = (accept: boolean) => {
        if (accept) {
            fetchPOST(
                `/spaceadministration/accept_request?id=${notification.payload.space_id}&user=${notification.payload.join_request_sender}`,
                {},
                session?.accessToken
            );
        } else {
            fetchPOST(
                `/spaceadministration/reject_request?id=${notification.payload.space_id}&user=${notification.payload.join_request_sender}`,
                {},
                session?.accessToken
            );
        }
    };

    useEffect(() => {
        fetchPOST(
            '/profile_snippets',
            { usernames: [notification.payload.join_request_sender] },
            session?.accessToken
        ).then((data) => {
            setRequestedUser({
                profilePicUrl: data.user_snippets[0].profile_pic,
                name: data.user_snippets[0].first_name + ' ' + data.user_snippets[0].last_name,
                preferredUsername: data.user_snippets[0].username,
                institution: data.user_snippets[0].institution,
            });
        });
    }, [notification, session]);

    return (
        <>
            <li className="flex py-4 items-center rounded-md hover:bg-slate-50">
                <div
                    className="px-2 cursor-pointer"
                    onClick={(e) => {
                        acknowledgeNotificationCallback(notification._id);
                        handleOpenNotificationsDialog();
                    }}
                >
                    <p className="mb-1 underline decoration-ve-collab-blue">Gruppen-Einladung</p>
                    <p>
                        <b>{requestedUser?.name}</b> möchte deiner Gruppe{' '}
                        <b>{notification.payload.space_name}</b> beitreten.
                    </p>
                    <Timestamp
                        className="text-sm text-gray-500"
                        timestamp={notification.creation_timestamp}
                    />
                </div>
                {/* <div className="flex ml-auto px-2 items-center justify-center">
                    <button
                        onClick={(e) => {
                        }}
                    >
                        <RxDotsVertical size={25} />
                    </button>
                </div> */}
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
                            <Link href={`/profile/user/${requestedUser?.preferredUsername}`}>
                                <b>{requestedUser?.name}</b>
                            </Link>{' '}
                            möchte deiner Gruppe{' '}
                            <Link href={`/group/${notification.payload.space_id}`}>
                                <b>{notification.payload.space_name}</b>
                            </Link>{' '}
                            beitreten.
                        </p>
                        <p className="my-4">
                            Du kannst die Anfrage sofort beantworten, oder später in den
                            Einstellungen der{' '}
                            <Link href={`/group/${notification.payload.space_id}`}>
                                {/* TODO direct link to correct tab in space settings*/}
                                <b>Gruppe</b>
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
                                replyRequest(false);
                                handleCloseNotificationsDialog();
                            }}
                        >
                            <span>Ablehnen</span>
                        </button>
                        <button
                            className={
                                'bg-ve-collab-orange border border-gray-200 text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                removeNotificationCallback(notification._id);
                                replyRequest(true);
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
