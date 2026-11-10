import { BackendChatMessage } from '@/interfaces/api/apiInterfaces';
import { useSearchChatMessages } from '@/lib/backend';
import { format, parseISO } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { Fragment, useEffect, useState } from 'react';
import { MdSearch } from 'react-icons/md';
import LoadingAnimation from '../common/LoadingAnimation';
import ChatSidePanel from './ChatSidePanel';
import { useDateLocale } from './chatUtils';

interface Props {
    roomId: string;
    senderName: (username: string) => string;
    onJump: (messageId: string) => void;
    onClose: () => void;
}

/**
 * the text of a search result: the message and the names of its files
 */
const resultText = (message: BackendChatMessage) =>
    [message.message, ...message.files.map((file) => `${file.file_name}`)]
        .filter(Boolean)
        .join(' · ');

/**
 * the text with all (case-insensitive) occurrences of the query marked
 */
function Highlighted({ text, query }: { text: string; query: string }) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="rounded-sm bg-ve-collab-orange-light/70">
                        {part}
                    </mark>
                ) : (
                    <Fragment key={i}>{part}</Fragment>
                )
            )}
        </>
    );
}

export default function ChatSearch({ roomId, senderName, onJump, onClose }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const locale = useDateLocale();

    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setQuery(input.trim()), 300);
        return () => clearTimeout(timer);
    }, [input]);

    const { data: results, isLoading } = useSearchChatMessages(session!.accessToken, roomId, query);

    const renderResults = () => {
        if (query === '') {
            return <p className="px-1 text-sm text-gray-500">{t('chat_search_hint')}</p>;
        }
        if (isLoading && results.length === 0) {
            return <LoadingAnimation size="small" />;
        }
        if (results.length === 0) {
            return <p className="px-1 text-sm text-gray-500">{t('chat_search_no_results')}</p>;
        }
        return (
            <ul className="space-y-1">
                {results.map((message) => (
                    <li key={message._id}>
                        <button
                            type="button"
                            onClick={() => onJump(message._id)}
                            className="w-full rounded-md px-2 py-1.5 text-left hover:bg-gray-100 cursor-pointer"
                            title={t('chat_jump_to_message')}
                        >
                            <div className="flex justify-between gap-2 text-xs text-gray-500">
                                <span className="truncate font-semibold">
                                    {senderName(message.sender)}
                                </span>
                                <span className="shrink-0">
                                    {format(parseISO(message.creation_date), 'Pp', { locale })}
                                </span>
                            </div>
                            <div className="line-clamp-2 text-sm break-words">
                                <Highlighted text={resultText(message)} query={query} />
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <ChatSidePanel title={t('chat_search')} onClose={onClose}>
            <div className="relative mb-3">
                <MdSearch
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                />
                <input
                    type="text"
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('chat_search_placeholder')}
                    className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:border-ve-collab-blue"
                />
            </div>
            {renderResults()}
        </ChatSidePanel>
    );
}
