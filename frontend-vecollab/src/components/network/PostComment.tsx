import { BackendPostComment } from '@/interfaces/api/apiInterfaces';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { GoAlert } from 'react-icons/go';
import { MdDeleteOutline, MdOutlineThumbUp, MdThumbUp } from 'react-icons/md';
import { TiPin, TiPinOutline } from 'react-icons/ti';
import Dropdown from '../common/Dropdown';
import Likes from './Likes';
import PostHeader from './PostHeader';
import TimelinePostText from './TimelinePostText';

interface Props {
    comment: BackendPostComment;
    // admins of the group (or the platform) may pin and delete any comment
    userIsAdmin: boolean;
    onLike: (comment: BackendPostComment) => void;
    onPin: (comment: BackendPostComment) => void;
    onDelete: (comment: BackendPostComment) => void;
    onReport: (comment: BackendPostComment) => void;
}

export default function PostComment({
    comment,
    userIsAdmin,
    onLike,
    onPin,
    onDelete,
    onReport,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const username = session?.user.preferred_username;
    const isAuthor = comment.author?.username === username;
    const liked = !!username && comment.likers.includes(username);

    // everybody can report a comment, only its author and admins can delete it
    const options = [
        ...(isAuthor || userIsAdmin
            ? [{ value: 'delete', label: t('common:delete'), icon: <MdDeleteOutline /> }]
            : []),
        {
            value: 'report',
            label: t('common:report.report_title'),
            icon: <GoAlert />,
            liClasses: 'text-red-500',
        },
    ];

    return (
        <div className="group/comment">
            <div className="flex items-center">
                <PostHeader author={comment.author} date={comment.creation_date} />
                <div className="ml-auto flex items-center">
                    {/* the likes stay visible, the button alone only on hover */}
                    <div
                        className={`flex items-center transition-opacity group-hover/comment:opacity-100 ${
                            comment.likers.length ? '' : 'opacity-0'
                        }`}
                    >
                        <button
                            className="p-2 rounded-full cursor-pointer hover:bg-ve-collab-blue-light"
                            onClick={() => onLike(comment)}
                            title={liked ? t('unlike') : t('like')}
                        >
                            {liked ? <MdThumbUp /> : <MdOutlineThumbUp />}
                        </button>
                        <Likes likers={comment.likers} showIcon={false} className="mr-1" />
                    </div>
                    <div
                        className={`flex items-center transition-opacity group-hover/comment:opacity-100 ${
                            comment.pinned ? '' : 'opacity-0'
                        }`}
                    >
                        {userIsAdmin || isAuthor ? (
                            <button
                                className="p-2 rounded-full cursor-pointer hover:bg-ve-collab-blue-light"
                                onClick={() => onPin(comment)}
                                title={comment.pinned ? t('unpin_comment') : t('pin_comment')}
                            >
                                {comment.pinned ? <TiPin /> : <TiPinOutline />}
                            </button>
                        ) : (
                            <>{comment.pinned && <TiPin />}</>
                        )}
                        <div className="inline opacity-0 group-hover/comment:opacity-100">
                            <Dropdown
                                options={options}
                                onSelect={(value) => {
                                    if (value === 'delete') onDelete(comment);
                                    if (value === 'report') onReport(comment);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-3 mb-6">
                <TimelinePostText text={comment.text} />
            </div>
        </div>
    );
}
