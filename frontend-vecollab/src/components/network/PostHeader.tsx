import { BackendPostAuthor } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';
import Link from 'next/link';
import Timestamp from '@/components/common/Timestamp';
import { useTranslation } from 'react-i18next';

interface Props {
    author: BackendPostAuthor;
    date: string;
}

export default function PostHeader({ author, date }: Props) {
    const { t } = useTranslation(['community', 'common']);

    const authorName =
        author.first_name != '' ? `${author.first_name} ${author.last_name}` : author.username;

    return (
        <>
            <AuthenticatedImage
                imageId={author.profile_pic}
                alt={t('profile_picture')}
                width={40}
                height={40}
                className="rounded-full mr-3"
            ></AuthenticatedImage>
            <div className="flex flex-col">
                <Link href={`/profile/user/${author.username}`} className="font-bold">
                    {authorName}
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
