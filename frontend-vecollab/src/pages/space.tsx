import { AuthenticatedFile } from '@/components/AuthenticatedFile';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import BoxHeadline from '@/components/BoxHeadline';
import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SpaceAccessDenied } from '@/components/network/SpaceAccessDenied';
import GroupBanner from '@/components/network/GroupBanner';
import GroupHeader from '@/components/network/GroupHeader';
import Dialog from '@/components/profile/Dialog';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST, useGetMySpaceACLEntry, useGetSpace } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { RxCross2, RxFile, RxPlus } from 'react-icons/rx';

Space.auth = true;
export default function Space() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [renderPicker, setRenderPicker] = useState<'timeline' | 'members' | 'files'>('timeline');

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<Blob>();

    const [memberSnippets, setMemberSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    // TODO use conditional fetching with the swr hook to wait for the router to be ready, 
    // because sometimes when the router is not yet ready, but the hook fires
    // an additional request with undefined id is made
    const {
        data: space,
        isLoading,
        error,
        mutate,
    } = useGetSpace(session!.accessToken, router.query.id as string);
    console.log(space);
    console.log(memberSnippets);

    // TODO use conditional fetching with the swr hook to wait for the router to be ready, 
    // because sometimes when the router is not yet ready, but the hook fires
    // an additional request with undefined id is made
    const { data: spaceACLEntry, isLoading: spaceACLEntryLoading } = useGetMySpaceACLEntry(
        session!.accessToken,
        router.query.id as string
    );
    console.log(spaceACLEntry);

    const handleCloseUploadDialog = () => {
        setIsUploadDialogOpen(false);
    };

    const uploadToClient = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setUploadFile(event.target.files[0]);
        }
    };

    const uploadToBackend = async () => {
        // allow max 5 MB
        if (uploadFile!.size > 5242880) {
            alert('max. 5 MB erlaubt');
            return;
        }

        const body = new FormData();
        body.append('file', uploadFile!);

        const headers: { Authorization?: string } = {};
        headers['Authorization'] = 'Bearer ' + session!.accessToken;

        // upload as form data instead of json
        const response = await fetch(
            process.env.NEXT_PUBLIC_BACKEND_BASE_URL +
                `/spaceadministration/put_file?id=${space._id}`,
            {
                method: 'POST',
                headers: headers,
                body,
            }
        );

        const responseJson = await response.json();
        console.log(responseJson);

        mutate();
        setUploadFile(undefined);
        handleCloseUploadDialog();
    };

    useEffect(() => {
        if (isLoading) {
            return;
        }
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
            }
        );
    }, [space, isLoading, session]);

    console.log(space);

    function files() {
        return (
            <>
                <WhiteBox className="relative">
                    {spaceACLEntryLoading ? (
                        <LoadingAnimation />
                    ) : (
                        <>
                            <BoxHeadline title={'Dateiablage'} />
                            <div className="absolute top-0 right-0 mx-2 p-4">
                                <button
                                    className={
                                        'bg-ve-collab-orange text-white rounded-lg p-1 flex justify-center items-center ' +
                                        (!spaceACLEntry?.write_files
                                            ? 'opacity-50 cursor-not-allowed'
                                            : '')
                                    }
                                    disabled={!spaceACLEntry?.write_files}
                                    onClick={() => {
                                        setIsUploadDialogOpen(true);
                                    }}
                                >
                                    <RxPlus />
                                    <span className="mx-1">Hochladen</span>
                                </button>
                            </div>
                            <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                            <div className="mb-8 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                                {spaceACLEntry.read_files ? (
                                    <>
                                        {space.files.map((file, index) => (
                                            <AuthenticatedFile
                                                key={index}
                                                url={`/uploads/${file.file_id}`}
                                                filename={file.file_name}
                                            >
                                                <div className="flex justify-center">
                                                    <RxFile size={80} />{' '}
                                                    {/* TODO preview for certain file types*/}
                                                </div>
                                                <div className="max-w-[150px] justify-center mx-2 px-1 my-1 font-bold text-slate-900 text-lg text-center truncate">
                                                    {file.file_name}
                                                </div>
                                            </AuthenticatedFile>
                                        ))}
                                    </>
                                ) : (
                                    <div className="mx-4 text-gray-600">
                                        keine Berechtigung, um die Dateiablage zu sehen
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </WhiteBox>
                <Dialog
                    isOpen={isUploadDialogOpen}
                    title={'Datei hochladen'}
                    onClose={handleCloseUploadDialog}
                >
                    <div className="w-[30rem] flex items-center">
                        <input type="file" onChange={uploadToClient} />
                        <button
                            className={
                                'bg-ve-collab-orange border text-white mx-auto py-2 px-5 rounded-lg shadow-xl ' +
                                (uploadFile === undefined ? 'opacity-50 cursor-not-allowed' : '')
                            }
                            onClick={uploadToBackend}
                            disabled={!uploadFile}
                        >
                            <span>Hochladen</span>
                        </button>
                    </div>
                </Dialog>
            </>
        );
    }

    function members() {
        return (
            <WhiteBox>
                <BoxHeadline title={'Admins'} />
                <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                <div className="mb-8 flex flex-wrap max-h-72 overflow-y-auto content-scrollbar">
                    {space.admins.map((admin, index) => (
                        <div
                            key={index}
                            className="mx-6 my-1 cursor-pointer"
                            onClick={() => router.push(`/profile?username=${admin}`)}
                        >
                            <div className="flex justify-center">
                                <AuthenticatedImage
                                    imageId={
                                        memberSnippets.find(
                                            (snippet) => snippet.preferredUsername === admin
                                        )!.profilePicUrl
                                    }
                                    alt={'Profilbild'}
                                    width={100}
                                    height={100}
                                    className="rounded-full"
                                ></AuthenticatedImage>
                            </div>
                            <BoxHeadline
                                title={
                                    memberSnippets.find(
                                        (snippet) => snippet.preferredUsername === admin
                                    )!.name
                                }
                            />
                        </div>
                    ))}
                </div>
                <BoxHeadline title={'Mitglieder'} />
                <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                <div className="flex flex-wrap max-h-72 overflow-y-auto content-scrollbar">
                    {space.members
                        .filter((member) => !space.admins.includes(member))
                        .map((member, index) => (
                            <div
                                key={index}
                                className="mx-6 my-1 cursor-pointer"
                                onClick={() => router.push(`/profile?username=${member}`)}
                            >
                                <div className="flex justify-center">
                                    <AuthenticatedImage
                                        imageId={
                                            memberSnippets.find(
                                                (snippet) => snippet.preferredUsername === member
                                            )!.profilePicUrl
                                        }
                                        alt={'Profilbild'}
                                        width={100}
                                        height={100}
                                        className="rounded-full"
                                    ></AuthenticatedImage>
                                </div>
                                <BoxHeadline
                                    title={
                                        memberSnippets.find(
                                            (snippet) => snippet.preferredUsername === member
                                        )!.name
                                    }
                                />
                            </div>
                        ))}
                </div>
            </WhiteBox>
        );
    }

    function timeline() {
        return <div>Timeline</div>;
    }

    // can only be called after space hook is loaded
    function userIsMember() {
        return space.members.includes(session?.user?.preferred_username as string);
    }

    // can only be called after space hook is loaded
    function userIsAdmin() {
        return space.admins.includes(session?.user?.preferred_username as string);
    }

    return (
        <Container>
            {isLoading ? (
                <LoadingAnimation />
            ) : (
                <>
                    {!(userIsMember() || userIsAdmin()) ? (
                        <SpaceAccessDenied />
                    ) : (
                        <>
                            <GroupBanner userIsAdmin={userIsAdmin} />
                            <div className={'mx-20 mb-2 px-5 relative -mt-16'}>
                                <GroupHeader userIsAdmin={userIsAdmin} />
                            </div>
                            <Container>
                                <div className={'mx-20 flex'}>
                                    <div className={'w-3/4  mr-4'}>
                                        {(() => {
                                            switch (renderPicker) {
                                                case 'timeline':
                                                    return timeline();
                                                case 'members':
                                                    return members();
                                                case 'files':
                                                    return files();

                                                default:
                                                    return <div></div>;
                                            }
                                        })()}
                                    </div>
                                    <div className={'w-1/4  ml-4'}>
                                        <button
                                            className={
                                                'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow-xl ' +
                                                (renderPicker === 'timeline'
                                                    ? 'bg-ve-collab-blue text-white'
                                                    : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                                            }
                                            onClick={() => setRenderPicker('timeline')}
                                        >
                                            <span>Dashboard</span>
                                        </button>
                                        <button
                                            className={
                                                'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow-xl ' +
                                                (renderPicker === 'members'
                                                    ? 'bg-ve-collab-blue text-white'
                                                    : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                                            }
                                            onClick={() => setRenderPicker('members')}
                                        >
                                            <span>Mitglieder</span>
                                        </button>
                                        <button
                                            className={
                                                'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow-xl ' +
                                                (renderPicker === 'files'
                                                    ? 'bg-ve-collab-blue text-white'
                                                    : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                                            }
                                            onClick={() => setRenderPicker('files')}
                                        >
                                            <span>Dateiablage</span>
                                        </button>
                                        <WhiteBox>
                                            <BoxHeadline title={'Beschreibung'} />
                                            <div className="min-h-[20vh] mx-2 my-4 px-1">
                                                <div className={'text-gray-500'}>
                                                    {space?.space_description
                                                        ? space.space_description
                                                        : 'Keine Beschreibung vorhanden.'}
                                                </div>
                                            </div>
                                        </WhiteBox>
                                    </div>
                                </div>
                            </Container>
                        </>
                    )}
                </>
            )}
        </Container>
    );
}
