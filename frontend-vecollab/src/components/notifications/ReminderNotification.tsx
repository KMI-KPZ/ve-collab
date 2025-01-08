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
                                        die Zeit, Evaluationen durchzuführen - davon sind auch deine
                                        VE-Projekte nicht ausgeschlossen. Wenn du noch Informationen
                                        und Inspiration für die Evaluation suchst, dann schau doch
                                        mal in die <b>Materialien zur Evaluation von VE&apos;s</b>!
                                    </p>
                                );
                            case 'reminder_good_practise_examples':
                                return (
                                    <p>
                                        Hakt die VE-Planung oder suchst du noch nach Ideen für die
                                        methodisch-didaktische Gestaltung deines Projekts? Wirf doch
                                        einen Blick in die Good-Practice-Beispiele auf deinem
                                        <b>VE-Designer-Dashboard</b>, um neue Inspiration zu
                                        schöpfen! Oder schau dir Beispiel-VE&apos;s aus
                                        verschiedenen Fachbereichen in den{' '}
                                        <b>Selbstlernmaterialien</b> an.
                                    </p>
                                );
                            case 'reminder_icebreaker':
                                return (
                                    <p>
                                        Wusstest du, dass der Einstieg in einen VE eine der
                                        wichtigsten Phasen ist, damit der VE gelingt? Frische doch
                                        noch einmal dein Wissen auf, bevor du in die nächste Planung
                                        gehst. Informationen zur VE-Planung und
                                        Icebreaker-Aktivitäten findest du in den{' '}
                                        <b>Selbstlernmaterialien</b>!
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
                        }}
                    >
                        <RxDotsVertical size={25} />
                    </button>
                </div> */}
            </li>
        </>
    );
}
