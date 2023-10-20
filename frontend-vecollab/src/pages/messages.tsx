import { useState } from 'react';

export default function Messages() {
    const [selectedChat, setSelectedChat] = useState<string>('');
    const [message, setMessage] = useState<string>('');

    const handleChatSelect = (chat: string) => {
        setSelectedChat(chat);
    };

    const handleMessageSend = () => {
        console.log(`Sending message "${message}" to ${selectedChat}`);
        setMessage('');
    };

    return (
        <div className="flex">
            {/* Sidebar */}
            <div className="w-1/5 bg-gray-200 h-[80vh] rounded-xl">
                <ul className="flex flex-col bg-gray-200 overflow-y-auto">
                    <li
                        className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
                        onClick={() => handleChatSelect('Chat 1')}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <p className="text-lg font-medium">Chat 1</p>
                                <p className="text-sm text-gray-500">
                                    Last message poineg paiowengpagoni poiwengw üp wegüwpegkweg
                                    un9aoas üesfkü
                                </p>
                            </div>
                        </div>
                    </li>
                    <li
                        className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
                        onClick={() => handleChatSelect('Chat 2')}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <p className="text-lg font-medium">Chat 2</p>
                                <p className="text-sm text-gray-500">Last message</p>
                            </div>
                        </div>
                    </li>
                    <li
                        className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
                        onClick={() => handleChatSelect('Chat 3')}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <p className="text-lg font-medium">Chat 3</p>
                                <p className="text-sm text-gray-500">Last message</p>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
            {/* Main window */}
            <div className="w-4/5 bg-white overflow-y-auto relative">
                {selectedChat ? (
                    <div>
                        <h1>{selectedChat}</h1>
                        {/* Chat messages */}
                        <div className="flex flex-col px-36 justify-end">
                            <div className="flex flex-col items-start">
                                <div className="bg-gray-200 rounded-md p-2 m-1 max-w-4xl break-words">
                                    <p>
                                        Message 1
                                        iuasbfioiasuerngopöaseringöosaerngöoaieurbgiaoeurbg
                                        ialerubgla eirugbale irugbaelirugba elirugbaleirugb aleirugb
                                        aleirugbaleirug bgiuabneiörugnaöer
                                        ogneöaorignaöeorignaeöorig naeöorgin aeöroginoö
                                    </p>
                                </div>
                                <div className="bg-gray-200 rounded-md p-2 m-1 max-w-4xl break-words">
                                    <p>Message 2</p>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <div className="bg-ve-collab-blue/50 rounded-md p-2 m-1 max-w-4xl break-words">
                                    <p>
                                        Message 3oiwangöoiwne göoiawn egöoiawneöoginawoöeginawoe
                                        gnaoöwen goöawineg öoawieng öoawieng oöaweign oöaweign
                                        öoaweng oöaweg oönawoegöoaweg owagoöiwaeg nöo
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Input textarea and send button */}
                        <div className="absolute bottom-0 w-full p-4 bg-gray-200">
                            <div className="flex items-center justify-center">
                                <textarea
                                    className="w-4/5 h-16 p-2 rounded-md resize-none"
                                    placeholder="Type your message here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <button
                                    className="bg-ve-collab-orange hover:bg-ve-collab-orange/70 text-white font-bold py-2 px-4 rounded-md ml-2"
                                    onClick={handleMessageSend}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h1>Select a chat to start messaging</h1>
                    </div>
                )}
            </div>
        </div>
    );
}
