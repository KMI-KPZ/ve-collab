import React from 'react';
import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import BoxHeadline from '@/components/common/BoxHeadline';
import WhiteBox from '@/components/common/WhiteBox';
import Dialog from '@/components/profile/Dialog';
import VerticalTabs from '@/components/profile/VerticalTabs';
import {
    fetchGET,
    fetchPOST,
    useGetAllGroups,
    useGetMyGroupInvites,
    useGetMyGroupRequests,
    useGetMyGroups,
} from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { RxDotsVertical } from 'react-icons/rx';
import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

Groups.auth = true;
export default function Groups() {
    const { data: session, status } = useSession();
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
        <div className="mt-12">
            <WhiteBox>
                <VerticalTabs>
                    <div tabname="meine Gruppen">
                        <div className="min-h-[63vh]">
                            <BoxHeadline title={'Du bist Mitglied in diesen Gruppen'} />
                            <div className="divide-y my-4">
                                {myGroups.map((group, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <Link
                                            href={`/group/${group._id}`}
                                            className="flex cursor-pointer"
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={group.space_pic}
                                                    alt={'Gruppenbild'}
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
                                                        : 'Keine Beschreibung vorhanden'}
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
                    <div tabname="neue finden">
                        <div className="min-h-[63vh]">
                            <div className="h-[50vh] overflow-y-auto content-scrollbar">
                                <input
                                    className={
                                        'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-11/12'
                                    }
                                    type="text"
                                    placeholder={
                                        'Suche nach Gruppen, z.B. nach dem Namen oder der Beschreibung'
                                    }
                                    value={searchInput}
                                    onChange={handleSearchInput}
                                />
                                {searchInput && searchResults.length === 0 ? (
                                    <div className="px-2 py-5">
                                        <div className="mx-2 px-1 my-1 text-gray-600">
                                            leider keine Ergebnisse gefunden
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {searchResults.map((group, index) => (
                                            <div key={index} className="px-2 py-5">
                                                <div className="flex cursor-pointer">
                                                    <div>
                                                        <AuthenticatedImage
                                                            imageId={group.space_pic}
                                                            alt={'Profilbild'}
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
                                                                : 'keine Beschreibung vorhanden'}
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
                                                                        <span>Beitreten</span>
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
                                                                        <span>angefragt</span>
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
                                                                            Beitritt anfragen
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
                            <div className="my-4">
                                <BoxHeadline title={'Nichts passendes dabei?'} />
                                <button
                                    className={
                                        'h-10 bg-ve-collab-orange text-white px-4 mx-2 my-2 rounded-lg shadow-xl'
                                    }
                                    onClick={() => setIsNewDialogOpen(true)}
                                >
                                    <span>neue Gruppe erstellen</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div tabname="alle">
                        <div className="min-h-[63vh]">
                            <div className="h-[50vh] overflow-y-auto content-scrollbar">
                                {allGroups.map((group, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <Link
                                            href={`/group/${group._id}`}
                                            className="flex cursor-pointer"
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={group.space_pic}
                                                    alt={'Gruppenbild'}
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
                                                        : 'Keine Beschreibung vorhanden'}
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
                                                                <span>Beitreten</span>
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
                                                                <span>angefragt</span>
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
                                                                <span>Beitritt anfragen</span>
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                            <div className="my-4">
                                <BoxHeadline title={'Nichts passendes dabei?'} />
                                <button
                                    className={
                                        'h-10 bg-ve-collab-orange text-white px-4 mx-2 my-2 rounded-lg shadow-xl'
                                    }
                                    onClick={() => setIsNewDialogOpen(true)}
                                >
                                    <span>neue Gruppe erstellen</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div tabname="meine Anfragen & Einladungen">
                        <div className="min-h-[63vh]">
                            <BoxHeadline title={'ausstehende Einladungen'} />
                            <div className="h-[25vh] mb-10 overflow-y-auto content-scrollbar">
                                {myGroupInvites.map((group, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <Link
                                            href={`/group/${group._id}`}
                                            className="flex cursor-pointer"
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={group.space_pic}
                                                    alt={'Gruppenbild'}
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
                                                        : 'Keine Beschreibung vorhanden'}
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
                                                        <span>Annehmen</span>
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
                                                        <span>Ablehnen</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                            <BoxHeadline title={'ausstehende Anfragen'} />
                            <div className="h-[25vh] overflow-y-auto content-scrollbar">
                                {myGroupRequests.map((group, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <Link
                                            href={`/group/${group._id}`}
                                            className="flex cursor-pointer"
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={group.space_pic}
                                                    alt={'Gruppenbild'}
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
                                                        : 'Keine Beschreibung vorhanden'}
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
                                                        <span>Anfrage zurückziehen</span>
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
                title={'neue Gruppe erstellen'}
                onClose={handleCloseNewDialog}
            >
                <div className="w-[25vw] h-[30vh] relative">
                    <div>Name:</div>
                    <input
                        className={'border border-gray-500 rounded-lg px-2 py-1 my-2 w-full'}
                        type="text"
                        placeholder={'Namen eingeben'}
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
                        <p>unsichtbar</p>
                    </div>
                    <div className="flex my-2">
                        <input
                            type="checkbox"
                            className="mr-2"
                            checked={newGroupJoinableCheckboxChecked}
                            onChange={(e) =>
                                setNewGroupJoinableCheckboxChecked(!newGroupJoinableCheckboxChecked)
                            }
                        />
                        <p>privat</p>
                    </div>
                    <div className="flex absolute bottom-0 w-full">
                        <button
                            className={
                                'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                            }
                            onClick={handleCloseNewDialog}
                        >
                            <span>Abbrechen</span>
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
                            <span>Erstellen</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
