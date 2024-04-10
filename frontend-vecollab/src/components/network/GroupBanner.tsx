import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import Dialog from '../profile/Dialog';
import { useState } from 'react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import { fetchDELETE, fetchPOST, useGetSpace } from '@/lib/backend';
import { useRouter } from 'next/router';
import LoadingAnimation from '../LoadingAnimation';
import AuthenticatedImage from '../AuthenticatedImage';
import BoxHeadline from '../BoxHeadline';
import { RxTrash } from 'react-icons/rx';

interface Props {
    userIsAdmin: () => boolean;
}

export default function GroupBanner({ userIsAdmin }: Props) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
    const [memberSnippets, setMemberSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const {
        data: space,
        isLoading,
        error,
        mutate,
    } = useGetSpace(session!.accessToken, router.query.id as string);

    const handleOpenMemberDialog = () => {
        setIsMemberDialogOpen(true);
        setLoading(true);
        fetchPOST('/profile_snippets', { usernames: space.members }, session?.accessToken).then(
            (data) => {
                setMemberSnippets(
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

    const handleCloseMemberDialog = () => {
        setIsMemberDialogOpen(false);
    };

    const removeUserFromGroup = (username: string) => {
        fetchDELETE(
            `/spaceadministration/kick?id=${space._id}&user=${username}`,
            {},
            session?.accessToken
        ).then(() => {
            const removedUser = memberSnippets.filter(
                (snippet) => snippet.preferredUsername !== username
            );
            setMemberSnippets(removedUser);

            mutate();
        });
    };
    return (
        <>
            <div className={'w-full h-72 mt-10 relative rounded-2xl'}>
                <Image fill src={blueBackground} alt={''} />
                {isLoading ? (
                    <LoadingAnimation />
                ) : (
                    <div className={'flex absolute bottom-5 right-14 divide-x z-10'}>
                        <div className={'flex items-center pr-6 text-lg text-white'}>
                            <div>
                                <div className="font-bold">
                                    {space.joinable ? 'öffentlich' : 'privat'}
                                </div>
                                <div className="font-bold">
                                    {space.invisible ? 'unsichtbar' : 'sichtbar'}
                                </div>
                            </div>
                        </div>
                        <div
                            className={'pl-6 text-lg text-white cursor-pointer'}
                            onClick={(e) => {
                                e.preventDefault();
                                handleOpenMemberDialog();
                            }}
                        >
                            <div className={'font-bold'}>{space.members.length}</div>
                            <div>Mitglieder</div>
                        </div>
                    </div>
                )}
            </div>
            <Dialog
                isOpen={isMemberDialogOpen}
                title={'Mitglieder'}
                onClose={handleCloseMemberDialog}
            >
                <div className="w-[30rem] h-[28rem] overflow-y-auto content-scrollbar">
                    {loading ? (
                        <div className="flex w-full h-full justify-center items-center">
                            <LoadingAnimation />
                        </div>
                    ) : (
                        <ul className="px-1 divide-y">
                            {memberSnippets.map((snippet, index) => (
                                <li key={index} className="flex py-2">
                                    <div
                                        className="flex cursor-pointer"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            router.push(
                                                `/profile?username=${snippet.preferredUsername}`
                                            );
                                            handleCloseMemberDialog();
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
                                    {userIsAdmin() && (
                                        <>
                                            {!(
                                                session?.user?.preferred_username ===
                                                    snippet.preferredUsername ||
                                                space.admins.includes(snippet.preferredUsername)
                                            ) && (
                                                <div className="ml-auto flex items-center">
                                                    <RxTrash
                                                        size={20}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            removeUserFromGroup !== undefined
                                                                ? removeUserFromGroup(
                                                                      snippet.preferredUsername
                                                                  )
                                                                : {};
                                                        }}
                                                        className="cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </>
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
