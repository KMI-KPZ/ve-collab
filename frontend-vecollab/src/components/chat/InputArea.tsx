import { KeyboardEvent, useState } from 'react';
import { Socket } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { RxCross2, RxFace } from 'react-icons/rx';
import { IoIosSend } from 'react-icons/io';
import { useTranslation } from 'next-i18next';

interface Props {
    roomID: string;
    socket: Socket;
}

export default function InputArea({ roomID, socket }: Props) {
    const { t } = useTranslation('common');

    const [sendingMessage, setSendingMessage] = useState<string>('');
    const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

    const handleMessageSend = () => {
        socket.emit('message', {
            message: sendingMessage,
            room_id: roomID,
        });
        setSendingMessage('');
    };

    const sendOnEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.code == 'Enter' && !e.shiftKey) {
            handleMessageSend();
            e.preventDefault();
        }
    };

    return (
        <div className="my-2">
            <div className="border border-[#cccccc] bg-white rounded-md ">
                <textarea
                    className="w-full h-16 p-2 border-b rounded-t-md resize-none"
                    placeholder={t("type_message_placeholder")}
                    value={sendingMessage}
                    onChange={(e) => setSendingMessage(e.target.value)}
                    onKeyDown={(e) => sendOnEnter(e)}
                />
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
                <div className="flex justify-end">
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
                        type="submit"
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
