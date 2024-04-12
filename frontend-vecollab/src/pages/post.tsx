import LoadingAnimation from "@/components/LoadingAnimation";
import TimelinePost from "@/components/network/TimelinePost";
import { BackendPost, BackendSpace } from "@/interfaces/api/apiInterfaces";
import { fetchGET, useGetPost, useGetSpace, useIsGlobalAdmin } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

Post.auth = true;
export default function Post() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [space, setSpace] = useState<BackendSpace>()
    const [isLoadingSpace, setIsLoadingSpace] = useState<boolean>(true)
    const [deleted, setDeleted] = useState<boolean>(false)

    const {
        data: post,
        isLoading,
        error,
        mutate,
    } = useGetPost(
        session!.accessToken, router.query.id as string)

    console.log('post', {post});

    // TODO wait for space?!
    // const {
    //     data: space,
    //     isLoading: isLoadingSpace,
    //     error: errorLoadingSpace,
    //     mutate: mutateSpace,
    // } = useGetSpace(session!.accessToken, post?.space);

    useEffect(() => {
        if (isLoading || !post) return

        fetchGET(`/spaceadministration/info?id=${post.space}`, session!.accessToken)
        .then(data => {
            setSpace(data.space)
            setIsLoadingSpace(false)
        })
    }, [post])
    console.log('space', space);

    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken)


    const rePost = (post: BackendPost) => {
        console.log('TODO: forward to timeline (may in space) with repost', post);

        if (post.space) {
            router.push(`/space?id=${post.space}&repost=${post._id}`)
        } else {
            router.push(`/?repost=${post._id}`)
        }
    }

    function userIsAdmin() {
        return isGlobalAdmin || space!.admins.includes(session?.user?.preferred_username as string);
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

    if (error) {
        console.error(error);
        return (<Wrapper><>Error loading post. See console for details</></Wrapper>)
    }

    if (isLoading || isLoadingSpace) {
        return (<Wrapper><LoadingAnimation /></Wrapper>)
    }

    if (deleted) {
        return (<Wrapper><>Post deleted</></Wrapper>)
    }

    if (!post) {
        return (<Wrapper><>Post not found</></Wrapper>)
    }

    return (
        <Wrapper>
             <TimelinePost
                post={post}
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