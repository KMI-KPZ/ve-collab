import { useState } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
    roomID: string;
    socket: Socket;
}

export default function InputArea({ roomID, socket }: Props) {
    const [sendingMessage, setSendingMessage] = useState<string>('');

    const handleMessageSend = () => {
        console.log(`Sending message "${sendingMessage}" to ${roomID}`);
        socket.emit('message', {
            message: sendingMessage,
            room_id: roomID,
        });
        setSendingMessage('');
    };

    return (
        <div className="flex">
            <div className="w-1/5 bg-gray-200"></div>
            <div className="w-4/5 flex items-center p-4 justify-center">
                <textarea
                    className="w-4/5 h-16 p-2 rounded-md resize-none"
                    placeholder="Type your message here..."
                    value={sendingMessage}
                    onChange={(e) => setSendingMessage(e.target.value)}
                />
                <button
                    className="bg-ve-collab-orange hover:bg-ve-collab-orange/70 text-white font-bold py-2 px-4 rounded-md ml-2"
                    onClick={handleMessageSend}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
