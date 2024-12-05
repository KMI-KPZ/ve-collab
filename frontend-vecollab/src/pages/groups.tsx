import React, { useEffect } from 'react';
import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import BoxHeadline from '@/components/common/BoxHeadline';
import WhiteBox from '@/components/common/WhiteBox';
import Dialog from '@/components/profile/Dialog';
import VerticalTabs from '@/components/profile/VerticalTabs';
import {
    fetchGET,
    fetchPOST,
    useGetAllGroups,
    useGetMyACL,
    useGetMyGroupInvites,
    useGetMyGroupRequests,
    useGetMyGroups,
} from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';

Groups.auth = true;
Groups.noAuthPreview = <GroupsNoAuthPreview />;

export default function Groups() {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [searchInput, setSearchInput] = useState('');
    const [newInput, setNewInput] = useState('');
    const [newGroupInvisibleCheckboxChecked, setNewGroupInvisibleCheckboxChecked] = useState(false);
    const [newGroupJoinableCheckboxChecked, setNewGroupJoinableCheckboxChecked] = useState(false);
    const [searchResults, setSearchResults] = useState<BackendGroup[]>([]);

    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

    const { data: myGroups, mutate: mutateMyGroups } = useGetMyGroups(session!.accessToken);
    const { data: allGroups, mutate: mutateAllGroups } = useGetAllGroups(session!.accessToken);

    const { data: myGroupInvites, mutate: mutateMyGroupInvites } = useGetMyGroupInvites(
        session!.accessToken
    );

    const { data: myGroupRequests, mutate: mutateMyGroupRequests } = useGetMyGroupRequests(
        session!.accessToken
    );

    const { data: myACL } = useGetMyACL(session!.accessToken);

    const handleSearchInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.target.value);
        fetchGET(`/search?spaces=true&query=${event.target.value}`, session!.accessToken).then(
            (data) => {
                setSearchResults(
                    data.spaces.filter((space: BackendGroup) => {
                        return !space.members.includes(session!.user?.preferred_username as string);
                    })
                );
            }
        );
    };

    const handleCloseNewDialog = () => {
        setIsNewDialogOpen(false);
    };

    const createNewGroup = () => {
        fetchPOST(
            `/spaceadministration/create?name=${newInput}&invisible=${newGroupInvisibleCheckboxChecked}&joinable=${!newGroupJoinableCheckboxChecked}`,
            {},
            session!.accessToken
        );
        mutateMyGroups();
        mutateAllGroups();
    };

    function sendJoinRequest(groupId: string): void {
        fetchPOST(`/spaceadministration/join?id=${groupId}`, {}, session!.accessToken).then(
            (data) => {
                mutateMyGroups();
                mutateAllGroups();
                mutateMyGroupRequests();

                // if group is joinable, user is automatically joined
                // and therefore remove the group from the list
                if (data.join_type === 'joined') {
                    searchResults.splice(
                        searchResults.findIndex((group) => group._id === groupId),
                        1
                    );
                } else if (data.join_type === 'requested_join') {
                    searchResults
                        .find((group) => group._id === groupId)!
                        .requests.push(session!.user.preferred_username!);
                }
            }
        );
    }

    function acceptInvite(groupId: string): void {
        fetchPOST(
            `/spaceadministration/accept_invite?id=${groupId}`,
            {},
            session!.accessToken
        ).then(() => {
            mutateMyGroups();
            mutateAllGroups();
            mutateMyGroupInvites();
        });
    }

    function declineInvite(groupId: string): void {
        fetchPOST(
            `/spaceadministration/decline_invite?id=${groupId}`,
            {},
            session!.accessToken
        ).then(() => {
            mutateMyGroups();
            mutateAllGroups();
            mutateMyGroupInvites();
        });
    }

    function revokeRequest(groupId: string) {
        fetchPOST(
            `/spaceadministration/revoke_request?id=${groupId}`,
            {},
            session!.accessToken
        ).then(() => {
            mutateAllGroups();
            mutateMyGroupRequests();
        });
    }

    return (
        <>
            <CustomHead pageTitle={t('groups')} pageSlug={'groups'} />
            <div className="mt-12">
                <WhiteBox>
                    <VerticalTabs>
                        <div tabid="my_groups" tabname={t('my_groups')}>
                            <div className="min-h-[63vh]">
                                <BoxHeadline title={t('you_are_member_of_groups')} />
                                <div className="divide-y my-4">
                                    {myGroups.map((group, index) => (
                                        <div key={index} className="px-2 py-5">
                                            <Link
                                                href={`/group/${group._id}`}
                                                className="flex cursor-pointer"
                                            >
                                                <div className="flex-none">
                                                    <AuthenticatedImage
                                                        imageId={group.space_pic}
                                                        alt={t('group_picture')}
                                                        width={60}
                                                        height={60}
                                                        className="rounded-full"
                                                    ></AuthenticatedImage>
                                                </div>
                                                <div>
                                                    <BoxHeadline title={group.name} />
                                                    <div className="mx-2 px-1 my-1 text-gray-600">
                                                        {group.space_description
                                                            ? group.space_description
                                                            : t('no_description_available')}
                                                    </div>
                                                </div>
                                                {/* <div className="flex ml-auto px-2 items-center justify-center">
                                                <button>
                                                    <RxDotsVertical size={25} />
                                                </button>
                                            </div> */}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div tabid="find_new_groups" tabname={t('find_new_groups')}>
                            <div className="min-h-[63vh]">
                                <div className="h-[50vh] overflow-y-auto content-scrollbar">
                                    <input
                                        className={
                                            'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-11/12'
                                        }
                                        type="text"
                                        placeholder={t('search_groups_placeholder')}
                                        value={searchInput}
                                        onChange={handleSearchInput}
                                    />
                                    {searchInput && searchResults.length === 0 ? (
                                        <div className="px-2 py-5">
                                            <div className="mx-2 px-1 my-1 text-gray-600">
                                                {t('no_results_found')}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {searchResults.map((group, index) => (
                                                <div key={index} className="px-2 py-5">
                                                    <div className="flex cursor-pointer">
                                                        <div className="flex-none">
                                                            <AuthenticatedImage
                                                                imageId={group.space_pic}
                                                                alt={t('group_picture')}
                                                                width={60}
                                                                height={60}
                                                                className="rounded-full"
                                                            ></AuthenticatedImage>
                                                        </div>
                                                        <div>
                                                            <BoxHeadline title={group.name} />
                                                            <div className="mx-2 px-1 my-1 text-gray-600">
                                                                {group.space_description
                                                                    ? group.space_description
                                                                    : t('no_description_available')}
                                                            </div>
                                                        </div>
                                                        <div className="flex ml-auto px-2 items-center justify-center">
                                                            <div className="flex items-center">
                                                                {/* if user is already member (or admin), no button is rendered */}
                                                                {!(
                                                                    group.members.includes(
                                                                        session!.user
                                                                            .preferred_username!
                                                                    ) ||
                                                                    group.admins.includes(
                                                                        session!.user
                                                                            .preferred_username!
                                                                    )
                                                                ) &&
                                                                    // if group is joinable, render join button
                                                                    (group.joinable ? (
                                                                        <button
                                                                            className={
                                                                                'h-10 bg-ve-collab-orange text-white px-4 mx-2 rounded-lg shadow-xl'
                                                                            }
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                sendJoinRequest(
                                                                                    group._id
                                                                                );
                                                                            }}
                                                                        >
                                                                            <span>{t('join')}</span>
                                                                        </button>
                                                                    ) : // if group is not joinable and user has already requested to join, render disabled "already requested" button
                                                                    group.requests.includes(
                                                                          session!.user
                                                                              .preferred_username!
                                                                      ) ? (
                                                                        <button
                                                                            disabled
                                                                            className={
                                                                                'h-10 bg-transparent border border-ve-collab-orange/50 text-ve-collab-orange/50 cursor-not-allowed px-4 mx-2 rounded-lg shadow-xl'
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {t(
                                                                                    'join_requested'
                                                                                )}
                                                                            </span>
                                                                        </button>
                                                                    ) : (
                                                                        // if space is not joinable and user has not already requested to join, render request button
                                                                        <button
                                                                            className={
                                                                                'h-10 bg-transparent border border-ve-collab-orange text-ve-collab-orange  px-4 mx-2 rounded-lg shadow-xl'
                                                                            }
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                sendJoinRequest(
                                                                                    group._id
                                                                                );
                                                                            }}
                                                                        >
                                                                            <span>
                                                                                {t('request_join')}
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                                {myACL.create_space && (
                                    <div className="my-4">
                                        <BoxHeadline title={t('no_matching_result_question')} />
                                        <button
                                            className={
                                                'h-10 bg-ve-collab-orange text-white px-4 mx-2 my-2 rounded-lg shadow-xl'
                                            }
                                            onClick={() => setIsNewDialogOpen(true)}
                                        >
                                            <span>{t('create_new_group')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div tabid="all_groups" tabname={t('common:all')}>
                            <div className="min-h-[63vh]">
                                <div className="h-[50vh] overflow-y-auto content-scrollbar">
                                    {allGroups.map((group, index) => (
                                        <div key={index} className="px-2 py-5">
                                            <Link
                                                href={`/group/${group._id}`}
                                                className="flex cursor-pointer"
                                            >
                                                <div className="flex-none">
                                                    <AuthenticatedImage
                                                        imageId={group.space_pic}
                                                        alt={t('group_picture')}
                                                        width={60}
                                                        height={60}
                                                        className="rounded-full"
                                                    ></AuthenticatedImage>
                                                </div>
                                                <div>
                                                    <BoxHeadline title={group.name} />
                                                    <div className="mx-2 px-1 my-1 text-gray-600">
                                                        {group.space_description
                                                            ? group.space_description
                                                            : t('no_description_available')}
                                                    </div>
                                                </div>
                                                <div className="flex ml-auto px-2 items-center justify-center">
                                                    <div className="flex items-center">
                                                        {/* if user is already member (or admin), no button is rendered */}
                                                        {!(
                                                            group.members.includes(
                                                                session!.user.preferred_username!
                                                            ) ||
                                                            group.admins.includes(
                                                                session!.user.preferred_username!
                                                            )
                                                        ) &&
                                                            // if group is joinable, render join button
                                                            (group.joinable ? (
                                                                <button
                                                                    className={
                                                                        'h-10 bg-ve-collab-orange text-white px-4 mx-2 rounded-lg shadow-xl'
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        sendJoinRequest(group._id);
                                                                    }}
                                                                >
                                                                    <span>{t('join')}</span>
                                                                </button>
                                                            ) : // if group is not joinable and user has already requested to join, render disabled "already requested" button
                                                            group.requests.includes(
                                                                  session!.user.preferred_username!
                                                              ) ? (
                                                                <button
                                                                    disabled
                                                                    className={
                                                                        'h-10 bg-transparent border border-ve-collab-orange/50 text-ve-collab-orange/50 cursor-not-allowed px-4 mx-2 rounded-lg shadow-xl'
                                                                    }
                                                                >
                                                                    <span>
                                                                        {t('join_requested')}
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                // if group is not joinable and user has not already requested to join, render request button
                                                                <button
                                                                    className={
                                                                        'h-10 bg-transparent border border-ve-collab-orange text-ve-collab-orange  px-4 mx-2 rounded-lg shadow-xl'
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        sendJoinRequest(group._id);
                                                                    }}
                                                                >
                                                                    <span>{t('request_join')}</span>
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                                {myACL.create_space && (
                                    <div className="my-4">
                                        <BoxHeadline title={t('no_matching_result_question')} />
                                        <button
                                            className={
                                                'h-10 bg-ve-collab-orange text-white px-4 mx-2 my-2 rounded-lg shadow-xl'
                                            }
                                            onClick={() => setIsNewDialogOpen(true)}
                                        >
                                            <span>{t('create_new_group')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div
                            tabid="requests_invitations"
                            tabname={t('my_requests_and_invitations')}
                        >
                            <div className="min-h-[63vh]">
                                <BoxHeadline title={t('pending_invitations')} />
                                <div className="h-[25vh] mb-10 overflow-y-auto content-scrollbar">
                                    {myGroupInvites.map((group, index) => (
                                        <div key={index} className="px-2 py-5">
                                            <Link
                                                href={`/group/${group._id}`}
                                                className="flex cursor-pointer"
                                            >
                                                <div className="flex-none">
                                                    <AuthenticatedImage
                                                        imageId={group.space_pic}
                                                        alt={t('group_picture')}
                                                        width={60}
                                                        height={60}
                                                        className="rounded-full"
                                                    ></AuthenticatedImage>
                                                </div>
                                                <div>
                                                    <BoxHeadline title={group.name} />
                                                    <div className="mx-2 px-1 my-1 text-gray-600">
                                                        {group.space_description
                                                            ? group.space_description
                                                            : t('no_description_available')}
                                                    </div>
                                                </div>
                                                <div className="flex ml-auto px-2 items-center justify-center">
                                                    <div className="flex items-center">
                                                        <button
                                                            className={
                                                                'h-10 bg-transparent border border-green-600 text-green-600 px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                acceptInvite(group._id);
                                                            }}
                                                        >
                                                            <span>{t('common:accept')}</span>
                                                        </button>
                                                        <button
                                                            className={
                                                                'h-10 bg-transparent border border-red-600 text-red-600 px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                declineInvite(group._id);
                                                            }}
                                                        >
                                                            <span>{t('common:decline')}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                                <BoxHeadline title={t('pending_requests')} />
                                <div className="h-[25vh] overflow-y-auto content-scrollbar">
                                    {myGroupRequests.map((group, index) => (
                                        <div key={index} className="px-2 py-5">
                                            <Link
                                                href={`/group/${group._id}`}
                                                className="flex cursor-pointer"
                                            >
                                                <div className="flex-none">
                                                    <AuthenticatedImage
                                                        imageId={group.space_pic}
                                                        alt={t('group_picture')}
                                                        width={60}
                                                        height={60}
                                                        className="rounded-full"
                                                    ></AuthenticatedImage>
                                                </div>
                                                <div>
                                                    <BoxHeadline title={group.name} />
                                                    <div className="mx-2 px-1 my-1 text-gray-600">
                                                        {group.space_description
                                                            ? group.space_description
                                                            : t('no_description_available')}
                                                    </div>
                                                </div>
                                                <div className="flex ml-auto px-2 items-center justify-center">
                                                    <div className="flex items-center">
                                                        <button
                                                            className={
                                                                'h-10 bg-ve-collab-orange text-white px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                revokeRequest(group._id);
                                                            }}
                                                        >
                                                            <span>{t('revoke_request')}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </VerticalTabs>
                </WhiteBox>
                <Dialog
                    isOpen={isNewDialogOpen}
                    title={t('create_new_group')}
                    onClose={handleCloseNewDialog}
                >
                    <div className="w-[25vw] relative">
                        <div>{t('new_group_name')}</div>
                        <input
                            className={'border border-gray-500 rounded-lg px-2 py-1 my-2 w-full'}
                            type="text"
                            placeholder={t('new_group_name_placeholder')}
                            value={newInput}
                            onChange={(e) => setNewInput(e.target.value)}
                        />
                        <div className="flex my-2">
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={newGroupInvisibleCheckboxChecked}
                                onChange={(e) =>
                                    setNewGroupInvisibleCheckboxChecked(
                                        !newGroupInvisibleCheckboxChecked
                                    )
                                }
                            />
                            <p>{t('invisible')}</p>
                        </div>
                        <div className="flex my-2">
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={newGroupJoinableCheckboxChecked}
                                onChange={(e) =>
                                    setNewGroupJoinableCheckboxChecked(
                                        !newGroupJoinableCheckboxChecked
                                    )
                                }
                            />
                            <p>{t('private')}</p>
                        </div>
                        <div className="flex w-full">
                            <button
                                className={
                                    'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                                }
                                onClick={handleCloseNewDialog}
                            >
                                <span>{t('common:cancel')}</span>
                            </button>
                            <button
                                className={
                                    'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                                }
                                onClick={(e) => {
                                    createNewGroup();
                                    handleCloseNewDialog();
                                }}
                            >
                                <span>{t('common:create')}</span>
                            </button>
                        </div>
                    </div>
                </Dialog>
            </div>
        </>
    );
}

function GroupsNoAuthPreview() {
    const { t } = useTranslation(['community', 'common']);
    const exampleGroups = [
        {
            name: t("common:no_auth.group_name1"),
            space_description: t("common:no_auth.group_description1"),
        },
        {
            name: t("common:no_auth.group_name2"),
        },
        {
            _id: '3',
            name: 'Group 3',
            space_description: 'Description of Group 3',
        },
    ];
    return (
        <div className="opacity-40">
            <CustomHead pageTitle={t('groups')} pageSlug={'groups'} />
            <div className="mt-12">
                <WhiteBox>
                    <VerticalTabs isNoAuthPreview={true}>
                        <div tabid="my_groups" tabname={t('my_groups')}>
                            <div className="min-h-[63vh]">
                                <BoxHeadline title={t('you_are_member_of_groups')} />
                                <div className="divide-y my-4">
                                    {exampleGroups.map((group, index) => (
                                        <div key={index} className="px-2 pt-5 pb-3 flex">
                                            <div className="flex-none">
                                                <AuthenticatedImage
                                                    imageId={'team-collab_sm.jpg'}
                                                    alt={t('group_picture')}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                    isNoAuthPreview={true}
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline title={group.name} />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {group.space_description
                                                        ? group.space_description
                                                        : t('no_description_available')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div tabid="find_new_groups" tabname={t('find_new_groups')}></div>
                        <div tabid="all_groups" tabname={t('common:all')}></div>
                        <div
                            tabid="requests_invitations"
                            tabname={t('my_requests_and_invitations')}
                        ></div>
                    </VerticalTabs>
                </WhiteBox>
            </div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white to-white pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
