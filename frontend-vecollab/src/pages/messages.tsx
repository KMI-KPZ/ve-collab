import { useState } from 'react';

export default function Messages() {
    const [selectedChat, setSelectedChat] = useState<string>('');

    const handleChatSelect = (chat: string) => {
        setSelectedChat(chat);
    };

    return (
        <div className="flex">
            {/* Sidebar */}
            <div className="w-1/5 bg-gray-200 h-[80vh] rounded-xl">
                <ul className="flex flex-col bg-gray-200 overflow-y-auto">
                    <li
                        className="bg-gray-200 rounded-md p-2 text-center cursor-pointer hover:bg-gray-300"
                        onClick={() => handleChatSelect('Chat 1')}
                    >
                        Chat 1
                    </li>
                    <li
                        className="bg-gray-200 rounded-md p-2 text-center cursor-pointer hover:bg-gray-300"
                        onClick={() => handleChatSelect('Chat 2')}
                    >
                        Chat 2
                    </li>
                    <li
                        className="bg-gray-200 rounded-md p-2 text-center cursor-pointer hover:bg-gray-300"
                        onClick={() => handleChatSelect('Chat 3')}
                    >
                        Chat 3
                    </li>
                </ul>
            </div>
            {/* Main window */}
            <div className="w-4/5 bg-white overflow-y-auto">
                {selectedChat ? (
                    <div>
                        <h1>{selectedChat}</h1>
                        {/* Chat messages */}
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
