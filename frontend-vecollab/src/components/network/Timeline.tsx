import { fetchGET, useGetAllGroups, useGetPinnedPosts, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../common/LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { useCallback, useEffect, useState } from "react";
import TimelinePostForm from "./TimelinePostForm";
import { BackendPost, BackendGroupACLEntry } from "@/interfaces/api/apiInterfaces";
import Timestamp from "../common/Timestamp";
import { HiOutlineCalendar } from "react-icons/hi";
import React from "react";
import { TiPin } from "react-icons/ti";
import { MdKeyboardDoubleArrowDown, MdKeyboardDoubleArrowUp } from "react-icons/md";
import { useRouter } from "next/router";
import { Socket } from "socket.io-client";
import GeneralError from "../common/GeneralError";

interface Props {
    /** User is global admin or admin of current group */
    userIsAdmin?: boolean
    group?: string | undefined;
    groupACL?: BackendGroupACLEntry | undefined
    user?: string | undefined;
    adminDashboard?: boolean;
    socket: Socket;
}

Timeline.auth = true
export default function Timeline({
    userIsAdmin=false,
    group,
    groupACL,
    user,
    adminDashboard,
    socket
}: Props) {
    const { data: session } = useSession();
    const router = useRouter();
    const [toDate, setToDate] = useState<Date>(new Date());
    const [postToRepost, setPostToRepost] = useState<BackendPost|null>(null);
    const [allPosts, setAllPosts] = useState<BackendPost[]>([]);
    const [postsByDate, setPostsByDate] = useState< Record<string, BackendPost[]> >({});
    const [pinnedPostsExpanded, setPinnedPostsExpanded] = useState<boolean>(false)
    const [fetchCount, setFetchCount] = useState<number>(0);
    const perFetchLimit = 10
    const [isLoadingTimeline, setIsLoadingTimeline] = useState<boolean>(false)


    const datePillColors: { vg: string, bg: string}[] = [
        { vg: '#00748f', bg: '#d8f2f9' }, // blue
        { vg: '#c4560b', bg: '#f5cfb5' }, // orange
        { vg: '#0f172a', bg: '#e2e2e2' }, // greyy
    ]

    const {
        data: newFetchedPosts,
        isLoading: isFetchingNewPosts,
        error,
        mutate,
    } = useGetTimeline(
        session!.accessToken,
        toDate.toISOString(),
        perFetchLimit,
        group,
        user,
        adminDashboard
    )

    const { data: allGroups } = useGetAllGroups(session!.accessToken);
    // console.log({allGroups});

    const {
        data: pinnedPosts,
        mutate: mutatePinnedPosts
    } = useGetPinnedPosts(session!.accessToken, group!)

    useEffect(() => {
        if (!newFetchedPosts.length) return
        if (allPosts.some(a => newFetchedPosts.some(b => b._id == a._id)) ) return
        setIsLoadingTimeline(true)

        setFetchCount(prev => ++prev)
        setAllPosts((prev) => {
            const allPosts = [...prev, ...newFetchedPosts]
            // console.log({newFetchedPosts, allPosts});
            setPostsByDate( groupBy(allPosts, (p) => p.creation_date.replace(/T.+/, '')) )
            setIsLoadingTimeline(false)
            return allPosts
        });
    }, [newFetchedPosts, allPosts])

    // may get repost from request query: ?repost=...
    useEffect(() => {
        if (isLoadingTimeline) return

        if (router.query.repost) {
            fetchGET(`/posts?post_id=${router.query.repost}`, session!.accessToken)
            .then((data) => {
                if (data.post) {
                    setPostToRepost(data.post)
                    const editor = document.querySelector(".rsw-ce") as HTMLElement
                    if (editor) editor.focus()
                }
            })
        }
    }, [router, isLoadingTimeline, session])

    function groupBy<T>(arr: T[], fn: (item: T) => any) {
        return arr.reduce<Record<string, T[]>>((prev, curr) => {
            const groupKey = fn(curr);
            const group = prev[groupKey] || [];
            group.push(curr);
            return { ...prev, [groupKey]: group };
        }, {});
    }

    const fetchNextPosts = useCallback((force: boolean=false) => {
        if (!allPosts.length || isLoadingTimeline) return
        if (force !== true && fetchCount % 3 == 0) return
        if (newFetchedPosts.length < perFetchLimit) return

        setIsLoadingTimeline(true)
        const newToDate = new Date(allPosts[allPosts.length - 1].creation_date)
        newToDate.setMilliseconds(newToDate.getMilliseconds()+1)

        setToDate(newToDate)
    }, [allPosts, newFetchedPosts, isLoadingTimeline, fetchCount])

    const updatePosts = (posts: BackendPost[]) => {
        setIsLoadingTimeline(true)
        setAllPosts(posts)
        setPostsByDate( groupBy(posts, (p) => p.creation_date.replace(/T.+/, '')) )
        setIsLoadingTimeline(false)
    }

    const updatePost = (newPost: BackendPost) => {
        updatePosts(allPosts.map(post => {
            return post._id == newPost._id
                ? { ...post, ...newPost }
                : post
        }))
    }

    const removePost = (post: BackendPost) => {
        updatePosts(allPosts.filter(a => a._id != post._id));
    }

    const afterCreatePost = (post: BackendPost) => {
        if (!post) return
        if (post.isRepost) setPostToRepost(null)

        // TODO may use mutate->populateCache instead ?!
        // https://github.com/KMI-KPZ/ve-collab/blob/a791a2ed9d68e71b6968488fe33dbf8bac000d4c/frontend-vecollab/src/components/network/Timeline.tsx
        updatePosts([post, ...allPosts])
    }

    const getDatePill = (i: number) => {
        return datePillColors[ (i) % datePillColors.length ]
    }

    if (error) {
        console.error(error);
        return <GeneralError />
    }

    return (
        <>
            {(pinnedPosts.length > 0) && (
                <>
                    <div className="mx-2 my-10 px-4 pb-4 rounded-md border border-2 border-gray-600 outline outline-1 outline-gray-400 outline-offset-4">
                        <div className="font-bold text-slate-900 text-xl inline px-3 py-1 rounded-md relative -top-[20px] border border-2 border-gray-600 bg-[#e5e7eb]">
                            <TiPin size={25} className="inline" /> {pinnedPosts.length > 1 ? ("Angeheftete Beiträge") : ("Angehefteter Beitrag")}
                        </div>
                        <div className={`${!pinnedPostsExpanded ? 'max-h-36' : ''} overflow-hidden relative`}>
                            {pinnedPosts.map((post, i) => (
                                <TimelinePost
                                    socket={socket}
                                    key={post._id}
                                    post={post}
                                    updatePost={post => {
                                        updatePost(post)
                                        mutatePinnedPosts()
                                    }}
                                    group={group}
                                    groupACL={groupACL}
                                    userIsAdmin={userIsAdmin}
                                    isLast={false}
                                    allGroups={allGroups}
                                    removePost={removePost}
                                    rePost={post => setPostToRepost(post)}
                                    fetchNextPosts={() => {}}
                                    updatePinnedPosts={mutatePinnedPosts}
                                />
                            ))}
                            {!pinnedPostsExpanded && (
                                <div onClick={e => {setPinnedPostsExpanded(true)}} className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t to-50% from-[#e5e7eb]"></div>
                            )}
                        </div>
                    </div>
                    <div className="w-full text-center m-0 -mt-[50px] p-0 relative z-1">
                        {pinnedPostsExpanded ? (
                            <button onClick={e => {setPinnedPostsExpanded(false)}} title="Weniger anzeigen" className="shadow px-6 py-2 -mt-2 rounded-full bg-white hover:bg-slate-100" >
                                <MdKeyboardDoubleArrowUp />
                            </button>
                        ) : (
                            <button onClick={e => {setPinnedPostsExpanded(true)}} title="Alles anzeigen" className="shadow px-6 py-2 -mt-2 rounded-full bg-white hover:bg-slate-100" >
                                <MdKeyboardDoubleArrowDown />
                            </button>
                        ) }
                    </div>
                </>
            )}

            {(!groupACL || groupACL.post) && (
                <div className={'p-4 my-8 bg-white rounded shadow '}>
                    <TimelinePostForm
                        group={group}
                        postToRepost={postToRepost}
                        onCancelRepost={() => setPostToRepost(null)}
                        onCreatedPost={afterCreatePost}
                        socket={socket}
                        />
                </div>
            )}

            {Object.keys( postsByDate ).map( (date, i) => {
                const datePill = getDatePill(i)
                return (
                    <div key={date}
                        style={{ borderColor: datePill.vg }}
                        className="-ml-7 pl-7 pb-4 border-l"
                    >
                        <div className="relativ sticky z-20 -ml-[47px] top-[17px] mb-4 flex items-center font-bold">
                            <div
                                style={{ color: datePill.vg, borderColor: datePill.vg, backgroundColor:datePill.bg }}
                                className="rounded-full border p-[2px] -mt-[11px] shadow"
                            >
                                <HiOutlineCalendar className='m-2' />
                            </div>
                            <div
                                style={{ color: datePill.vg, backgroundColor:datePill.bg }}
                                className="relative px-4 py-2 ml-2 -mt-[11px] rounded-full shadow"
                            >
                                <Timestamp timestamp={date} dateFormat="d. MMM" />
                            </div>
                        </div>

                        { postsByDate[date].map( (post, j) => (
                            <TimelinePost
                                socket={socket}
                                key={post._id}
                                post={post}
                                updatePost={updatePost}
                                group={group}
                                groupACL={groupACL}
                                userIsAdmin={userIsAdmin}
                                isLast={i === Object.keys(postsByDate).length-1 && j === postsByDate[date].length-1}
                                allGroups={allGroups}
                                removePost={removePost}
                                rePost={post => setPostToRepost(post)}
                                fetchNextPosts={fetchNextPosts}
                                updatePinnedPosts={mutatePinnedPosts}
                            />
                        )) }
                    </div>
                )
            } )}

            {isLoadingTimeline && (<LoadingAnimation />)}

            {!isLoadingTimeline && allPosts.length > 0 && newFetchedPosts.length >= perFetchLimit && (
                <div className="text-center">
                    <button onClick={e => { fetchNextPosts(true)}} type="button" title="Weitere Beiträge laden ..." className="py-2 px-5 rounded-lg bg-ve-collab-orange text-white">
                        Weitere Beiträge anzeigen
                    </button>
                </div>
            )}

            {!isLoadingTimeline && allPosts.length == 0 && (
                <div className="m-10 flex justify-center">
                    {group ? (
                        "Bisher keine Beiträge in dieser Gruppe..."
                    ) : (
                        "Bisher keine Beiträge in deiner Timeline..."
                    )}
                </div>
            )}
        </>
    );
}