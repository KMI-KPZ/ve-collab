interface Props {
    message: any;
    currentUser?: string | null;
}

export default function ChatMessage({ message, currentUser }: Props) {
    return (
        <li>
            {message.sender === currentUser ? (
                <div className="flex justify-end">
                    <div className="bg-ve-collab-blue/50 rounded-md p-2 m-1 max-w-4xl break-words whitespace-pre-wrap">
                        <p>{message.message}</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-start">
                    <div className="bg-gray-200 rounded-md p-2 m-1 max-w-4xl break-words whitespace-pre-wrap">
                        <p>{message.message}</p>
                    </div>
                </div>
            )}
        </li>
    );
}
