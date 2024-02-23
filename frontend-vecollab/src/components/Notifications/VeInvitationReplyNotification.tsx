import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RxDotsVertical } from 'react-icons/rx';
import SmallTimestamp from '../SmallTimestamp';
import Dialog from '../profile/Dialog';
import { fetchPOST } from '@/lib/backend';
import { Notification } from '@/interfaces/socketio';
import SuccessAlert from '../SuccessAlert';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function VeInvitationReplyNotification({
    notification,
    acknowledgeNotificationCallback,
    removeNotificationCallback,
}: Props) {
    const { data: session } = useSession();

    const [invitedUser, setInvitedUser] = useState<UserSnippet>();

    const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);

    const handleOpenNotificationsDialog = () => {
        setIsNotificationsDialogOpen(true);
    };

    const handleCloseNotificationsDialog = () => {
        setIsNotificationsDialogOpen(false);
    };

    const grantWritePermission = () => {
        const payload = {
            plan_id: notification.payload.plan_id,
            username: notification.payload.from,
            read: true,
            write: true,
        };
        fetchPOST('/planner/grant_access', payload, session?.accessToken).then((response) => {
            if (response.success === true) {
                // render success message that disappears after 2 seconds
                setSuccessPopupOpen(true);
                setTimeout(() => {
                    setSuccessPopupOpen((successPopupOpen) => false);
                }, 2000);
            }
        });
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

    console.log(notification);

    return (
        <>
            <li className="flex mx-2 py-4 items-center rounded-xl hover:bg-slate-200">
                <div
                    className="px-2 cursor-pointer"
                    onClick={(e) => {
                        acknowledgeNotificationCallback(notification._id);
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
                title={notification.payload.accepted === true ? 'Gute Neuigkeiten' : 'Schade!'}
                onClose={() => {
                    removeNotificationCallback(notification._id);
                    handleCloseNotificationsDialog();
                }}
            >
                <div className="w-[30rem] h-[30rem] relative">
                    {notification.payload.accepted === true ? (
                        <div className="w-full h-[26rem] overflow-y-auto content-scrollbar relative">
                            <div className="my-2 h-4/5">
                                <Link
                                    href={`/profile?username=${invitedUser?.preferredUsername}`}
                                    className="font-bold my-2"
                                >
                                    {invitedUser?.name}
                                </Link>{' '}
                                hat deine folgende Anfrage angenommen:
                                <div className="my-4 p-2 border-2 rounded-xl max-h-[15rem] overflow-y-auto">
                                    <p className="text-slate-700">{notification.payload.message}</p>
                                </div>
                                <div className="my-2">
                                    Ihr könnt jetzt gemeinsam euren VE planen!
                                </div>
                                <div className="my-2">
                                    Nutzt das Etherpad, um euch Notizen zu machen, und sprecht
                                    gemeinsam über euren Plan in einer Jitsi-Videokonferenz. Die
                                    entsprechenden Features findet ihr direkt im
                                    Planungsassistenten!
                                </div>
                                {notification.payload.plan_id !== null && (
                                    <div className="my-8">
                                        <span className="font-bold">Tipp:</span> Du hast bereits
                                        eine Planung begonnen und der Einladung hinzugefügt gehabt,
                                        falls {invitedUser?.name} auch Änderungen an der Planung
                                        machen können soll, vergib direkt hier noch Schreibrechte:
                                        <div className="flex justify-center my-4">
                                            <button
                                                className={
                                                    'bg-transparent border border-gray-500 py-3 px-6 rounded-lg shadow-lg'
                                                }
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    grantWritePermission();
                                                }}
                                            >
                                                <span>
                                                    Schreibrechte für {invitedUser?.name} setzen
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <p>
                                Leider hat{' '}
                                <Link
                                    href={`/profile?username=${invitedUser?.preferredUsername}`}
                                    className="font-bold my-2"
                                >
                                    {invitedUser?.name}
                                </Link>{' '}
                                hat deine folgende Anfrage abgelehnt:
                            </p>
                            <div className="my-4 p-2 border-2 rounded-xl max-h-[15rem] overflow-y-auto">
                                <p className="text-slate-700">{notification.payload.message}</p>
                            </div>
                            <p>Beim nächsten Mal klappt es bestimmt!</p>
                            <div className="my-8">
                                <p>
                                    <span className="font-bold">Tipp:</span> Versuche Personen für
                                    deinen VE zu finden, deren Lehre und Forschung thematisch zu dir
                                    passt.
                                </p>
                            </div>
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
            {successPopupOpen && <SuccessAlert message={'Schreibrechte gesetzt'} />}
        </>
    );
}
