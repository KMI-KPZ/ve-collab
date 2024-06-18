import LoadingAnimation from "@/components/LoadingAnimation";
import TimelinePost from "@/components/network/TimelinePost";
import { BackendPost } from "@/interfaces/api/apiInterfaces";
import { useGetAllGroups, useGetMyGroupACLEntry, useGetPost, useGetGroup, useIsGlobalAdmin } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { MdOutlineDeleteForever } from "react-icons/md";
import { GiSadCrab } from 'react-icons/gi';
import { Socket } from "socket.io-client";

/**
 * Single post view
 */

interface Props {
    socket: Socket;
}

Post.auth = true;
export default function Post({ socket }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { postId } = router.query
    const [deleted, setDeleted] = useState<boolean>(false)

    const {
        data: post,
        isLoading: isLoadingPost,
        error,
        mutate,
    } = useGetPost(
        session!.accessToken, postId as string)

    const { data: group } = useGetGroup(session!.accessToken, post?.space);
    const { data: allGroups } = useGetAllGroups(session!.accessToken)
    const { data: groupACLEntry } = useGetMyGroupACLEntry(session!.accessToken, post?.space)

    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken)

    const rePost = (post: BackendPost) => {
        if (post.space) {
            router.push(`/group/${post.space}?repost=${post._id}`)
        } else {
            router.push(`/?repost=${post._id}`)
        }
    }

    function userIsAdmin() {
        if (group) {
            return isGlobalAdmin || group.admins.includes(session?.user?.preferred_username as string);
        }
        return isGlobalAdmin;
    }

    const Wrapper = ({children}: {children: JSX.Element}) => {
        return (
            <div className="bg-slate-100">
            <div className="flex flex-col m-auto p-12 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">
                <div className="w-1/2">
                    {children}
                </div>
                </div>
            </div>
        )
    }

    const BackToStart = () => (
        <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
            <Link href="/">Zurück zur Startseite</Link>
        </button>
    )

    if (error) {
        console.error(error);
        return (
            <Wrapper>
                <div className="font-bold text-xl text-slate-900">Error loading post. See console for details</div>
            </Wrapper>
        )
    }

    if (isLoadingPost) { // || isLoading
        return (<Wrapper><LoadingAnimation /></Wrapper>)
    }

    if (deleted) {
        return (
            <Wrapper>
                <div className="flex items-center justify-center font-bold">
                    <MdOutlineDeleteForever size={50} />
                    <div className="text-xl text-slate-900">Beitrag gelöscht.</div>
                    <BackToStart />
                </div>
            </Wrapper>
        )
    }

    if (!post) {
        return (
            <Wrapper>
                <div className="flex flex-col items-center justify-center font-bold">
                    <div className="flex items-center">
                        <GiSadCrab size={60} className="m-4" />
                        <div className="text-xl text-slate-900">Dieser Beitrag wurde nicht gefunden.</div>
                    </div>
                    <BackToStart />
                </div>
            </Wrapper>
        )
    }

    return (
        <Wrapper>
             <TimelinePost
                socket={socket}
                post={post}
                allGroups={allGroups}
                groupACL={groupACLEntry}
                updatePost={() => {mutate()}}
                userIsAdmin={userIsAdmin()}
                removePost={() => {setDeleted(true)}}
                updatePinnedPosts={mutate}
                rePost={rePost}
                isLast={false}
                fetchNextPosts={() => {}}
            />
        </Wrapper>
    )
}