import { BackendPostAuthor } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';
import Link from 'next/link';
import Timestamp from '@/components/common/Timestamp';
import { useTranslation } from 'react-i18next';
import UserProfileImage from './UserProfileImage';
import printUsername from '../common/Username';

interface Props {
    author: BackendPostAuthor;
    date: string;
}

export default function PostHeader({ author, date }: Props) {
    const { t } = useTranslation(['community']);

    if (!author) {
        return <div className="italic">{t('post_was_deleted')}</div>;
    }

    return (
        <>
            <UserProfileImage
                profile_pic={author.profile_pic}
                chosen_achievement={author.chosen_achievement}
            />
            <div className="flex flex-col">
                <Link href={`/profile/user/${author.username}`} className="font-bold">
                    {printUsername(author)}
                </Link>
                {date && (
                    <Timestamp
                        relative={true}
                        timestamp={date}
                        showTitle={true}
                        className="text-xs text-gray-500"
                    />
                )}
            </div>
        </>
    );
}
