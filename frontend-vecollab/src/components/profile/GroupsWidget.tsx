import { useTranslation } from 'next-i18next';
import H2 from '../common/H2';
import Link from 'next/link';
import { MdArrowRight, MdEdit } from 'react-icons/md';
import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';
import ButtonLight from '../common/buttons/ButtongLight';

interface Props {
    groups: BackendGroup[];
    isOwnProfile: boolean;
}

export default function GroupsWidget({ groups, isOwnProfile }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="my-4 pt-4 border-t border-t-gray-200 group/groups">
            <div className="flex">
                <H2 className="inline">
                    {isOwnProfile ? t('common:groups') : t('common:public_groups_of')}
                </H2>
                {isOwnProfile && (
                    <span className="italic text-slate-600 text-xs ml-auto invisible group-hover/groups:visible">
                        <Link href={'/groups'}>
                            <MdEdit className="inline" /> {t('search_create')}
                        </Link>
                    </span>
                )}
            </div>
            <ul className="space-y-2 font-bold text-lg">
                {groups.slice(0, 7).map((group) => (
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
                {groups.length > 7 && (
                    <div className="text-end my-6">
                        <ButtonLight link="/groups" className="ml-auto font-normal">
                            {t('common:all')} <MdArrowRight size={24} className="inline mx-1" />
                        </ButtonLight>
                    </div>
                )}
            </ul>
        </div>
    );
}
