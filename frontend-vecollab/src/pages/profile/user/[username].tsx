import React, { useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetServerSidePropsContext } from 'next';

import CustomHead from '@/components/metaData/CustomHead';
import { SocketContext } from '@/pages/_app';
import { useRouter } from 'next/router';
import { fetchGET, useGetProfile } from '@/lib/backend';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import H1 from '@/components/common/H1';
import Custom404 from '@/pages/404';
import ProfileHeader from '@/components/profile/profile-header';
import WhiteBox from '@/components/common/WhiteBox';
import Timeline from '@/components/network/Timeline';
import ExtendedPersonalInformation from '@/components/profile/ExtendedPersonalInformation';
import PersonalData from '@/components/profile/PersonalData';
import VEVitrine from '@/components/profile/VEVitrine';
import { getBadges, hasAnyAchievement } from '@/components/landingPage/Badge';
import H2 from '@/components/common/H2';
import Link from 'next/link';
import { MdArrowRight, MdEdit } from 'react-icons/md';
import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import GroupsWidget from '@/components/profile/GroupsWidget';
import { TbFileText } from 'react-icons/tb';
import Timestamp from '@/components/common/Timestamp';
import ButtonLight from '@/components/common/buttons/ButtongLight';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { FaMedal } from 'react-icons/fa';

interface Props {
    openOrCreateChatWith: (users: string[]) => void;
}

UserProfile.auth = true;
UserProfile.autoForward = true;

export default function UserProfile({ openOrCreateChatWith }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const socket = useContext(SocketContext);
    const { t } = useTranslation('common');
    const router = useRouter();
    const username: string = router.query.username as string;
    const isOwnProfile: boolean = username == (session!.user.preferred_username as string);

    const {
        data: profileInformation,
        isLoading: isLoadingProfile,
        error: errorLoadingProfile,
        mutate: mutateProfileInformation,
    } = useGetProfile(username, session!.accessToken);

    const [groups, setGroups] = useState<BackendGroup[]>([]);
    const [plans, setPlans] = useState<PlanPreview[]>([]);

    // useEffect(() => {
    //     console.log({ profileInformation });
    //     console.log({ publicPlans });
    // }, []);

    useEffect(() => {
        if (!session) return;

        if (isOwnProfile) {
            fetchGET('/spaceadministration/my', session.accessToken).then((data) => {
                if (data.spaces) {
                    setGroups(data.spaces);
                }
            });
        } else {
            fetchGET('/spaceadministration/list', session.accessToken).then((data) => {
                if (data.spaces) {
                    setGroups(
                        data.spaces.filter((space: BackendGroup) =>
                            space.members.includes(session.user.preferred_username as string)
                        )
                    );
                }
            });
        }
    }, [session, isOwnProfile]);

    useEffect(() => {
        if (!session) return;

        if (isOwnProfile) {
            fetchGET(`/planner/get_available`, session.accessToken).then((data) => {
                if (data.plans) {
                    setPlans(data.plans);
                }
            });
        } else {
            fetchGET(`/planner/get_public_of_user?username=${username}`, session.accessToken).then(
                (data) => {
                    if (data.plans) {
                        setPlans(data.plans);
                    }
                }
            );
        }
    }, [session, isOwnProfile, username]);

    if (isLoadingProfile) return <LoadingAnimation />;
    if (errorLoadingProfile || !Object.keys(profileInformation).length) return <Custom404 />;

    return (
        <>
            <CustomHead
                pageTitle={t('common:profile')}
                pageSlug={`profile/user/${username}`}
                pageDescription={t('profile_description')}
            />
            <ProfileHeader
                profileInformation={profileInformation}
                foreignUser={!isOwnProfile}
                mutateProfileInformation={mutateProfileInformation}
                openOrCreateChatWith={() => {
                    openOrCreateChatWith([
                        session!.user.preferred_username!,
                        router.query.username as string,
                    ]);
                }}
            />

            <div className={'mx-4 lg:mx-20 flex flex-wrap'}>
                <div className={'w-full md:w-1/3'}>
                    <WhiteBox>
                        <>
                            <PersonalData
                                profile={profileInformation.profile}
                                isOwnProfile={isOwnProfile}
                            />
                            {hasAnyAchievement(profileInformation.profile.achievements) && (
                                <div className="mt-4 border-t pt-4">
                                    <H2 className="mb-4">{t('community:achievements')}</H2>
                                    <div className="flex flex-wrap gap-4">
                                        {getBadges({
                                            achievements: profileInformation.profile.achievements,
                                        }).map((item) => item.badge)}
                                    </div>
                                </div>
                            )}

                            <VEVitrine
                                isOwnProfile={isOwnProfile}
                                items={profileInformation.profile.ve_window.map((elem: any) => ({
                                    plan: { _id: elem.plan_id, name: elem.plan_name },
                                    title: elem.title,
                                    description: elem.description,
                                }))}
                            />

                            {groups.length > 0 && (
                                <GroupsWidget isOwnProfile={isOwnProfile} groups={groups} />
                            )}

                            {/* <div className="mt-4 border-t pt-4">
                                <H2>{t('deine_ves')}</H2>
                                TODO: ?!
                            </div> */}
                        </>
                    </WhiteBox>
                </div>
                <div className={'w-full md:w-2/3 md:pl-12'}>
                    <WhiteBox>
                        <div className="min-h-[15rem]">
                            <ExtendedPersonalInformation
                                veInfo={{
                                    veInterests: profileInformation.profile.ve_interests,
                                    veContents: profileInformation.profile.ve_contents,
                                    veGoals: profileInformation.profile.ve_goals,
                                    experience: profileInformation.profile.experience,
                                    interdisciplinaryExchange:
                                        profileInformation.profile.interdisciplinary_exchange,
                                    preferredFormat: profileInformation.profile.preferred_format,
                                }}
                                researchAndTeachingInfo={{
                                    researchTags: profileInformation.profile.research_tags,
                                    courses: profileInformation.profile.courses,
                                    lms: profileInformation.profile.lms,
                                    tools: profileInformation.profile.tools,
                                }}
                                cvInfo={{
                                    educations: profileInformation.profile.educations,
                                    workExperience: profileInformation.profile.work_experience,
                                }}
                            />
                            {isOwnProfile && (
                                <div className="hidden group-hover:block absolute right-4 top-4">
                                    <Link
                                        href={'/profile/edit#'}
                                        className="italic text-slate-600 text-xs"
                                    >
                                        <MdEdit className="inline" /> {t('common:edit')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </WhiteBox>

                    {plans.length > 0 && (
                        <div className="px-12 my-6 relative">
                            <H1 className="mt-6 -ml-12">
                                {isOwnProfile ? t('your_plans') : t('public_plans_of')}
                                {/* <span className="italic text-slate-600 font-sm">
                                    ({t('public')})
                                </span> */}
                            </H1>
                            <div className="text-end text-slate-600 italic -mb-6">
                                {t('last_change')}:
                            </div>
                            <div className="divide-y divide-slate-400 space-y-6">
                                {plans.slice(0, 7).map((plan, i) => (
                                    <div key={i} className="flex items-center justify-between pt-6">
                                        <div className="grow flex items-center truncate">
                                            <Link
                                                href={`/ve-designer/name?plannerId=${plan._id}`}
                                                className="group/ve-item"
                                            >
                                                <span className="font-bold text-lg group-hover/ve-item:text-ve-collab-orange">
                                                    <TbFileText
                                                        className="inline mr-2 p-1 border border-gray-600 rounded-full group-hover/ve-item:border-ve-collab-orange"
                                                        size={30}
                                                    />{' '}
                                                    {plan.name}
                                                </span>
                                            </Link>
                                            {plan.is_good_practise && (
                                                <div className="mx-4 text-ve-collab-blue">
                                                    <FaMedal
                                                        title={t(
                                                            'common:plans_marked_as_good_practise'
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <Timestamp
                                            timestamp={plan.last_modified}
                                            className="text-base font-normal"
                                            dateFormat="dd. MMM yy"
                                        />
                                    </div>
                                ))}
                            </div>
                            {plans.length > 7 && (
                                <div className="text-end my-6">
                                    <ButtonLight link="/plans" className="ml-auto">
                                        {t('all')}{' '}
                                        <MdArrowRight size={24} className="inline mx-1" />
                                    </ButtonLight>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pl-12">
                        <H1 className="mt-6 -ml-12">{t('community:posts')}</H1>

                        {isOwnProfile ? (
                            <Timeline socket={socket} />
                        ) : (
                            <Timeline
                                socket={socket}
                                user={router.query.username as string}
                                hideForm={true}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
