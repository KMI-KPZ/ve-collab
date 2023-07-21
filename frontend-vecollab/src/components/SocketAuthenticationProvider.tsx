import { SocketIOServerResponse } from '@/interfaces/socketio';
import { socket } from '@/lib/socket';
import { useSession } from 'next-auth/react';
import React, { useEffect } from 'react';

interface Props {
    children: React.ReactNode;
}

// wrapper component that automatically emits an authenticate event
// once a user session is established (i.e. a user logs in).
// by doing that, other components don't have to bother about the socket
// authentication and can assure it is handled
export default function SocketAuthenticationProvider({ children }: Props) {
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status !== 'loading') {
            if (session) {
                socket.emit(
                    'authenticate',
                    { token: session.accessToken },
                    (ack: SocketIOServerResponse) => {
                        if (ack.status !== 200) {
                            // TODO error handling
                            console.error(ack);
                        }
                    }
                );
            }
        }
    }, [status, session]);
    return <>{children}</>;
}
