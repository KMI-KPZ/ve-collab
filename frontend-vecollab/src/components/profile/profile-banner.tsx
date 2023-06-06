import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Dialog from './Dialog';
import BoxHeadline from './BoxHeadline';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { RxTrash } from 'react-icons/rx';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import LoadingAnimation from '../LoadingAnimation';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import AuthenticatedImage from './AuthenticatedImage';
import DialogUserList from './DialogUserList';

interface Props {
    follows: string[];
    setFollows: Dispatch<SetStateAction<string[]>>;
    followers: string[];
    foreignUser: boolean;
    username: string;
}

export default function ProfileBanner({
    follows,
    setFollows,
    followers,
    foreignUser,
    username,
}: Props) {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false);
    const [followingSnippets, setFollowingSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const [isFollowerDialogOpen, setIsFollowerDialogOpen] = useState(false);
    const [followerSnippets, setFollowerSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const handleOpenFollowingDialog = () => {
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
                    }))
                );
                setLoading(false);
            }
        );
    };
    const handleCloseFollowingDialog = () => {
        setIsFollowingDialogOpen(false);
    };

    const handleOpenFollowerDialog = () => {
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
                    }))
                );
                setLoading(false);
            }
        );
    };
    const handleCloseFollowerDialog = () => {
        setIsFollowerDialogOpen(false);
    };

    const unfollowUser = (username: string) => {
        fetchDELETE(`/follow?user=${username}`, {}, session?.accessToken).then(() => {
            const removedUser = followingSnippets.filter(
                (snippet) => snippet.preferredUsername !== username
            );
            setFollowingSnippets(removedUser);
            setFollows(removedUser.map((user) => user.preferredUsername));
        });
    };

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    return (
        <>
            <div className={'w-full h-72 mt-10 relative rounded-2xl'}>
                <Image className={'z-10'} fill src={blueBackground} alt={''} />
                <div className={'flex absolute bottom-5 right-14 divide-x z-20 cursor-pointer'}>
                    <div
                        className={'pr-6 text-lg text-white'}
                        onClick={(e) => {
                            e.preventDefault();
                            handleOpenFollowingDialog();
                        }}
                    >
                        <div className={'font-bold'}>{follows.length}</div>
                        <div>Folgt</div>
                    </div>
                    <div
                        className={'pl-6 text-lg text-white'}
                        onClick={(e) => {
                            e.preventDefault();
                            handleOpenFollowerDialog();
                        }}
                    >
                        <div className={'font-bold'}>{followers.length}</div>
                        <div>Follower</div>
                    </div>
                </div>
            </div>
            <Dialog
                isOpen={isFollowingDialogOpen}
                title={`${username} folgt:`}
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
                title={`Nutzer:innen, die ${username} folgen:`}
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
    );
}
