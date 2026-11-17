import { BackendPostComment } from '@/interfaces/api/apiInterfaces';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { FormEvent, useState } from 'react';
import { IoIosSend } from 'react-icons/io';
import RichTextEditor, { isEmptyRichText } from './RichTextEditor';

interface Props {
    postId: string;
    autoFocus?: boolean;
    onCreated: (comment: BackendPostComment) => void;
}

export default function CommentForm({ postId, autoFocus = false, onCreated }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [text, setText] = useState<string>('');
    const [hadFocus, setHadFocus] = useState<boolean>(autoFocus);
    const [sending, setSending] = useState<boolean>(false);

    const isEmpty = isEmptyRichText(text);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isEmpty || sending) return;

        setSending(true);
        const response = await fetchPOST(
            '/comment',
            { text, post_id: postId },
            session?.accessToken
        );
        setSending(false);

        if (response.inserted_comment) {
            onCreated(response.inserted_comment);
            setText('');
        }
    };

    return (
        <form onSubmit={onSubmit} className="mb-4">
            <RichTextEditor
                value={text}
                onChange={setText}
                placeholder={t('write_comment')}
                showToolbar={hadFocus}
                autoFocus={autoFocus}
                onFocus={() => setHadFocus(true)}
                minHeight="4rem"
                actions={
                    hadFocus && (
                        <button
                            type="submit"
                            disabled={isEmpty || sending}
                            className="flex items-center gap-2 py-1.5 px-4 rounded-lg bg-ve-collab-orange text-white cursor-pointer disabled:cursor-default disabled:bg-ve-collab-orange/75"
                        >
                            <IoIosSend /> {t('send')}
                        </button>
                    )
                }
            />
        </form>
    );
}
