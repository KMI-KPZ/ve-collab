import Link from 'next/link';
import { RxTrash } from 'react-icons/rx';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Alert from '../common/dialogs/Alert';
import { useTranslation } from 'next-i18next';
import { BackendUser, BackendUser25 } from '@/interfaces/api/apiInterfaces';
import UserProfileImage from '../network/UserProfileImage';
import { IoIosSend } from 'react-icons/io';
import ButtonLight from '../common/buttons/ButtongLight';
import VEInvitationDialog from './VEInvitationDialog';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import AuthenticatedImage from '../common/AuthenticatedImage';
import VEReadyFor from './VEReadyFor';
import { Tooltip } from '../common/Tooltip';
import LoadingAnimation from '../common/LoadingAnimation';

interface Props {
    profileInformation: BackendUser25;
    foreignUser: boolean;

    isNoAuthPreview?: boolean;
    mutateProfileInformation: () => void;
    openOrCreateChatWith: () => void;
}

ProfileHeader.auth = true;
export default function ProfileHeader({
    profileInformation,
    foreignUser,
    isNoAuthPreview = false,
    mutateProfileInformation,
    openOrCreateChatWith,
}: Props) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
    const handleOpenInvitationDialog = () => {
        if (isNoAuthPreview) return;

        setIsInvitationDialogOpen(true);
    };
    const handleCloseInvitationDialog = () => {
        if (isNoAuthPreview) return;

        setIsInvitationDialogOpen(false);
    };

    const usernameOfProfileOwner =
        router.query.username !== undefined ? (router.query.username as string) : '';

    const followUser = () => {
        if (isNoAuthPreview) return;

        fetchPOST(`/follow?user=${usernameOfProfileOwner}`, {}, session?.accessToken).then(() => {
            mutateProfileInformation();
        });
    };

    const unfollowUser = (username: string) => {
        if (isNoAuthPreview) return;

        fetchDELETE(`/follow?user=${username}`, {}, session?.accessToken).then(() => {
            mutateProfileInformation();
        });
    };

    const institutiun =
        profileInformation?.profile?.institutions?.find(
            (institution) => institution._id === profileInformation.profile.chosen_institution_id
        )?.name || '';

    const name = `${profileInformation?.profile?.first_name} ${profileInformation?.profile?.last_name}`;

    const [loadingFollows, setLoadingFollows] = useState<boolean>(false);
    const [follows, setFollows] = useState<BackendUser[]>([]);

    const [loadingFollowers, setLoadingFollowers] = useState<boolean>(false);
    const [followers, setFollowers] = useState<BackendUser[]>([]);

    const fetchFollows = (usernames: string[]) => {
        if (usernames.length == 0 || follows.length > 0 || loadingFollows) return;
        setLoadingFollows(true);

        fetchPOST('/profile_snippets', { usernames }, session?.accessToken).then((data) => {
            setFollows(data.user_snippets);
            setLoadingFollows(false);
        });
    };
    const fetchFollowers = (usernames: string[]) => {
        if (usernames.length == 0 || followers.length > 0 || loadingFollowers) return;
        setLoadingFollowers(true);

        fetchPOST('/profile_snippets', { usernames }, session?.accessToken).then((data) => {
            setFollowers(data.user_snippets);
            setLoadingFollowers(false);
        });
    };

    useEffect(() => {
        // reset followers after change route
        setFollows([]);
        setFollowers([]);
    }, [router]);

    const ToolitpFollows = () => (
        <div className="overflow-y-auto max-h-32 content-scrollbar">
            {follows.map((user, i) => (
                <div key={i} className="flex items-center justify-between truncate text-black my-2">
                    <Link href={`/profile/user/${user.username}`} className="text-sm truncate">
                        <AuthenticatedImage
                            imageId={user.profile_pic}
                            alt={t('profile_picture')}
                            width={20}
                            height={20}
                            className="rounded-full mr-3 inline"
                        />
                        {user.first_name ? (
                            <>
                                {user.first_name} {user.last_name}
                            </>
                        ) : (
                            <>{user.username}</>
                        )}
                    </Link>
                    {!foreignUser && (
                        <ButtonLight
                            onClick={() => {
                                unfollowUser(user.username);
                            }}
                            className="rounded-full mx-1"
                            title={t('unfollow')}
                        >
                            <RxTrash />
                        </ButtonLight>
                    )}
                </div>
            ))}
        </div>
    );

    const TooltipFollowers = () => (
        <div className="overflow-y-auto max-h-32 content-scrollbar">
            {followers.map((user, i) => (
                <div key={i} className="truncate my-2">
                    <Link
                        href={`/profile/user/${user.username}`}
                        className="text-black text-sm truncate"
                    >
                        <AuthenticatedImage
                            imageId={user.profile_pic}
                            alt={t('profile_picture')}
                            width={20}
                            height={20}
                            className="rounded-full mr-3 inline"
                        />
                        {user.first_name ? (
                            <>
                                {user.first_name} {user.last_name}
                            </>
                        ) : (
                            <>{user.username}</>
                        )}
                    </Link>
                </div>
            ))}
        </div>
    );

    return (
        <div className="relative">
            <div
                className={
                    'absolute -left-2 w-[calc(100svw-16px)] xl:w-full h-[160px] top-0 xl:rounded-b-md bg-footer-pattern'
                }
            ></div>

            {!foreignUser && (
                <>
                    <Link
                        href={'/profile/edit'}
                        className="absolute z-20 right-0 top-6 mx-4 right-2 lx:right-20"
                    >
                        <button
                            className={
                                'border border-white bg-black/75 text-white rounded-lg px-3 py-1'
                            }
                        >
                            <span>{t('edit_profile')}</span>
                        </button>
                    </Link>
                </>
            )}

            <div
                className={
                    'relative z-10 pt-[160px] mx-2 lg:mx-20 mb-2 px-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-6'
                }
            >
                <div className="flex items-center">
                    <div className="mr-8 -mt-16 flex-none">
                        <UserProfileImage
                            type="big"
                            chosen_achievement={profileInformation.profile.chosen_achievement}
                            height={168}
                            width={168}
                            profile_pic={profileInformation.profile.profile_pic}
                        />
                    </div>
                    <div className="flex flex-wrap">
                        <div className="sm:max-w-[40%]">
                            <div className={'font-bold text-2xl text-slate-900'}>{name}</div>
                            <div className={'text-gray-500'}>{institutiun}</div>
                        </div>
                        <div className="sm:mx-6">
                            <VEReadyFor ve_ready={profileInformation.profile.ve_ready} />
                        </div>
                    </div>
                </div>

                <div className="absolute flex right-2 xl:right-20 top-[90px] divide-x text-white">
                    <div
                        className={'group/follows relative pr-6 hover:cursor:pointer'}
                        onMouseOver={() => fetchFollows(profileInformation.follows)}
                    >
                        <Tooltip
                            tooltipsText={
                                loadingFollows ? (
                                    <LoadingAnimation size="small" className="my-2" />
                                ) : profileInformation.follows.length > 0 ? (
                                    <ToolitpFollows />
                                ) : null
                            }
                            position="left"
                            className="pl-2"
                            innerClassName="!top-2"
                        >
                            <div>
                                {foreignUser
                                    ? t('community:following')
                                    : t('community:iam_following')}
                                <div className="font-bold border rounded-full w-fit px-3 py-1">
                                    {profileInformation.follows.length}
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                    <div
                        className={'group/followers relative pl-6 hover:cursor:pointer'}
                        onMouseOver={() => fetchFollowers(profileInformation.followers)}
                    >
                        <Tooltip
                            tooltipsText={
                                loadingFollowers ? (
                                    <LoadingAnimation size="small" className="my-2" />
                                ) : profileInformation.followers.length > 0 ? (
                                    <TooltipFollowers />
                                ) : null
                            }
                            position="left"
                            className="pl-2"
                            innerClassName="!top-2"
                        >
                            <div>
                                {foreignUser
                                    ? t('community:followers')
                                    : t('community:ive_followers')}
                                <div className="font-bold border rounded-full w-fit px-3 py-1">
                                    {profileInformation.followers.length}
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                </div>

                <div className={'flex flex-wrap gap-2'}>
                    {/* we only render follow and message buttons if it is not our own profile*/}
                    {foreignUser && (
                        <>
                            <ButtonLight
                                className="!rounded-full mx-2 h-12"
                                title={t('send_chat_message_to_user')}
                                onClick={() => {
                                    openOrCreateChatWith();
                                }}
                            >
                                <IoIosSend />
                            </ButtonLight>
                            {/* determine if current session user already follow the user behind the profile and render the follow button accordingly*/}
                            {profileInformation.followers.includes(
                                session?.user.preferred_username as string
                            ) ? (
                                <ButtonSecondary
                                    className="group"
                                    onClick={() => unfollowUser(usernameOfProfileOwner)}
                                >
                                    <span className="group-hover:hidden">{t('is_following')}</span>
                                    <span className="hidden group-hover:inline">
                                        {t('unfollow')}
                                    </span>
                                </ButtonSecondary>
                            ) : (
                                <ButtonSecondary onClick={followUser}>
                                    {t('follow')}
                                </ButtonSecondary>
                            )}
                            <ButtonPrimary onClick={handleOpenInvitationDialog}>
                                {t('ve_invitation')}
                            </ButtonPrimary>

                            {!isNoAuthPreview && (
                                <VEInvitationDialog
                                    userid={usernameOfProfileOwner}
                                    username={name}
                                    isOpen={isInvitationDialogOpen}
                                    callbackDone={handleCloseInvitationDialog}
                                />
                            )}
                            {successPopupOpen && (
                                <Alert
                                    message={t('alert_ve_invitation_sent')}
                                    autoclose={2000}
                                    onClose={() => setSuccessPopupOpen(false)}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
