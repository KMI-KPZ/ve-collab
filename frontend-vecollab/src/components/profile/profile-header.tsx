import Link from 'next/link';
import { RxDotFilled } from 'react-icons/rx';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { CSSProperties, useState } from 'react';
import { useRouter } from 'next/router';
import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import Dialog from './Dialog';
import PublicPlansSelect from './PublicPlansSelect';
import Alert from '../common/dialogs/Alert';
import { useTranslation } from 'next-i18next';
import { Badge, badgeOutlineColors } from '../landingPage/Badge';
import { ChosenAchievement } from '@/interfaces/api/apiInterfaces';

interface Props {
    name: string;
    institution: string;
    profilePictureUrl: string;
    foreignUser: boolean;
    followers: string[];
    veReady: boolean;
    chosen_achievement?: null | ChosenAchievement;
    isNoAuthPreview?: boolean;
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

    const [appendPlanCheckboxChecked, setAppendPlanCheckboxChecked] = useState(false);
    const [chosenPlanId, setChosenPlanId] = useState('');
    const [veInvitationMessage, setVeInvitationMessage] = useState('');

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

    const sendVeInvitation = () => {
        if (isNoAuthPreview) return;

        const payload = {
            message: veInvitationMessage,
            plan_id: chosenPlanId === '' ? null : chosenPlanId,
            username: usernameOfProfileOwner,
        };

        fetchPOST('/ve_invitation/send', payload, session?.accessToken).then((response) => {
            setSuccessPopupOpen(true);
        });
    };

    // we have to set style property here, because otherwise dynamic outline color is not applied
    const achievementStyle: CSSProperties = chosen_achievement?.level
        ? {
              background: badgeOutlineColors[chosen_achievement.level - 1],
          }
        : {};

    return (
        <div className={'flex'}>
            <div
                className={`flex-none mr-8 rounded-full overflow-hidden shadow w-[168px] h-[168px] p-[4px] -m-[4px]
                `}
                style={achievementStyle}
            >
                {chosen_achievement?.type && (
                    <span className="absolute -ml-[15px] -mt-[15px]">
                        <Badge type={chosen_achievement.type} level={chosen_achievement.level} />
                    </span>
                )}
                <AuthenticatedImage
                    imageId={profilePictureUrl}
                    alt={t('profile_picture')}
                    width={180}
                    height={180}
                    isNoAuthPreview={isNoAuthPreview}
                    className="rounded-full border-4 border-white"
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
                            <Dialog
                                isOpen={isInvitationDialogOpen}
                                title={t('invite_to_ve', { name: name })}
                                onClose={handleCloseInvitationDialog}
                            >
                                <div className="w-[30rem] h-[26rem] overflow-y-auto content-scrollbar relative">
                                    <div>{t('ve_invitation_message')}</div>
                                    <textarea
                                        className={
                                            'w-full border border-gray-500 rounded-lg px-2 py-1 my-1'
                                        }
                                        rows={5}
                                        placeholder={t('ve_invitation_message_placeholder')}
                                        value={veInvitationMessage}
                                        onChange={(e) => setVeInvitationMessage(e.target.value)}
                                    ></textarea>
                                    <div className="flex mb-2 mt-4">
                                        <input
                                            type="checkbox"
                                            className="mr-2"
                                            checked={appendPlanCheckboxChecked}
                                            onChange={(e) =>
                                                setAppendPlanCheckboxChecked(
                                                    !appendPlanCheckboxChecked
                                                )
                                            }
                                        />
                                        <p>{t('append_existing_plan')}</p>
                                    </div>
                                    {appendPlanCheckboxChecked && (
                                        <>
                                            <PublicPlansSelect
                                                chosenPlanId={chosenPlanId}
                                                setChosenPlanId={setChosenPlanId}
                                            />
                                            <p className="my-2 text-gray-400">
                                                {t('append_plan_disclaimer')}
                                            </p>
                                        </>
                                    )}

                                    <div className="flex absolute bottom-0 w-full">
                                        <button
                                            className={
                                                'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                                            }
                                            onClick={handleCloseInvitationDialog}
                                        >
                                            <span>{t('common:cancel')}</span>
                                        </button>
                                        <button
                                            className={
                                                'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                                            }
                                            onClick={(e) => {
                                                sendVeInvitation();
                                                handleCloseInvitationDialog();
                                            }}
                                        >
                                            <span>{t('common:send')}</span>
                                        </button>
                                    </div>
                                </div>
                            </Dialog>
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
