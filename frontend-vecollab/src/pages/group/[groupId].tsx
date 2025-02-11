import { AuthenticatedFile } from '@/components/common/AuthenticatedFile';
import BoxHeadline from '@/components/common/BoxHeadline';
import WhiteBox from '@/components/common/WhiteBox';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { AccessDenied } from '@/components/network/AccessDenied';
import GroupBanner from '@/components/network/GroupBanner';
import GroupHeader from '@/components/network/GroupHeader';
import Dialog from '@/components/profile/Dialog';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST, useGetMyGroupACLEntry, useGetGroup, useIsGlobalAdmin } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { RxFile, RxPlus } from 'react-icons/rx';
import Timeline from '@/components/network/Timeline';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';
import UserProfileImage from '@/components/network/UserProfileImage';

interface Props {
    socket: Socket;
}

Group.auth = true;
Group.autoForward = true;
export default function Group({ socket }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const router = useRouter();

    const { groupId } = router.query;

    const [renderPicker, setRenderPicker] = useState<'timeline' | 'members' | 'files'>('timeline');

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<Blob>();

    const [memberSnippets, setMemberSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken);

    // TODO use conditional fetching with the swr hook to wait for the router to be ready,
    // because sometimes when the router is not yet ready, but the hook fires
    // an additional request with undefined id is made
    const {
        data: group,
        isLoading,
        error,
        mutate,
    } = useGetGroup(session!.accessToken, groupId as string);

    // TODO use conditional fetching with the swr hook to wait for the router to be ready,
    // because sometimes when the router is not yet ready, but the hook fires
    // an additional request with undefined id is made
    const { data: groupACLEntry, isLoading: groupACLEntryLoading } = useGetMyGroupACLEntry(
        session!.accessToken,
        groupId as string
    );

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
            alert(t('max_5_mb'));
            return;
        }

        const body = new FormData();
        body.append('file', uploadFile!);

        const headers: { Authorization?: string } = {};
        headers['Authorization'] = 'Bearer ' + session!.accessToken;

        // upload as form data instead of json
        const response = await fetch(
            process.env.NEXT_PUBLIC_BACKEND_BASE_URL +
                `/spaceadministration/put_file?id=${group._id}`,
            {
                method: 'POST',
                headers: headers,
                body,
            }
        );

        const responseJson = await response.json();

        mutate();
        setUploadFile(undefined);
        handleCloseUploadDialog();
    };

    useEffect(() => {
        if (isLoading) {
            return;
        }
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
            }
        );
    }, [group, isLoading, session]);

    function files() {
        return (
            <>
                <WhiteBox className="relative">
                    {groupACLEntryLoading ? (
                        <LoadingAnimation />
                    ) : (
                        <>
                            <BoxHeadline title={t('fileshare')} />
                            <div className="absolute top-0 right-0 mx-2 p-4">
                                <button
                                    className={
                                        'bg-ve-collab-orange text-white rounded-lg p-1 flex justify-center items-center ' +
                                        (!groupACLEntry?.write_files
                                            ? 'opacity-50 cursor-not-allowed'
                                            : '')
                                    }
                                    disabled={!groupACLEntry?.write_files}
                                    onClick={() => {
                                        setIsUploadDialogOpen(true);
                                    }}
                                >
                                    <RxPlus />
                                    <span className="mx-1">{t('upload')}</span>
                                </button>
                            </div>
                            <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                            <div className="mb-8 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                                {groupACLEntry.read_files ? (
                                    <>
                                        {group.files.map((file, index) => (
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
                                        {t('fileshare_insufficient_permissions')}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </WhiteBox>
                <Dialog
                    isOpen={isUploadDialogOpen}
                    title={t('upload_file')}
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
                            <span>{t('upload')}</span>
                        </button>
                    </div>
                </Dialog>
            </>
        );
    }

    function members() {
        return (
            <WhiteBox>
                <BoxHeadline title={t('admins')} />
                <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                <div className="mb-8 flex flex-wrap max-h-72 overflow-y-auto content-scrollbar">
                    {group.admins.map((admin, index) => (
                        <div
                            key={index}
                            className="mx-6 my-1 cursor-pointer"
                            onClick={() => router.push(`/profile/user/${admin}`)}
                        >
                            <div className="flex justify-center">
                                <UserProfileImage
                                    profile_pic={
                                        memberSnippets.find(
                                            (snippet) => snippet.preferredUsername === admin
                                        )!.profilePicUrl
                                    }
                                    chosen_achievement={
                                        memberSnippets.find(
                                            (snippet) => snippet.preferredUsername === admin
                                        )!.chosen_achievement
                                    }
                                    width={100}
                                    height={100}
                                />
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
                <BoxHeadline title={t('members')} />
                <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                <div className="flex flex-wrap max-h-72 overflow-y-auto content-scrollbar">
                    {group.members
                        .filter((member) => !group.admins.includes(member))
                        .map((member, index) => (
                            <div
                                key={index}
                                className="mx-6 my-1 cursor-pointer"
                                onClick={() => router.push(`/profile/user/${member}`)}
                            >
                                <div className="flex justify-center">
                                    <UserProfileImage
                                        profile_pic={
                                            memberSnippets.find(
                                                (snippet) => snippet.preferredUsername === member
                                            )!.profilePicUrl
                                        }
                                        chosen_achievement={
                                            memberSnippets.find(
                                                (snippet) => snippet.preferredUsername === member
                                            )!.chosen_achievement
                                        }
                                        width={100}
                                        height={100}
                                    />
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

    // can only be called after group hook is loaded
    function userIsMember() {
        return group.members.includes(session?.user?.preferred_username as string);
    }

    // can only be called after group hook is loaded
    function userIsAdmin() {
        return isGlobalAdmin || group.admins.includes(session?.user?.preferred_username as string);
    }

    if (isLoading) return <LoadingAnimation />;

    if (!(userIsMember() || userIsAdmin()))
        return (
            <>
                <CustomHead pageTitle={t('groups')} pageSlug={`group/${groupId}`} />
                <AccessDenied />
            </>
        );

    return (
        <>
            <CustomHead pageTitle={t('groups')} pageSlug={`group/${groupId}`} />

            <GroupBanner userIsAdmin={userIsAdmin} />
            <div className={'md:mx-20 mb-2 px-5 pt-[100px] relative'}>
                <GroupHeader userIsAdmin={userIsAdmin} />
            </div>
            <div className={'md:mx-20 flex flex-wrap flex-wrap-reverse'}>
                <div className={'w-full md:w-3/4 md:pr-4'}>
                    {(() => {
                        switch (renderPicker) {
                            case 'timeline':
                                return (
                                    <Timeline
                                        socket={socket}
                                        group={group._id}
                                        userIsAdmin={userIsAdmin()}
                                        groupACL={groupACLEntry}
                                    />
                                );
                            case 'members':
                                return members();
                            case 'files':
                                return files();

                            default:
                                return <div></div>;
                        }
                    })()}
                </div>
                <div className={'w-full md:w-1/4 lg:pl-4'}>
                    <button
                        className={
                            'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow ' +
                            (renderPicker === 'timeline'
                                ? 'bg-ve-collab-blue text-white'
                                : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                        }
                        onClick={() => setRenderPicker('timeline')}
                    >
                        <span>{t('dashboard')}</span>
                    </button>
                    <button
                        className={
                            'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow ' +
                            (renderPicker === 'members'
                                ? 'bg-ve-collab-blue text-white'
                                : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                        }
                        onClick={() => setRenderPicker('members')}
                    >
                        <span>{t('members')}</span>
                    </button>
                    <button
                        className={
                            'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow ' +
                            (renderPicker === 'files'
                                ? 'bg-ve-collab-blue text-white'
                                : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                        }
                        onClick={() => setRenderPicker('files')}
                    >
                        <span>{t('fileshare')}</span>
                    </button>
                    <WhiteBox>
                        <BoxHeadline title={t('description')} />
                        <div className="min-h-[20vh] mx-2 my-4 px-1">
                            <div className={'text-gray-500'}>
                                {group?.space_description
                                    ? group.space_description
                                    : t('no_description_available')}
                            </div>
                        </div>
                    </WhiteBox>
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
