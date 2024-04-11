import { useGetAllSpaces, useGetPinnedPosts, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { useEffect, useState } from "react";
import TimelinePostForm from "./TimelinePostForm";
import { BackendPost, BackendSpaceACLEntry } from "@/interfaces/api/apiInterfaces";
import Timestamp from "../Timestamp";
import { HiOutlineCalendar } from "react-icons/hi";
import React from "react";
import { TiPin } from "react-icons/ti";
import { MdKeyboardDoubleArrowDown, MdKeyboardDoubleArrowUp } from "react-icons/md";

interface Props {
    /** User is global admin or admin of current space */
    userIsAdmin?: boolean
    space?: string | undefined;
    spaceACL?: BackendSpaceACLEntry | undefined
    user?: string | undefined;
}

Timeline.auth = true
export default function Timeline({
    userIsAdmin=false,
    space,
    spaceACL,
    user
}: Props) {
    const { data: session } = useSession();
    const [toDate, setToDate] = useState<Date>(new Date());
    const [sharedPost, setSharedPost] = useState<BackendPost|null>(null);
    const [allPosts, setAllPosts] = useState<BackendPost[]>([]);
    const [groupedPosts, setGroupedPosts] = useState< Record<string, BackendPost[]> >({});
    const [pinnedPostsExpanded, setPinnedPostsExpanded] = useState(false)
    const [fetchCount, setFetchCount] = useState<number>(0);
    const perFetchLimit = 10

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
        perFetchLimit,
        space,
        user
    )

    const { data: allSpaces } = useGetAllSpaces(session!.accessToken);

    const {
        data: pinnedPosts,
        mutate: mutatePinnedPosts
    } = useGetPinnedPosts(session!.accessToken, space!)

    useEffect(() => {
        if (!newFetchedPosts.length) return

        if (allPosts.some((post) => post._id == newFetchedPosts[0]._id) ) {
            // TODO sometimes this happens -> WHY???? Because of hot-refresh while development
            // console.warn('Fetched same postss as current [dev-only?!?]', {allPosts, newFetchedPosts, toDate});
        } else {
            setFetchCount(prev => ++prev)
            setAllPosts((prev) => [...prev, ...newFetchedPosts]);
        }
    }, [newFetchedPosts, allPosts])

    useEffect(() => {
        if (!allPosts.length) return

        setGroupedPosts( groupBy(allPosts, (p) => p.creation_date.replace(/T.+/, '')) )
        // console.log({allPosts, groupedPosts});
    }, [allPosts])

    function groupBy<T>(arr: T[], fn: (item: T) => any) {
        return arr.reduce<Record<string, T[]>>((prev, curr) => {
            const groupKey = fn(curr);
            const group = prev[groupKey] || [];
            group.push(curr);
            return { ...prev, [groupKey]: group };
        }, {});
    }

    const fetchNextPosts = (force: boolean=false) => {
        if (!allPosts.length) return
        if (force !== true && fetchCount % 2 == 0) return

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

    const getDatePill = (i: number) => {
        return datePillColors[ (i) % datePillColors.length ]
    }

    if (error) {
        console.error(error);
        return (<>Error loading timeline. See console for details</>)
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
                                    key={post._id}
                                    post={post}
                                    updatePost={post => {
                                        console.log('update pinned posts ...', post);
                                        updatePost(post)
                                        mutatePinnedPosts()
                                    }}
                                    space={space}
                                    spaceACL={spaceACL}
                                    userIsAdmin={userIsAdmin}
                                    isLast={false}
                                    allSpaces={allSpaces}
                                    removePost={removePost}
                                    sharePost={post => setSharedPost(post)}
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

            {(!spaceACL || spaceACL.post) && (
                <div className={'p-4 my-8 bg-white rounded shadow '}>
                    <TimelinePostForm
                        space={space}
                        sharedPost={sharedPost}
                        onCancelRepost={() => setSharedPost(null)}
                        onCreatedPost={afterCreatePost}
                        />
                </div>
            )}

            {Object.keys( groupedPosts ).map( (group, i) => {
                const datePill = getDatePill(i)
                return (
                    <div key={group}
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
                                <Timestamp timestamp={group} dateFormat="d. MMM" />
                            </div>
                        </div>

                        { groupedPosts[group].map( (post, j) => (
                            <TimelinePost
                                key={post._id}
                                post={post}
                                updatePost={updatePost}
                                space={space}
                                spaceACL={spaceACL}
                                userIsAdmin={userIsAdmin}
                                isLast={i === Object.keys(groupedPosts).length-1 && j === groupedPosts[group].length-1}
                                allSpaces={allSpaces}
                                removePost={removePost}
                                sharePost={post => setSharedPost(post)}
                                fetchNextPosts={fetchNextPosts}
                                updatePinnedPosts={mutatePinnedPosts}
                            />
                        )) }
                    </div>
                )
            } )}
            {newFetchedPosts.length >= perFetchLimit && (
                <div className="text-center">
                    <button onClick={e => {fetchNextPosts(true)}} type="button" title="Weitere Beiträge laden ..." className="py-2 px-5 rounded-lg bg-ve-collab-orange text-white">
                        Mehr
                    </button>
                </div>
            )}

            {isLoadingTimeline && (<LoadingAnimation />)}
            {!isLoadingTimeline && allPosts.length == 0 && (
                <div className="m-10 flex justify-center">
                    {space ? (
                        "Bisher keine Beiträge in dieser Gruppe..."
                    ) : (
                        "Bisher keine Beiträge in deiner Timeline..."
                    )}
                </div>
            )}
        </>
    );
}