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

    // const [displayPosts, setDisplayPosts] = useState<BackendPost[]>([]);
    const [sharedPost, setSharedPost] = useState<BackendPost|null>(null);

    const [toDate, setToDate] = useState(new Date().toISOString());

    const {
        data: posts,
        isLoading: isLoadingTimeline,
        error,
        mutate,
    } = useGetTimeline(
        session!.accessToken,
        toDate,
        10,
        space
    )
    console.log({posts, space});

    // TODO may get all spaces from parent
    const {
        data: allSpaces,
        isLoading: isLoadingAllSpaces,
        error: errorAllSpaces,
        mutate: mutateAllSpaces,
    } = useGetAllSpaces(session!.accessToken);
    console.log({allSpaces});

    const reloadTimeline = () => {
        setToDate(new Date().toISOString())
    }

    const onSubmitForm = () => {
        if (sharedPost) setSharedPost(null)
        reloadTimeline()
    }

    const sharePost = (post: BackendPost) => {
        setSharedPost(post)
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
                    afterSubmitForm={onSubmitForm}
                />
            </div>
            {!posts.length ? ( <div className="m-10 flex justify-center">Bisher keine Beiträge ...</div>) : (<></>)}
            {posts.map((post, i) =>
                <TimelinePost key={i}
                    post={post}
                    space={space}
                    allSpaces={allSpaces}
                    sharePost={sharePost}
                />
            )}
        </>
    );
}