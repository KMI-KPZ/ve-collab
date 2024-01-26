import React from 'react';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import BoxHeadline from '@/components/BoxHeadline';
import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import Dialog from '@/components/profile/Dialog';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { fetchPOST, useGetAllSpaces, useGetMySpaces } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { RxDotsVertical } from 'react-icons/rx';

Spaces.auth = true;
export default function Spaces() {
    const { data: session, status } = useSession();
    const [searchSpaceInput, setSearchSpaceInput] = useState('');
    const [newSpaceInput, setNewSpaceInput] = useState('');
    const [newSpaceInvisibleCheckboxChecked, setNewSpaceInvisibleCheckboxChecked] = useState(false);
    const [newSpaceJoinableCheckboxChecked, setNewSpaceJoinableCheckboxChecked] = useState(false);
    const [numSearchResultsDummy, setNumSearchResultsDummy] = useState(0);

    const [isNewSpaceDialogOpen, setIsNewSpaceDialogOpen] = useState(false);

    const {
        data: mySpaces,
        isLoading: isLoadingMySpaces,
        error: errorMySpaces,
        mutate: mutateMySpaces,
    } = useGetMySpaces(session!.accessToken);
    console.log(mySpaces);
    const {
        data: allSpaces,
        isLoading: isLoadingAllSpaces,
        error: errorAllSpaces,
        mutate: mutateAllSpaces,
    } = useGetAllSpaces(session!.accessToken);

    const handleSearchSpaceInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchSpaceInput(event.target.value);
        setNumSearchResultsDummy(Math.random() * 10);
    };

    const handleCloseNewSpaceDialog = () => {
        setIsNewSpaceDialogOpen(false);
    };

    const createNewSpace = () => {
        fetchPOST(
            `/spaceadministration/create?name=${newSpaceInput}&invisible=${newSpaceInvisibleCheckboxChecked}&joinable=${!newSpaceJoinableCheckboxChecked}`,
            {},
            session!.accessToken
        );
        mutateMySpaces();
        mutateAllSpaces();
    };

    function sendJoinRequest(spaceName: string): void {
        fetchPOST(`/spaceadministration/join?name=${spaceName}`, {}, session!.accessToken).then(
            () => {
                mutateMySpaces();
                mutateAllSpaces();
            }
        );
    }

    return (
        <Container>
            <WhiteBox>
                <VerticalTabs>
                    <div tabname="meine Gruppen">
                        <div className="min-h-[50vh]">
                            <BoxHeadline title={'Du bist Mitglied in diesen Spaces'} />
                            <div className="divide-y my-4">
                                {mySpaces.map((space, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <Link
                                            href={`/space?name=${space.name}`}
                                            className="flex cursor-pointer"
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={space.space_pic}
                                                    alt={'Gruppenbild'}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline title={space.name} />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {space.space_description
                                                        ? space.space_description
                                                        : 'Keine Beschreibung vorhanden'}
                                                </div>
                                            </div>
                                            <div className="flex ml-auto px-2 items-center justify-center">
                                                <button>
                                                    <RxDotsVertical size={25} />
                                                </button>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div tabname="neue finden">
                        <div className="min-h-[60vh]">
                            <div className="h-[50vh] overflow-y-auto content-scrollbar">
                                <input
                                    className={
                                        'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-11/12'
                                    }
                                    type="text"
                                    placeholder={
                                        'Suche nach Spaces, z.B. nach dem Namen oder der Beschreibung'
                                    }
                                    value={searchSpaceInput}
                                    onChange={handleSearchSpaceInput}
                                />
                                {Array.from({ length: numSearchResultsDummy }, (_, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <div className="flex cursor-pointer">
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={'default_group_pic.jpg'}
                                                    alt={'Profilbild'}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline title={'Lorem ipsum Gruppe'} />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {'Lorem ipsum Beschreibung'}
                                                </div>
                                            </div>
                                            <div className="flex ml-auto px-2 items-center justify-center">
                                                <div className="flex items-center">
                                                    {index % 3 === 0 && (
                                                        <button
                                                            className={
                                                                'h-10 bg-ve-collab-orange text-white px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                        >
                                                            <span>Beitreten</span>
                                                        </button>
                                                    )}
                                                    {index % 3 === 1 && (
                                                        <button
                                                            className={
                                                                'h-10 bg-transparent border border-ve-collab-orange text-ve-collab-orange  px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                        >
                                                            <span>Beitritt anfragen</span>
                                                        </button>
                                                    )}
                                                    {index % 3 === 2 && (
                                                        <button
                                                            disabled
                                                            className={
                                                                'h-10 bg-transparent border border-ve-collab-orange/50 text-ve-collab-orange/50 cursor-not-allowed px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                        >
                                                            <span>angefragt</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="my-4">
                                <BoxHeadline title={'Nichts passendes dabei?'} />
                                <button
                                    className={
                                        'h-10 bg-ve-collab-orange text-white px-4 mx-2 my-2 rounded-lg shadow-xl'
                                    }
                                    onClick={() => setIsNewSpaceDialogOpen(true)}
                                >
                                    <span>neuen Space erstellen</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div tabname="alle">
                        <div className="min-h-[60vh]">
                            <div className="h-[50vh] overflow-y-auto content-scrollbar">
                                {allSpaces.map((space, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <Link
                                            href={`/space?name=${space.name}`}
                                            className="flex cursor-pointer"
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={space.space_pic}
                                                    alt={'Gruppenbild'}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline title={space.name} />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {space.space_description
                                                        ? space.space_description
                                                        : 'Keine Beschreibung vorhanden'}
                                                </div>
                                            </div>
                                            <div className="flex ml-auto px-2 items-center justify-center">
                                                <div className="flex items-center">
                                                    {/* if user is already member (or admin), no button is rendered */}
                                                    {!(
                                                        space.members.includes(
                                                            session!.user.preferred_username!
                                                        ) ||
                                                        space.admins.includes(
                                                            session!.user.preferred_username!
                                                        )
                                                    ) &&
                                                        // if space is joinable, render join button
                                                        (space.joinable ? (
                                                            <button
                                                                className={
                                                                    'h-10 bg-ve-collab-orange text-white px-4 mx-2 rounded-lg shadow-xl'
                                                                }
                                                            >
                                                                <span>Beitreten</span>
                                                            </button>
                                                        ) : // if space is not joinable and user has already requested to join, render disabled "already requested" button
                                                        space.requests.includes(
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
                                                            // if space is not joinable and user has not already requested to join, render request button
                                                            <button
                                                                className={
                                                                    'h-10 bg-transparent border border-ve-collab-orange text-ve-collab-orange  px-4 mx-2 rounded-lg shadow-xl'
                                                                }
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    sendJoinRequest(space.name);
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
                                    onClick={() => setIsNewSpaceDialogOpen(true)}
                                >
                                    <span>neuen Space erstellen</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </VerticalTabs>
            </WhiteBox>
            <Dialog
                isOpen={isNewSpaceDialogOpen}
                title={'neuen Space erstellen'}
                onClose={handleCloseNewSpaceDialog}
            >
                <div className="w-[25vw] h-[30vh] relative">
                    <div>Name:</div>
                    <input
                        className={'border border-gray-500 rounded-lg px-2 py-1 my-2 w-full'}
                        type="text"
                        placeholder={'Namen eingeben'}
                        value={newSpaceInput}
                        onChange={(e) => setNewSpaceInput(e.target.value)}
                    />
                    <div className="flex my-2">
                        <input
                            type="checkbox"
                            className="mr-2"
                            checked={newSpaceInvisibleCheckboxChecked}
                            onChange={(e) =>
                                setNewSpaceInvisibleCheckboxChecked(
                                    !newSpaceInvisibleCheckboxChecked
                                )
                            }
                        />
                        <p>unsichtbar</p>
                    </div>
                    <div className="flex my-2">
                        <input
                            type="checkbox"
                            className="mr-2"
                            checked={newSpaceJoinableCheckboxChecked}
                            onChange={(e) =>
                                setNewSpaceJoinableCheckboxChecked(!newSpaceJoinableCheckboxChecked)
                            }
                        />
                        <p>privat</p>
                    </div>
                    <div className="flex absolute bottom-0 w-full">
                        <button
                            className={
                                'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                            }
                            onClick={handleCloseNewSpaceDialog}
                        >
                            <span>Abbrechen</span>
                        </button>
                        <button
                            className={
                                'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                createNewSpace();
                                handleCloseNewSpaceDialog();
                            }}
                        >
                            <span>Erstellen</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </Container>
    );
}
