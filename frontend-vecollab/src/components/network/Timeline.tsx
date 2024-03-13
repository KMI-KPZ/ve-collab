import { useGetAllSpaces, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { useEffect, useState } from "react";
import TimelinePostForm from "./TimelinePostForm";
import { BackendPost } from "@/interfaces/api/apiInterfaces";
import Timestamp from "../Timestamp";
import { HiOutlineCalendar } from "react-icons/hi";
import { format } from "date-fns";

interface Props {
    space?: string | undefined;
    user?: string | undefined;
}

Timeline.auth = true
export default function Timeline({ space, user }: Props) {
    const { data: session } = useSession();
    const [toDate, setToDate] = useState<Date>(new Date());
    const [sharedPost, setSharedPost] = useState<BackendPost|null>(null);
    const [allPosts, setAllPosts] = useState<BackendPost[]>([]);
    let prevDate: Date | null = null;

    let dateBubbleColorI: number = 0;

    const {
        data: newFetchedPosts,
        isLoading: isLoadingTimeline,
        error,
        mutate,
    } = useGetTimeline(
        session!.accessToken,
        toDate.toISOString(),
        10,
        space,
        user
    )

    // TODO may get all spaces from parent
    const {
        data: allSpaces,
        isLoading: isLoadingAllSpaces,
        error: errorAllSpaces,
        mutate: mutateAllSpaces,
    } = useGetAllSpaces(session!.accessToken);

    useEffect(() => {
        if (!newFetchedPosts.length) return

        if (newFetchedPosts[0]._id == allPosts[0]?._id) {
            // TODO sometimes this happens -> WHY???? Because of hot-refresh while development
            console.error('ERROR: fetched posts are the same as current', {allPosts, newFetchedPosts});

        } else {
            setAllPosts((prev) => [...prev, ...newFetchedPosts]);
        }
    }, [newFetchedPosts])
    // console.log({allPosts});

    const fetchNextPosts = (post: BackendPost, i: number) => {
        if (!allPosts.length) return
        // console.log('Fetch next posts', {i, post, allPosts});

        const newToDate = new Date(allPosts[allPosts.length - 1].creation_date)
        newToDate.setMilliseconds(newToDate.getMilliseconds()+1)

        setToDate(newToDate)
    }

    const updatePost = (newPost: BackendPost) => {
        setAllPosts(allPosts.map(post => {
            return post._id == newPost._id
                ? { ...post, ...newPost }
                : post
        }))
    }

    const removePost = (post: BackendPost) => {
        setAllPosts((prev) => prev.filter(a => a._id != post._id));
    }

    const afterCreatePost = (post: BackendPost) => {
        if (!post) return
        if (post.isRepost) setSharedPost(null)

        // TODO may use mutate->populateCache instead ?!
        // https://github.com/KMI-KPZ/ve-collab/blob/a791a2ed9d68e71b6968488fe33dbf8bac000d4c/frontend-vecollab/src/components/network/Timeline.tsx
        setAllPosts((prev) => [post, ...prev]);
    }

    if (error) {
        console.error(error);
        return (<>Error loading timeline. See console for details</>)
    }

    const showNewDateBubble = (post: BackendPost) => {
        const curDate = new Date(post.creation_date)

        if (prevDate
            && format(prevDate, 'dMMMyyy') == format(curDate, 'dMMMyyy')) {
            return false
        }

        prevDate = curDate
        dateBubbleColorI += 1
        return true
    }

    const dateBubbleColors: { vg: string, bg: string}[] = [
        { vg: '#00748f', bg: '#d8f2f9' }, // blue
        { vg: '#c4560b', bg: '#f5cfb5' }, // orange
        { vg: '#0f172a', bg: '#e2e2e2' }, // greyy
    ]

    const currentDBC = () => {
        return dateBubbleColors[ (dateBubbleColorI-1) % dateBubbleColors.length ]
    }

    return (
        <>
            <div className={'p-4 my-8 bg-white rounded shadow '}>
                <TimelinePostForm
                    space={space}
                    sharedPost={sharedPost}
                    onCancelRepost={() => setSharedPost(null)}
                    onCreatedPost={afterCreatePost}
                />
            </div>
            {allPosts.map((post, i) =>
                <div key={post._id}>
                    {showNewDateBubble(post) && (
                        <div
                            style={{ borderColor: currentDBC().vg, color: currentDBC().vg }}
                            className="-ml-5 flex items-center border-l font-bold "
                        >
                            <div
                                style={{ backgroundColor:currentDBC().bg, borderColor: currentDBC().vg }}
                                className="relative -left-[18px] -top-[5px] rounded-full border"
                            >
                                <HiOutlineCalendar className='m-2' />
                                </div>
                            <div

                                style={{ backgroundColor:currentDBC().bg }}
                                className="px-4 py-2 ml-2 -left-[18px] -top-[5px] relative rounded-full"
                            >
                                <Timestamp timestamp={post.creation_date} dateFormat="d. MMM" />
                            </div>
                        </div>
                    )}

                    <div
                        style={{ borderColor: currentDBC().vg }}
                        className="-ml-5 border-l pl-5 pb-8 pt-6"
                    >
                        <TimelinePost
                            post={post}
                            updatePost={updatePost}
                            space={space}
                            isLast={i === allPosts.length - 1}
                            allSpaces={allSpaces}
                            removePost={removePost}
                            sharePost={post => setSharedPost(post)}
                            fetchNextPosts={() => fetchNextPosts(post, i)}
                        />
                    </div>
                </div>
            )}
            {isLoadingTimeline && (<LoadingAnimation />)}
            {!isLoadingTimeline && allPosts.length == 0 && ( <div className="m-10 flex justify-center">Bisher keine Beiträge ...</div>)}
        </>
    );
}