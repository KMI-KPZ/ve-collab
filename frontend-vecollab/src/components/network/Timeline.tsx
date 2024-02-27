import { useGetAllSpaces, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { useEffect, useState } from "react";
import TimelinePostForm from "./TimelinePostForm";
import { BackendPost } from "@/interfaces/api/apiInterfaces";

interface Props {
    space?: string | undefined;
}

Timeline.auth = true
export default function Timeline({ space }: Props) {
    const { data: session } = useSession();

    const [displayPosts, setDisplayPosts] = useState<BackendPost[]>([]);

    const [toDate, setToDate] = useState(new Date().toISOString());

    const now = new Date()
    const [fromDate] = useState( new Date(now.setFullYear( now.getFullYear() - 1 )).toISOString());
    // TODO fromDate is just a dummy until /timline/[space] supports the 'limit' parameter

    const {
        data: posts,
        isLoading: isLoadingTimeline,
        error,
        mutate,
    } = useGetTimeline(
        session!.accessToken,
        toDate,
        fromDate,
        10,
        space
    )
    console.log({posts, space});

    const {
        data: allSpaces,
        isLoading: isLoadingAllSpaces,
        error: errorAllSpaces,
        mutate: mutateAllSpaces,
    } = useGetAllSpaces(session!.accessToken);
    console.log({allSpaces});

    // useEffect(() => {
    //     if (!posts.length || !allSpaces.length) return;

    //     const postsFixed = posts.map(post => {
    //         if (post.space) {
    //             post.space = allSpaces.find(space => space._id == post.space)
    //         }
    //         return post
    //     })
    //     setDisplayPosts(postsFixed)
    //     // console.log({postsFixed});

    // }, [posts, allSpaces]);
    // console.log({displayPosts});

    const reloadTimeline = () => {
        return setToDate(new Date().toISOString())
    }

    if (isLoadingTimeline) {
        return (<><LoadingAnimation /></>)
    }

    if (error) {
        console.error(error);
        return (<>Error loading timeline. See console for details</>)
    }

    return (
        <>
            <div className={'p-4 my-8 bg-white rounded-3xl shadow-2xl '}>
                <TimelinePostForm onSubmitForm={reloadTimeline} space={space} />
            </div>
            {!posts.length ? ( <div className="m-10 flex justify-center">Bisher keine Beiträge ...</div>) : (<></>)}
            {posts.map((post, i) =>
                <TimelinePost key={i} post={post} spaces={allSpaces} reloadTimeline={reloadTimeline} />
            )}
        </>
    );
}