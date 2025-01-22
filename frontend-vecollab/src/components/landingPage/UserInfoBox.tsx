import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import H2 from '../common/H2';
import { useSession } from 'next-auth/react';
import React from 'react';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { BackendUser } from '@/interfaces/api/apiInterfaces';
import { MdCheck, MdEdit } from 'react-icons/md';
import { useGetMyGroups } from '@/lib/backend';
import { getBadges, hasAnyAchievement } from './Badge';
import UserProfileImage from '../network/UserProfileImage';

interface Props {
    profileInformation: BackendUser;
}

UserInfoBox.auth = true;
export default function UserInfoBox({ profileInformation }: Props) {
    const { t } = useTranslation(['community', 'common']);
    const { data: session } = useSession();
    const { data: myGroups } = useGetMyGroups(session!.accessToken);

    return (
        <div className="w-full m-6 px-4 pb-6 bg-white rounded-md space-y-4">
            <div className="group @container">
                <div className="-mt-[52px] -ml-[32px] flex relative">
                    <div className="flex-none w-[180px]">
                        <UserProfileImage
                            type="big"
                            chosen_achievement={profileInformation.profile.chosen_achievement}
                            height={180}
                            width={180}
                            profile_pic={profileInformation.profile.profile_pic}
                        />
                    </div>

                    <Link
                        href={'/profile/edit'}
                        className="absolute top-[60px] right-0 invisible group-hover:visible italic text-slate-600 text-xs"
                    >
                        <MdEdit className="inline" /> {t('common:edit')}
                    </Link>
                </div>

                <div
                    className={
                        'relative font-bold text-xl text-slate-900 self-end @[230px]:-mt-[24px] my-2 text-right break-words'
                    }
                >
                    <span className="bg-white rounded-full box-decoration-clone px-2 py-1">
                        {profileInformation.profile.first_name}
                        &nbsp;
                        {profileInformation.profile.last_name}
                    </span>
                </div>

                <div className="mb-2 mt-6">{profileInformation.profile.bio}</div>

                {profileInformation.profile.ve_ready ? (
                    <div className="pl-10">
                        <span className="w-fit -ml-10 bg-green-500 rounded-full shadow shadow-green-500 p-1 mr-2 text-white text-center">
                            <MdCheck className="inline-block mb-1 mx-1" />
                        </span>
                        {t('ve_ready_true')}
                    </div>
                ) : (
                    <div className="text-red-600">
                        <span className="inline-block w-[10px] h-[10px] rounded-full bg-red-600 shadow shadow-red-600 mr-2"></span>
                        {t('ve_ready_false')}
                    </div>
                )}
            </div>

            <div className={'flex divide-x'}>
                <div className="pr-4">
                    <span>{profileInformation.followers.length}</span> {t('following')}
                </div>
                <div className="pl-4">
                    <span>{profileInformation.follows.length}</span> {t('followers')}
                </div>
            </div>

            {hasAnyAchievement(profileInformation.profile.achievements) && (
                <div className="mt-4 border-t pt-4">
                    <H2 className="mb-4">{t('achievements')}</H2>
                    <div className="flex flex-wrap gap-4">
                        {getBadges({ achievements: profileInformation.profile.achievements }).map(
                            (item) => item.badge
                        )}
                    </div>
                </div>
            )}

            <div className="mt-4 border-t pt-4">
                <div className="group/veWindow">
                    <H2 className="inline">{t('ve_window')}</H2>
                    <span className="italic text-slate-600 text-xs ml-2 invisible group-hover/veWindow:visible">
                        <Link href={'/profile/edit'} className="">
                            <MdEdit className="inline" /> {t('add_plan')}
                        </Link>
                    </span>
                </div>
                {profileInformation.profile.ve_window.length == 0 && <>-</>}
                <ul className="list-disc ml-6">
                    {profileInformation.profile.ve_window.map((plan: any, i) => {
                        return (
                            <li key={i}>
                                <Link href={`/plan/${plan.plan_id}`}>{plan.plan_name}</Link>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="mt-4 mb-4">
                <div className="group/groups mb-4">
                    <H2 className="inline">{t('groups')}</H2>
                    <span className="italic text-slate-600 text-xs ml-2 invisible group-hover/groups:visible">
                        <Link href={'/groups'}>
                            <MdEdit className="inline" /> {t('search_create')}
                        </Link>
                    </span>
                </div>
                {myGroups.length == 0 && <>-</>}
                <ul className="flex flex-wrap gap-4 justify-center">
                    {myGroups.map((group) => (
                        <li key={group._id} className="max-w-1/2">
                            <Link href={`/group/${group._id}`} className="flex flex-col">
                                <AuthenticatedImage
                                    imageId={group.space_pic}
                                    alt={t('group_picture')}
                                    width={60}
                                    height={60}
                                    className="rounded-full mx-auto my-1"
                                ></AuthenticatedImage>
                                <span className="truncate text-nowrap">{group.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
