import { SocketIOServerResponse } from '@/interfaces/socketio';
import { socket } from '@/lib/socket';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

interface Props {
    children: React.ReactNode;
}

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
