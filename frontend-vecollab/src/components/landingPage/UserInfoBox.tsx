import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import H2 from '../common/H2';
import { useSession } from 'next-auth/react';
import React, { CSSProperties } from 'react';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { Achievements, BackendUser } from '@/interfaces/api/apiInterfaces';
import Image from 'next/image';
import { MdCheck, MdEdit } from 'react-icons/md';
import { useGetMyGroups } from '@/lib/backend';
import { Tooltip } from '../common/Tooltip';
import { profileImgBadgeOutlineColors } from '../network/UserProfileImage';

interface Props {
    profileInformation: BackendUser;
}

UserInfoBox.auth = true;
export default function UserInfoBox({ profileInformation }: Props) {
    const { t } = useTranslation(['community', 'common']);
    const { data: session } = useSession();
    const { data: myGroups } = useGetMyGroups(session!.accessToken);

    const chosenAchievement = profileInformation.profile.chosen_achievement;
    const achievementOutlineCss = chosenAchievement?.level
        ? `outline outline-3 outline-[${
              profileImgBadgeOutlineColors[chosenAchievement?.level - 1]
          }]`
        : '';

    // we have to set style property here, because otherwise dynamic outline color is not applied
    const style: CSSProperties = chosenAchievement?.level
        ? {
              outlineColor: profileImgBadgeOutlineColors[chosenAchievement.level - 1],
          }
        : {};

    return (
        <div className="w-full m-6 px-4 pb-6 bg-white rounded-md space-y-4">
            <div className="group">
                <div className="-mt-[52px] -ml-[32px] flex relative">
                    <div
                        className={`w-[180px] bg-white rounded-full overflow-hidden border-4 border-white shadow ${achievementOutlineCss}`}
                        style={style}
                    >
                        {chosenAchievement?.type && (
                            <span className="absolute -ml-[15px] -mt-[15px]">
                                {getBadge(chosenAchievement.type, chosenAchievement.level)}
                            </span>
                        )}
                        <AuthenticatedImage
                            imageId={profileInformation.profile.profile_pic}
                            alt={t('profile_pic')}
                            width={180}
                            height={180}
                        />
                    </div>

                    <div
                        className={
                            'font-bold text-xl text-slate-900 self-end -ml-[28px] mb-4 truncate bg-white px-2 py-1 rounded-full'
                        }
                    >
                        {profileInformation.profile.first_name}
                        &nbsp;
                        {profileInformation.profile.last_name}
                    </div>

                    <Link
                        href={'/profile/edit'}
                        className="absolute top-[60px] right-0 invisible group-hover:visible italic text-slate-600 text-xs"
                    >
                        <MdEdit className="inline" /> {t('common:edit')}
                    </Link>
                </div>

                <div className="mb-2 mt-6">{profileInformation.profile.bio}</div>

                <div className="">
                    {profileInformation.profile.ve_ready ? (
                        <span className="text-white bg-green-500 rounded-full shadow shadow-green-500 px-2 py-1 my-1">
                            <MdCheck className="inline mr-1 mb-1" />
                            {t('ve_ready_true')}
                        </span>
                    ) : (
                        <span className="text-red-600">{t('ve_ready_false')}</span>
                    )}
                </div>
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
                        {Badges({ achievements: profileInformation.profile.achievements }).map(
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

const levelStrings = ['bronze', 'silver', 'gold', 'platinum'];
// enum levelStrings2 {
//     'bronze' = 1,
//     'silver' = 2,
//     'gold' = 3,
//     'platinum' = 4,
// }

interface iBadgeElem {
    type: 'social' | 've';
    level: number;
    badge: JSX.Element;
}

export const getBadge = (type: 'social' | 've', level: number): JSX.Element => {
    const { t } = useTranslation(['community']);
    if (level > levelStrings.length) {
        return <></>;
    }
    // return (
    //     <Tooltip
    //         tooltipsText={...}
    //         position="top"
    //         children={
    //             ...
    //         }
    //     />
    // );
    const title: string = t(`${type}_badge_${level}`);
    return (
        <Image
            src={`/images/badges/${type}_${levelStrings[level - 1]}.png`}
            alt={'badge images'}
            title={title}
            className="w-[72px] rounded-full"
            width={72}
            height={50}
        />
    );
};

export const Badges = ({ achievements }: { achievements?: Achievements }): iBadgeElem[] => {
    if (!achievements) return [];

    const getBadgesOfType = (type: 'social' | 've'): iBadgeElem[] => {
        let badges: iBadgeElem[] = [];

        if (!Object.hasOwn(achievements, type)) return [];

        if (achievements[type].level == 0) return [];
        for (let i = 0; i < achievements[type].level; i++) {
            // if (!Object.hasOwn(levelStrings2, achievements[type].level)) {
            //     continue;
            // }
            if (i >= levelStrings.length) {
                continue;
            }

            badges.push({
                type: type,
                level: achievements[type].level,
                badge: (
                    <span key={`${type}-${i}`}>
                        {getBadge(
                            type,
                            i + 1
                            // Object.values(levelStrings2)[i] as keyof typeof levelStrings2
                        )}
                    </span>
                ),
            });
        }

        return badges;
    };

    return [...getBadgesOfType('social'), ...getBadgesOfType('ve')];
};

export function hasAnyAchievement(achievements?: Achievements) {
    if (!achievements) return false;
    return achievements.social.level > 0 || achievements.ve.level > 0;
}
