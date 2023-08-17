import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RxDotsVertical } from 'react-icons/rx';
import { Socket } from 'socket.io-client';
import SmallTimestamp from '../SmallTimestamp';
import Dialog from '../profile/Dialog';
import { fetchPOST, fetchGET } from '@/lib/backend';
import { Notification } from '@/interfaces/socketio';

interface Props {
    socket: Socket;
    notification: Notification;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function VeInvitationReplyNotification({
    socket,
    notification,
    removeNotificationCallback,
}: Props) {
    const { data: session } = useSession();

    const [invitedUser, setInvitedUser] = useState<UserSnippet>();
    const [invitedVePlan, setInvitedVePlan] = useState<PlanPreview>();

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

    useEffect(() => {
        fetchPOST(
            '/profile_snippets',
            { usernames: [notification.payload.from] },
            session?.accessToken
        ).then((data) => {
            setInvitedUser({
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
                        <b>{invitedUser?.name}</b> hat deine VE-Einladung{' '}
                        <b>{notification.payload.accepted === true ? 'akzeptiert' : 'abgelehnt'}</b>
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
                title={'deine VE-Einladung'}
                onClose={() => {
                    removeNotificationCallback(notification._id);
                    handleCloseNotificationsDialog();
                }}
            >
                <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                    {notification.payload.accepted === true ? (
                        <>
                            <div className="text-xl font-bold mb-4">Gute Neuigkeiten</div>
                            <div className="my-2 h-4/5">
                                <Link
                                    href={`/profile?username=${invitedUser?.preferredUsername}`}
                                    className="font-bold my-2"
                                >
                                    {invitedUser?.name}
                                </Link>{' '}
                                hat deine Anfrage angenommen!
                                <div className="my-2">
                                    Ihr könnt jetzt gemeinsam euren VE planen!
                                </div>
                                <div className="my-2">
                                    Nutzt das Etherpad, um euch Notizen zu machen, und sprecht
                                    gemeinsam über euren Plan in einer Jitsi-Videokonferenz. Die
                                    entsprechenden Features findet ihr direkt im
                                    Planungsassistenten!
                                </div>
                                <div className="my-8">
                                    <span className="font-bold">Tipp:</span> Falls{' '}
                                    {invitedUser?.name} auch Änderungen an der Planung machen können
                                    soll, vergib direkt hier noch Schreibrechte:
                                    <div className="flex justify-center my-4">
                                        <button
                                            className={
                                                'bg-transparent border border-gray-500 py-3 px-6 rounded-lg shadow-lg'
                                            }
                                            onClick={(e) => {
                                                e.preventDefault();
                                                console.log('TODO');
                                                // TODO need plan _id to set these rights, add to notification payload
                                                // TODO success popup
                                            }}
                                        >
                                            <span>
                                                Schreibrechte für {invitedUser?.name} setzen
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>Schade, beim nächsten mal klappt es bestimmt!</div>
                        </>
                    )}
                    <div className="flex absolute bottom-0 w-full justify-center">
                        <button
                            className={
                                'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                removeNotificationCallback(notification._id);
                                handleCloseNotificationsDialog();
                            }}
                        >
                            <span>Verstanden</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </>
    );
}
