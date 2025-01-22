import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { Dispatch, SetStateAction, useState } from 'react';
import Dialog from './Dialog';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import DialogUserList from './DialogUserList';
import { useTranslation } from 'next-i18next';

interface Props {
    follows: string[];
    setFollows: Dispatch<SetStateAction<string[]>>;
    followers: string[];
    foreignUser: boolean;
    username: string;
    isNoAuthPreview?: boolean;
}

export default function ProfileBanner({
    follows,
    setFollows,
    followers,
    foreignUser,
    username,
    isNoAuthPreview = false,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [loading, setLoading] = useState(false);

    const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false);
    const [followingSnippets, setFollowingSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const [isFollowerDialogOpen, setIsFollowerDialogOpen] = useState(false);
    const [followerSnippets, setFollowerSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const handleOpenFollowingDialog = () => {
        if (isNoAuthPreview) return;

        setIsFollowingDialogOpen(true);
        setLoading(true);
        fetchPOST('/profile_snippets', { usernames: follows }, session?.accessToken).then(
            (data) => {
                setFollowingSnippets(
                    data.user_snippets.map((snippet: any) => ({
                        name: snippet.first_name + ' ' + snippet.last_name,
                        profilePicUrl: snippet.profile_pic,
                        institution: snippet.institution,
                        preferredUsername: snippet.username,
                        chosen_achievement: snippet.chosen_achievement,
                    }))
                );
                setLoading(false);
            }
        );
    };
    const handleCloseFollowingDialog = () => {
        if (isNoAuthPreview) return;

        setIsFollowingDialogOpen(false);
    };

    const handleOpenFollowerDialog = () => {
        if (isNoAuthPreview) return;

        setIsFollowerDialogOpen(true);
        setLoading(true);
        fetchPOST('/profile_snippets', { usernames: followers }, session?.accessToken).then(
            (data) => {
                setFollowerSnippets(
                    data.user_snippets.map((snippet: any) => ({
                        name: snippet.first_name + ' ' + snippet.last_name,
                        profilePicUrl: snippet.profile_pic,
                        institution: snippet.institution,
                        preferredUsername: snippet.username,
                        chosen_achievement: snippet.chosen_achievement,
                    }))
                );
                setLoading(false);
            }
        );
    };
    const handleCloseFollowerDialog = () => {
        if (isNoAuthPreview) return;

        setIsFollowerDialogOpen(false);
    };

    const unfollowUser = (username: string) => {
        if (isNoAuthPreview) return;

        fetchDELETE(`/follow?user=${username}`, {}, session?.accessToken).then(() => {
            const removedUser = followingSnippets.filter(
                (snippet) => snippet.preferredUsername !== username
            );
            setFollowingSnippets(removedUser);
            setFollows(removedUser.map((user) => user.preferredUsername));
        });
    };

    return (
        <>
            <div className={'w-full h-72 mt-10 relative rounded-2xl'}>
                <Image className={'z-10'} fill src={blueBackground} alt={t('background_picture')} />
                <div
                    className={`flex absolute bottom-5 right-14 divide-x z-20 ${
                        isNoAuthPreview ? 'cursor-default' : 'cursor-pointer'
                    }`}
                >
                    <div
                        className={'pr-6 text-lg text-white'}
                        onClick={(e) => {
                            e.preventDefault();
                            handleOpenFollowingDialog();
                        }}
                    >
                        <div className={'font-bold'}>{follows.length}</div>
                        <div>{t('community:following')}</div>
                    </div>
                    <div
                        className={'pl-6 text-lg text-white'}
                        onClick={(e) => {
                            e.preventDefault();
                            handleOpenFollowerDialog();
                        }}
                    >
                        <div className={'font-bold'}>{followers.length}</div>
                        <div>{t('community:followers')}</div>
                    </div>
                </div>
            </div>
            {!isNoAuthPreview && (
                <>
                    <Dialog
                        isOpen={isFollowingDialogOpen}
                        title={t('user_follows', { username: username })}
                        onClose={handleCloseFollowingDialog}
                    >
                        <DialogUserList
                            loading={loading}
                            userSnippets={followingSnippets}
                            closeCallback={handleCloseFollowingDialog}
                            trashOption={true}
                            foreignUser={foreignUser}
                            trashCallback={unfollowUser}
                        />
                    </Dialog>
                    <Dialog
                        isOpen={isFollowerDialogOpen}
                        title={t('users_that_follow', { username: username })}
                        onClose={handleCloseFollowerDialog}
                    >
                        <DialogUserList
                            loading={loading}
                            userSnippets={followerSnippets}
                            closeCallback={handleCloseFollowerDialog}
                            trashOption={false}
                        />
                    </Dialog>
                </>
            )}
        </>
    );
}
