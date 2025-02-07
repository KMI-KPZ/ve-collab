import Dialog from '../profile/Dialog';
import { useState } from 'react';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import { fetchDELETE, fetchPOST, useGetGroup } from '@/lib/backend';
import { useRouter } from 'next/router';
import LoadingAnimation from '../common/LoadingAnimation';
import BoxHeadline from '../common/BoxHeadline';
import { RxTrash } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import UserProfileImage from './UserProfileImage';

interface Props {
    userIsAdmin: () => boolean;
}

export default function GroupBanner({ userIsAdmin }: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const router = useRouter();
    const { groupId } = router.query;

    const [loading, setLoading] = useState(false);

    const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
    const [memberSnippets, setMemberSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const {
        data: group,
        isLoading,
        error,
        mutate,
    } = useGetGroup(session!.accessToken, groupId as string);

    const handleOpenMemberDialog = () => {
        setIsMemberDialogOpen(true);
        setLoading(true);
        fetchPOST('/profile_snippets', { usernames: group.members }, session?.accessToken).then(
            (data) => {
                setMemberSnippets(
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

    const handleCloseMemberDialog = () => {
        setIsMemberDialogOpen(false);
    };

    const removeUserFromGroup = (username: string) => {
        fetchDELETE(
            `/spaceadministration/kick?id=${group._id}&user=${username}`,
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
            <div className={'relative'}>
                <div
                    className={
                        'absolute -left-2 w-[calc(100svw-16px)] xl:w-full h-[160px] top-0 xl:rounded-b-md bg-footer-pattern'
                    }
                ></div>

                <div className={'flex absolute top-[90px] right-14 divide-x z-10'}>
                    <div className={'flex items-center pr-6 text-lg text-white'}>
                        <div>
                            <div className="font-bold">
                                {group.joinable ? t('public') : t('private')}
                            </div>
                            <div className="font-bold">
                                {group.invisible ? t('invisible') : t('visible')}
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
                        <div className={'font-bold'}>{group.members.length}</div>
                        <div>{t('members')}</div>
                    </div>
                </div>
            </div>
            <Dialog
                isOpen={isMemberDialogOpen}
                title={t('members')}
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
                                        className="flex cursor-pointer items-center"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            router.push(
                                                `/profile/user/${snippet.preferredUsername}`
                                            );
                                            handleCloseMemberDialog();
                                        }}
                                    >
                                        <div>
                                            <UserProfileImage
                                                profile_pic={snippet.profilePicUrl}
                                                chosen_achievement={snippet.chosen_achievement}
                                                width={60}
                                                height={60}
                                            />
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
                                                group.admins.includes(snippet.preferredUsername)
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
