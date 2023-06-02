import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { useEffect, useState } from 'react';
import Dialog from './Dialog';
import BoxHeadline from './BoxHeadline';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { RxTrash } from 'react-icons/rx';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import LoadingAnimation from '../LoadingAnimation';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import AuthenticatedImage from './AuthenticatedImage';

interface Props {
    follows: string[];
    followers: string[];
    foreignUser: boolean;
    username: string;
}

export default function ProfileBanner({ follows, followers, foreignUser, username }: Props) {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false);
    const [followerSnippets, setFollowerSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const handleOpenFollowingDialog = () => {
        setIsFollowingDialogOpen(true);
        setLoading(true);
        // TODO request folling snippets and set state to trigger rerender and setLoading(false) on finish
        fetchPOST('/profile_snippets', { usernames: follows }, session?.accessToken).then(
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
    const handleCloseFollowingDialog = () => {
        setIsFollowingDialogOpen(false);
    };

    const unfollowUser = (username: string) => {
        fetchDELETE(`/follow?user=${username}`, {}, session?.accessToken).then(() => {
            const removedUser = followerSnippets.filter(
                (snippet) => snippet.preferredUsername !== username
            );
            setFollowerSnippets(removedUser);
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
                    <div className={'pl-6 text-lg text-white'}>
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
                <div className="w-[30rem] h-[28rem] overflow-y-auto content-scrollbar">
                    {loading ? (
                        <div className="flex w-full h-full justify-center items-center">
                            <LoadingAnimation />
                        </div>
                    ) : (
                        <ul className="px-1 divide-y">
                            {followerSnippets.map((snippet, index) => (
                                <li key={index} className="flex py-2">
                                    <div
                                        className="flex cursor-pointer"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            router.push(
                                                `/profile?username=${snippet.preferredUsername}`
                                            );
                                            handleCloseFollowingDialog();
                                        }}
                                    >
                                        <div>
                                            <AuthenticatedImage
                                                imageId={snippet.profilePicUrl}
                                                alt={'Profilbild'}
                                                width={60}
                                                height={60}
                                                className="rounded-full"
                                            ></AuthenticatedImage>
                                        </div>
                                        <div>
                                            <BoxHeadline title={snippet.name} />
                                            <div className="mx-2 px-1 my-1 text-gray-600">
                                                {snippet.institution}
                                            </div>
                                        </div>
                                    </div>
                                    {!foreignUser && (
                                        <div className="ml-auto flex items-center">
                                            <RxTrash
                                                size={20}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    unfollowUser(snippet.preferredUsername);
                                                }}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Dialog>
        </>
    );
}
