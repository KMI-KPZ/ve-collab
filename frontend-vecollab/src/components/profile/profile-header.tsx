import Link from 'next/link';
import { RxDotFilled } from 'react-icons/rx';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Alert from '../common/dialogs/Alert';
import { useTranslation } from 'next-i18next';
import { ChosenAchievement } from '@/interfaces/api/apiInterfaces';
import UserProfileImage from '../network/UserProfileImage';
import { IoIosSend } from 'react-icons/io';
import ButtonLight from '../common/buttons/ButtongLight';
import VEInvitationDialog from './VEInvitationDialog';

interface Props {
    name: string;
    institution: string;
    profilePictureUrl: string;
    foreignUser: boolean;
    followers: string[];
    veReady: boolean;
    chosen_achievement?: null | ChosenAchievement;
    isNoAuthPreview?: boolean;
    openOrCreateChatWith: () => void;
}

ProfileHeader.auth = true;
export default function ProfileHeader({
    name,
    institution,
    profilePictureUrl,
    foreignUser,
    followers,
    veReady,
    chosen_achievement,
    isNoAuthPreview = false,
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
            // probably a better solution is to control follower state from parent component and
            // manage re-render of follow button by state and not by forcing a refresh and new api requests
            // but for now it works
            router.reload();
        });
    };

    const unfollowUser = () => {
        if (isNoAuthPreview) return;

        fetchDELETE(`/follow?user=${usernameOfProfileOwner}`, {}, session?.accessToken).then(() => {
            // probably a better solution is to control follower state from parent component and
            // manage re-render of follow button by state and not by forcing a refresh and new api requests
            // but for now it works
            router.reload();
        });
    };

    return (
        <div className={'flex'}>
            <div className="flex-none mr-8">
                <UserProfileImage
                    type="big"
                    chosen_achievement={chosen_achievement}
                    height={168}
                    width={168}
                    profile_pic={profilePictureUrl}
                />
            </div>
            <div className={'mr-auto'}>
                <div className="mt-2 min-h-[2rem]">
                    {!foreignUser && (
                        <>
                            <Link href={'/profile/edit'}>
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
                </div>
                <div className={'mt-11 font-bold text-4xl text-slate-900'}>{name}</div>
                <div className={'text-gray-500'}>{institution}</div>
            </div>
            <div className={'flex items-end mb-8'}>
                <div className="flex mx-16 h-12 items-center">
                    {veReady ? (
                        <>
                            <RxDotFilled
                                size={50}
                                className="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,1)]"
                            />
                            <div className="flex items-center text-green-600">
                                {t('ve_ready_true')}
                            </div>
                        </>
                    ) : (
                        <>
                            <RxDotFilled
                                size={50}
                                className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,1)]"
                            />
                            <div className="flex items-center text-red-600">
                                {t('ve_ready_false')}
                            </div>
                        </>
                    )}
                </div>
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
                        {followers.includes(session?.user.preferred_username as string) ? (
                            <button
                                className={`w-40 h-12 bg-ve-collab-blue/10 border border-ve-collab-blue py-3 px-6 mr-2 rounded-lg shadow-lg ${
                                    isNoAuthPreview ? 'cursor-default' : 'cursor-pointer'
                                }`}
                                onClick={unfollowUser}
                            >
                                {' '}
                                <span>{t('is_following')}</span>
                            </button>
                        ) : (
                            <button
                                className={`w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-2 rounded-lg shadow-lg ${
                                    isNoAuthPreview ? 'cursor-default' : 'cursor-pointer'
                                }`}
                                onClick={followUser}
                            >
                                {' '}
                                <span>{t('follow')}</span>
                            </button>
                        )}
                        <button
                            className={`w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl ${
                                isNoAuthPreview ? 'cursor-default' : 'cursor-pointer'
                            }`}
                            onClick={(e) => {
                                e.preventDefault();
                                handleOpenInvitationDialog();
                            }}
                        >
                            {' '}
                            <span>{t('ve_invitation')}</span>
                        </button>
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
    );
}
