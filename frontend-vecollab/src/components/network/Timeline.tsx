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

    let datePillIdx: number = 0;
    const datePillColors: { vg: string, bg: string}[] = [
        { vg: '#00748f', bg: '#d8f2f9' }, // blue
        { vg: '#c4560b', bg: '#f5cfb5' }, // orange
        { vg: '#0f172a', bg: '#e2e2e2' }, // greyy
    ]

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

        if (allPosts.some((post) => post._id == newFetchedPosts[0]._id) ) {
            // newFetchedPosts[0]._id == allPosts[0]?._id
            // TODO sometimes this happens -> WHY???? Because of hot-refresh while development
            console.error('ERROR: fetched posts are the same as current', {allPosts, newFetchedPosts, toDate});

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

    const showDatePill = (post: BackendPost) => {
        const curDate = new Date(post.creation_date)

        if (prevDate
            && format(prevDate, 'dMMMyyy') == format(curDate, 'dMMMyyy')
        ) {
            return false
        }
        prevDate = curDate
        datePillIdx += 1
        return true
    }

    const getCurrentDatePill = () => {
        return datePillColors[ (datePillIdx-1) % datePillColors.length ]
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
            {allPosts.map((post, i) => {
                const hasDatePill = showDatePill(post)
                const datePill = getCurrentDatePill();
                return (
                    <div key={post._id}
                        style={{ borderColor: datePill.vg }}
                        className="-ml-7 pl-7 pb-7 pt-2 border-l"
                    >
                        {hasDatePill && (
                            <div
                                style={{ color: datePill.vg }}
                                className="relative -left-[45px] -top-[5px] -mt-2 mb-4 flex items-center font-bold"
                            >
                                <div
                                    style={{ borderColor: datePill.vg, backgroundColor:datePill.bg }}
                                    className="rounded-full border"
                                >
                                    <HiOutlineCalendar className='m-2' />
                                </div>
                                <div

                                    style={{ backgroundColor:datePill.bg }}
                                    className="px-4 py-2 ml-2 relative rounded-full"
                                >
                                    <Timestamp timestamp={post.creation_date} dateFormat="d. MMM" />
                                </div>
                            </div>
                        )}
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
                );
            })}
            {isLoadingTimeline && (<LoadingAnimation />)}
            {!isLoadingTimeline && allPosts.length == 0 && ( <div className="m-10 flex justify-center">Bisher keine Beiträge ...</div>)}
        </>
    );
}