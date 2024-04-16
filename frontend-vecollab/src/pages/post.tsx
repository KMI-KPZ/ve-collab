import LoadingAnimation from "@/components/LoadingAnimation";
import TimelinePost from "@/components/network/TimelinePost";
import { BackendPost, BackendSpace } from "@/interfaces/api/apiInterfaces";
import { fetchGET, useGetPost, useGetSpace, useIsGlobalAdmin } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MdOutlineDeleteForever } from "react-icons/md";
import { GiSadCrab } from 'react-icons/gi';

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

    // TODO wait for space?!
    // const {
    //     data: space,
    //     isLoading: isLoadingSpace,
    //     error: errorLoadingSpace,
    //     mutate: mutateSpace,
    // } = useGetSpace(session!.accessToken, post?.space);

    useEffect(() => {
        if (isLoading || !post?.space) return

        fetchGET(`/spaceadministration/info?id=${post.space}`, session!.accessToken)
        .then(data => {
            setSpace(data.space)
            setIsLoadingSpace(false)
        })
    }, [post, isLoading, session])

    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken)

    const rePost = (post: BackendPost) => {
        if (post.space) {
            router.push(`/space?id=${post.space}&repost=${post._id}`)
        } else {
            router.push(`/?repost=${post._id}`)
        }
    }

    function userIsAdmin() {
        if (space) {
            return isGlobalAdmin || space.admins.includes(session?.user?.preferred_username as string);
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

    if (isLoading) {
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