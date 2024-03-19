import { useState } from 'react';
import { Socket } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { RxCross2, RxFace } from 'react-icons/rx';
import { IoIosSend } from 'react-icons/io';

interface Props {
    roomID: string;
    socket: Socket;
}

export default function InputArea({ roomID, socket }: Props) {
    const [sendingMessage, setSendingMessage] = useState<string>('');
    const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

    const handleMessageSend = () => {
        console.log(`Sending message "${sendingMessage}" to ${roomID}`);
        socket.emit('message', {
            message: sendingMessage,
            room_id: roomID,
        });
        setSendingMessage('');
    };

    return (
        <div className="my-2">
            {/* <div className="w-1/5 bg-gray-200"></div> */}
            <div className="border border-[#cccccc] bg-white rounded-md">

                <textarea
                    className="w-full h-16 p-2 rounded-md resize-none"
                    placeholder="Type your message here..."
                    value={sendingMessage}
                    onChange={(e) => setSendingMessage(e.target.value)}
                />
                {/* <input
                    className={'border border-[#cccccc] rounded-md px-2 py-[6px] w-full'}
                    type="text"
                    placeholder={'message ...'}
                    name='text'
                    autoComplete="off"
                    onChange={(e) => setSendingMessage(e.target.value)}
                    value={sendingMessage}
                /> */}
                {showEmojiPicker && (
                    <div className="absolute right-48 bottom-0">
                        <div className="p-4 relative">
                            <Picker
                                data={data}
                                onEmojiSelect={(emoji: any) => {
                                    setSendingMessage(sendingMessage + emoji.native);
                                    setShowEmojiPicker(false);
                                }}
                                perLine={12}
                                previewPosition="none"
                            />
                            <div className="absolute top-0 right-0">
                                <button
                                    className="bg-gray-300 rounded-lg p-1 flex justify-center items-center"
                                    onClick={(e) => setShowEmojiPicker(false)}
                                >
                                    <RxCross2 />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className='flex justify-end'>
                    <button
                        className="font-bold py-2 px-4 rounded-md ml-2"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                        <RxFace />
                    </button>
                    {/* <button
                        type='submit'
                        className="bg-ve-collab-orange hover:bg-ve-collab-orange/70 text-white font-bold py-2 px-4 rounded-md ml-2"
                        onClick={handleMessageSend}
                    >
                        Send
                    </button> */}
                    <button
                        type='submit'
                        className="py-2 px-4 rounded-md ml-2"
                        onClick={handleMessageSend}
                    >
                        <IoIosSend />
                    </button>
                </div>
            </div>
        </div>
    );
}
