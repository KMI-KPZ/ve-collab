import { RxDotsVertical } from 'react-icons/rx';
import SmallTimestamp from '../SmallTimestamp';
import { Socket } from 'socket.io-client';
import { VeInvitation } from '@/interfaces/socketio';
import { useEffect, useState } from 'react';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import Dialog from '../profile/Dialog';
import Link from 'next/link';

interface Props {
    socket: Socket;
    notification: VeInvitation;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function VeInvitationNotification({
    socket,
    notification,
    removeNotificationCallback,
}: Props) {
    const { data: session } = useSession();

    const [invitedFromUser, setInvitedFromUser] = useState<UserSnippet>();
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

    const replyInvitation = (accept: boolean) => {
        fetchPOST(
            '/ve_invitation/reply',
            { invitation_id: notification.invitation_id, accepted: accept, username: notification.from },
            session?.accessToken
        );
    };

    useEffect(() => {
        fetchPOST(
            '/profile_snippets',
            { usernames: [notification.from] },
            session?.accessToken
        ).then((data) => {
            setInvitedFromUser({
                profilePicUrl: data.user_snippets[0].profile_pic,
                name: data.user_snippets[0].first_name + ' ' + data.user_snippets[0].last_name,
                preferredUsername: data.user_snippets[0].username,
                institution: data.user_snippets[0].institution,
            });
        });
        if (notification.plan_id !== null) {
            fetchGET(`/planner/get?_id=${notification.plan_id}`, session?.accessToken).then(
                (data) => {
                    setInvitedVePlan(data.plan);
                }
            );
        }
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
                        Du wurdest von <b>{invitedFromUser?.name}</b> zu einem VE eingeladen:{' '}
                        <b>{invitedVePlan?.name}</b>
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
                title={'neue VE-Einladung'}
                onClose={() => {
                    removeNotificationCallback(notification._id);
                    handleCloseNotificationsDialog();
                }}
            >
                <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                    <div>
                        <p>
                            <Link href={'/profile?username=test_admin'}>
                                <b>{invitedFromUser?.name}</b>
                            </Link>{' '}
                            hat dich eingeladen:
                        </p>
                    </div>
                    <div className="my-4 p-2 border-2 rounded-xl max-h-[15rem] overflow-y-auto">
                        <p className="text-slate-700">{notification.message}</p>
                    </div>
                    {invitedVePlan !== undefined && (
                        <div>
                            <p>
                                <Link href={'/profile?username=test_admin'}>
                                    <b>{invitedFromUser?.name}</b>
                                </Link>{' '}
                                hat bereits vorgearbeitet, sieh dir den zugehörigen Plan an:
                            </p>
                            <div className="flex my-4 justify-center text-slate-900 text-xl font-bold">
                                {/* todo this should link to a read-only view of the plan*/}
                                <Link
                                    target="_blank"
                                    href={`/startingWizard/generalInformation/projectName?plannerId=${notification.plan_id}`}
                                >
                                    {invitedVePlan?.name}
                                </Link>
                            </div>
                        </div>
                    )}
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
