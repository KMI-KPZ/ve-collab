import { BackendPostAuthor } from '@/interfaces/api/apiInterfaces';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState } from 'react';
import { MdThumbUp } from 'react-icons/md';
import AuthenticatedImage from '../common/AuthenticatedImage';

interface Props {
    likers: string[];
    showIcon?: boolean; // false if the like button right before already shows one
    iconSize?: number;
    className?: string;
}

export default function Likes({ likers, showIcon = true, iconSize = 20, className = '' }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [profiles, setProfiles] = useState<BackendPostAuthor[]>([]);
    const [loadedFor, setLoadedFor] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    // the profiles are fetched again once somebody (un)liked in the meantime
    const likersKey = likers.join(',');

    const fetchProfiles = () => {
        if (loading || loadedFor === likersKey) return;

        setLoading(true);
        fetchPOST('/profile_snippets', { usernames: likers }, session?.accessToken)
            .then((data) => {
                setProfiles(data.user_snippets ?? []);
                setLoadedFor(likersKey);
            })
            .finally(() => setLoading(false));
    };

    if (!likers.length) return null;

    return (
        <div
            className={`group/likes relative flex items-center text-sm cursor-pointer ${className}`}
            onMouseEnter={fetchProfiles}
        >
            {showIcon && <MdThumbUp size={iconSize} className="mr-1" />}
            {likers.length}
            {/* the padding instead of a margin keeps the list hovered on the way down */}
            <div className="invisible absolute left-1/2 top-full z-10 -translate-x-1/2 pt-1 opacity-0 transition-opacity group-hover/likes:visible group-hover/likes:opacity-100">
                <div className="w-40 max-h-32 overflow-y-auto p-2 rounded-md bg-white shadow-sm border border-gray-200">
                    {profiles.map((liker) => (
                        <Link
                            key={liker.username}
                            href={`/profile/user/${liker.username}`}
                            className="block truncate"
                        >
                            <AuthenticatedImage
                                imageId={liker.profile_pic}
                                alt={t('profile_picture')}
                                width={20}
                                height={20}
                                className="rounded-full mr-3 inline"
                            />
                            {liker.first_name ? (
                                <>
                                    {liker.first_name} {liker.last_name}
                                </>
                            ) : (
                                <>{liker.username}</>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
