import { useTranslation } from 'next-i18next';
import H2 from '../common/H2';
import Link from 'next/link';
import { MdEdit } from 'react-icons/md';
import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';

interface Props {
    groups: BackendGroup[];
    isOwnProfile: boolean;
}

export default function GroupsWidget({ groups, isOwnProfile }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="mt-4 pt-4 border-t group/groups">
            <div className="flex">
                <H2 className="inline">{t('groups')}</H2>
                {isOwnProfile && (
                    <span className="italic text-slate-600 text-xs ml-auto invisible group-hover/groups:visible">
                        <Link href={'/groups'}>
                            <MdEdit className="inline" /> {t('search_create')}
                        </Link>
                    </span>
                )}
            </div>
            <ul className="gap-4 font-bold text-lg">
                {groups.map((group) => (
                    <li key={group._id} className="max-w-1/2">
                        <Link
                            href={`/group/${group._id}`}
                            className="flex items-center hover:text-ve-collab-orange"
                        >
                            <AuthenticatedImage
                                imageId={group.space_pic}
                                alt={t('group_picture')}
                                width={50}
                                height={50}
                                className="rounded-full mx-2 my-1"
                            ></AuthenticatedImage>
                            <span className="truncate text-nowrap">{group.name}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
