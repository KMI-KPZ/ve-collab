import { RxDotsVertical } from 'react-icons/rx';
import { Notification } from '@/interfaces/socketio';
import { useEffect, useState } from 'react';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import Dialog from '../profile/Dialog';
import Link from 'next/link';
import Timestamp from '@/components/common/Timestamp';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function VeInvitationNotification({
    notification,
    acknowledgeNotificationCallback,
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

    const replyInvitation = (accept: boolean) => {
        fetchPOST(
            '/ve_invitation/reply',
            { invitation_id: notification.payload.invitation_id, accepted: accept },
            session?.accessToken
        );
    };

    useEffect(() => {
        fetchPOST(
            '/profile_snippets',
            { usernames: [notification.payload.from] },
            session?.accessToken
        ).then((data) => {
            setInvitedFromUser({
                profilePicUrl: data.user_snippets[0].profile_pic,
                name: data.user_snippets[0].first_name + ' ' + data.user_snippets[0].last_name,
                preferredUsername: data.user_snippets[0].username,
                institution: data.user_snippets[0].institution,
            });
        });
        if (notification.payload.plan_id !== null) {
            fetchGET(`/planner/get?_id=${notification.payload.plan_id}`, session?.accessToken).then(
                (data) => {
                    setInvitedVePlan(data.plan);
                }
            );
        }
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
                    <p className="mb-1 underline decoration-ve-collab-blue">VE-Einladung</p>
                    <p>
                        Du wurdest von <b>{invitedFromUser?.name}</b> zu einem VE eingeladen:{' '}
                        <b>{invitedVePlan?.name}</b>
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
                title={'neue VE-Einladung'}
                onClose={() => {
                    removeNotificationCallback(notification._id);
                    handleCloseNotificationsDialog();
                }}
            >
                <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                    <div>
                        <p>
                            <Link href={`/profile/user/${invitedFromUser?.preferredUsername}`}>
                                <b>{invitedFromUser?.name}</b>
                            </Link>{' '}
                            hat dich eingeladen:
                        </p>
                    </div>
                    <div className="my-4 p-2 border-2 border-gray-200 rounded-xl max-h-[15rem] overflow-y-auto">
                        <p className="text-slate-700">{notification.payload.message}</p>
                    </div>
                    {invitedVePlan !== undefined && (
                        <div>
                            <p>
                                <Link href={`/profile/user/${invitedFromUser?.preferredUsername}`}>
                                    <b>{invitedFromUser?.name}</b>
                                </Link>{' '}
                                hat bereits vorgearbeitet, sieh dir den zugehörigen Plan an:
                            </p>
                            <div className="flex my-4 justify-center text-slate-900 text-xl font-bold">
                                {/* todo this should link to a read-only view of the plan*/}
                                <Link
                                    target="_blank"
                                    href={`/ve-designer/name?plannerId=${notification.payload.plan_id}`}
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
                                'bg-ve-collab-orange border border-gray-200 text-white py-3 px-6 rounded-lg shadow-xl'
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
