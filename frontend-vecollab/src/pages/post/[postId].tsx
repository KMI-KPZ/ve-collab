import LoadingAnimation from '@/components/common/LoadingAnimation';
import TimelinePost from '@/components/network/TimelinePost';
import { BackendPost } from '@/interfaces/api/apiInterfaces';
import {
    useGetAllGroups,
    useGetMyGroupACLEntry,
    useGetPost,
    useGetGroup,
    useIsGlobalAdmin,
} from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { MdOutlineDeleteForever } from 'react-icons/md';
import { GiSadCrab } from 'react-icons/gi';
import { Socket } from 'socket.io-client';
import GeneralError from '@/components/common/GeneralError';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSidePropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import { useTranslation } from 'next-i18next';
import Custom404 from '../404';

/**
 * Single post view
 */

interface Props {
    socket: Socket;
}

Post.auth = true;
Post.autoForward = true;
export default function Post({ socket }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { postId } = router.query;
    const [deleted, setDeleted] = useState<boolean>(false);
    const { t } = useTranslation(['community', 'common']);

    const {
        data: post,
        isLoading: isLoadingPost,
        error,
        mutate,
    } = useGetPost(session!.accessToken, postId as string);

    const { data: group } = useGetGroup(session!.accessToken, post?.space);
    const { data: allGroups } = useGetAllGroups(session!.accessToken);
    const { data: groupACLEntry } = useGetMyGroupACLEntry(session!.accessToken, post?.space);

    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken);

    const rePost = (post: BackendPost) => {
        if (post.space) {
            router.push(`/group/${post.space}?repost=${post._id}`);
        } else {
            router.push(`/?repost=${post._id}`);
        }
    };

    function userIsAdmin() {
        if (group) {
            return (
                isGlobalAdmin || group.admins.includes(session?.user?.preferred_username as string)
            );
        }
        return isGlobalAdmin;
    }

    const Wrapper = ({ children }: { children: JSX.Element }) => {
        return <div className="m-auto p-12 items-center w-1/2">{children}</div>;
    };

    const BackToStart = () => (
        <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
            <Link href="/">{t('common:back_to_start')}</Link>
        </button>
    );

    if (error) {
        console.error({ error });
        return (
            <Wrapper>
                <GeneralError />
            </Wrapper>
        );
    }

    if (isLoadingPost) {
        // || isLoading
        return (
            <Wrapper>
                <LoadingAnimation />
            </Wrapper>
        );
    }

    if (deleted) {
        return (
            <Wrapper>
                <div className="flex items-center justify-center font-bold">
                    <MdOutlineDeleteForever size={50} />
                    <div className="text-xl text-slate-900">{t('post_deleted')}</div>
                    <BackToStart />
                </div>
            </Wrapper>
        );
    }

    if (!post) {
        return <Custom404 />;
    }

    return (
        <>
            <CustomHead pageTitle={t('community:post')} pageSlug={`post/${postId}`} />
            <Wrapper>
                <TimelinePost
                    socket={socket}
                    post={post}
                    allGroups={allGroups}
                    groupACL={groupACLEntry}
                    updatePost={() => {
                        mutate();
                    }}
                    userIsAdmin={userIsAdmin()}
                    removePost={() => {
                        setDeleted(true);
                    }}
                    updatePinnedPosts={mutate}
                    rePost={rePost}
                    isLast={false}
                    fetchNextPosts={() => {}}
                />
            </Wrapper>
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['community', 'common'])),
        },
    };
}
