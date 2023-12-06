import AuthenticatedImage from '@/components/AuthenticatedImage';
import BoxHeadline from '@/components/BoxHeadline';
import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import GroupBanner from '@/components/network/GroupBanner';
import GroupHeader from '@/components/network/GroupHeader';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST, useGetSpace } from '@/lib/backend';
import { is } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

Space.auth = true;
export default function Space() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [renderPicker, setRenderPicker] = useState<'timeline' | 'members' | 'files'>('timeline');

    const [memberSnippets, setMemberSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const {
        data: space,
        isLoading,
        error,
        mutate,
    } = useGetSpace(session!.accessToken, router.query.name as string);
    console.log(space);
    console.log(memberSnippets);

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
    }, [space, isLoading]);

    function files() {
        return <div>Dateiablage</div>;
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

    return (
        <Container>
            <GroupBanner />
            <div className={'mx-20 mb-2 px-5 relative -mt-16 z-10'}>
                <GroupHeader />
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
                            <div className="min-h-[20vh] mx-2 my-1">
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
        </Container>
    );
}
