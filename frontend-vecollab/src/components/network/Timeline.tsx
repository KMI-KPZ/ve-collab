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
    const [toDate, setToDate] = useState<Date>(new Date());
    const [sharedPost, setSharedPost] = useState<BackendPost|null>(null);
    const [allPosts, setAllPosts] = useState<BackendPost[]>([]);

    const {
        data: currentPosts,
        isLoading: isLoadingTimeline,
        error,
        mutate,
    } = useGetTimeline(
        session!.accessToken,
        toDate.toISOString(),
        10,
        space
    )

    // TODO may get all spaces from parent
    const {
        data: allSpaces,
        isLoading: isLoadingAllSpaces,
        error: errorAllSpaces,
        mutate: mutateAllSpaces,
    } = useGetAllSpaces(session!.accessToken);

    useEffect(() => {
        if (!currentPosts.length) return

        setAllPosts((prev) => [...prev, ...currentPosts]);

    }, [currentPosts])
    console.log({allPosts});

    const reloadTimeline = () => {
        // TODO may improve by update prev state with deleted or edited posts ...
        setAllPosts([]);
        setToDate(new Date())
    }

    const fetchNextPosts = () => {
        if (!allPosts.length) return

        const newToDate = new Date(allPosts[allPosts.length - 1].creation_date)
        newToDate.setMilliseconds(newToDate.getMilliseconds()+1)

        setToDate(newToDate)
    }

    const afterSubmitForm = () => {
        if (sharedPost) setSharedPost(null)
        reloadTimeline()
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
                <TimelinePostForm
                    space={space}
                    sharedPost={sharedPost}
                    onCancelRepost={() => setSharedPost(null)}
                    afterSubmitForm={afterSubmitForm}
                />
            </div>
            {!allPosts.length ? ( <div className="m-10 flex justify-center">Bisher keine Beiträge ...</div>) : (<></>)}
            {allPosts.map((post, i) =>
                <TimelinePost key={i}
                    post={post}
                    space={space}
                    isLast={i === allPosts.length - 1}
                    allSpaces={allSpaces}
                    sharePost={post => setSharedPost(post)}
                    reloadTimeline={reloadTimeline}
                    fetchNextPosts={fetchNextPosts}
                />
            )}
        </>
    );
}