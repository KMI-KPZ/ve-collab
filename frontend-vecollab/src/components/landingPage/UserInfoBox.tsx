import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import H2 from '../common/H2';
import { useSession } from 'next-auth/react';
import React from 'react';
import { BackendUser } from '@/interfaces/api/apiInterfaces';
import { MdEdit } from 'react-icons/md';
import { useGetMyGroups } from '@/lib/backend';
import { getBadges, hasAnyAchievement } from './Badge';
import UserProfileImage from '../network/UserProfileImage';
import VEVitrine from '../profile/VEVitrine';
import GroupsWidget from '../profile/GroupsWidget';
import VEReadyFor from '../profile/VEReadyFor';

interface Props {
    profileInformation: BackendUser;
}

UserInfoBox.auth = true;
export default function UserInfoBox({ profileInformation }: Props) {
    const { t } = useTranslation(['community', 'common']);
    const { data: session } = useSession();
    const { data: myGroups } = useGetMyGroups(session!.accessToken);

    return (
        <div className="w-full m-6 px-4 pb-6 bg-white rounded-md space-y-4 drop-shadow">
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
                    <span className="bg-white/[.90] rounded-full box-decoration-clone px-2 py-1">
                        {profileInformation.profile.first_name}
                        &nbsp;
                        {profileInformation.profile.last_name}
                    </span>
                </div>

                <div className="mb-4 mt-6">
                    <VEReadyFor ve_ready={profileInformation.profile.ve_ready} />
                </div>
            </div>

            <div className={'flex divide-x'}>
                <div className="pr-4">
                    {t('iam_following')} <span>{profileInformation.followers.length}</span>
                </div>
                <div className="pl-4">
                    {t('ive_followers')} <span>{profileInformation.follows.length}</span>
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

            {/* {profileInformation.profile.ve_window.length > 0 && (
                <VEVitrine
                    isOwnProfile={true}
                    items={profileInformation.profile.ve_window.map((plan: any, i) => {
                        return {
                            description: plan.description,
                            title: plan.plan_name,
                            plan: {
                                _id: plan.plan_id,
                                name: plan.plan_name,
                            },
                        };
                    })}
                />
            )} */}

            {myGroups.length > 0 && <GroupsWidget isOwnProfile={true} groups={myGroups} />}
        </div>
    );
}
