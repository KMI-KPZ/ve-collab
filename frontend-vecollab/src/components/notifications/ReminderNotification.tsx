import { RxDotsVertical } from 'react-icons/rx';
import { Notification } from '@/interfaces/socketio';
import { useEffect, useState } from 'react';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import Dialog from '../profile/Dialog';
import Link from 'next/link';
import Timestamp from '@/components/common/Timestamp';
import { useRouter } from 'next/router';

interface Props {
    notification: Notification;
    acknowledgeNotificationCallback: (notificationId: string) => void;
    removeNotificationCallback: (notificationId: string) => void;
}

export default function ReminderNotification({
    notification,
    acknowledgeNotificationCallback,
    removeNotificationCallback,
}: Props) {
    const router = useRouter();
    const { data: session } = useSession();

    return (
        <>
            <li className="flex mx-2 py-4 items-center rounded-xl hover:bg-slate-200">
                <div
                    className="px-2 cursor-pointer"
                    onClick={(e) => {
                        acknowledgeNotificationCallback(notification._id);
                        router.push(notification.payload.material_link);
                    }}
                >
                    {(() => {
                        switch (notification.type) {
                            case 'reminder_evaluation':
                                return (
                                    <p>
                                        Für viele neigt sich das Semester dem Ende und damit auch
                                        die Zeit, Evaluationen durchzuführen. Schau doch jetzt
                                        nochmal in die <b>Materialien zur Evaluation von VE's</b>!
                                    </p>
                                );
                            case 'reminder_good_practise_examples':
                                return (
                                    <p>
                                        Bist du gerade mitten in der Planung eines VE? Oder steckst
                                        vielleicht gerade noch in der Durchführung? In den{' '}
                                        <b>Selbstlernmaterialien</b> kannst du dir jederzeit neue
                                        Inspiration holen!
                                    </p>
                                );
                            case 'reminder_icebreaker':
                                return (
                                    <p>
                                        Der Einstieg in einen VE ist oft nicht einfach, aber
                                        unheimlich wichtig. Schau doch mal in die <b>Materialien</b>
                                        , dort findest du Informationen zu verschiedenen{' '}
                                        <b>Icebreakern</b>!
                                    </p>
                                );
                            default:
                                return (
                                    <p>
                                        Schau doch mal hier in die <b>Materialien</b>!
                                    </p>
                                );
                        }
                    })()}
                    <Timestamp
                        className="text-sm text-gray-500"
                        timestamp={notification.creation_timestamp}
                    />
                </div>
                {/* <div className="flex ml-auto px-2 items-center justify-center">
                    <button
                        onClick={(e) => {
                            console.log('hi');
                        }}
                    >
                        <RxDotsVertical size={25} />
                    </button>
                </div> */}
            </li>
        </>
    );
}
