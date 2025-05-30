import { fetchGET, useGetAllGroups, useGetPinnedPosts, useGetTimeline } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '../common/LoadingAnimation';
import TimelinePost from './TimelinePost';
import { useCallback, useEffect, useState } from 'react';
import TimelinePostForm from './TimelinePostForm';
import { BackendPost, BackendGroupACLEntry } from '@/interfaces/api/apiInterfaces';
import Timestamp from '../common/Timestamp';
import { HiOutlineCalendar } from 'react-icons/hi';
import React from 'react';
import { TiPin } from 'react-icons/ti';
import { MdKeyboardDoubleArrowDown, MdKeyboardDoubleArrowUp } from 'react-icons/md';
import { useRouter } from 'next/router';
import { Socket } from 'socket.io-client';
import GeneralError from '../common/GeneralError';
import { useTranslation } from 'next-i18next';
import { add } from 'date-fns';
import ButtonLight from '../common/buttons/ButtongLight';
import ButtonLightBlue from '../common/buttons/ButtonLightBlue';

interface Props {
    /** User is global admin or admin of current group */
    userIsAdmin?: boolean;
    group?: string | undefined;
    groupACL?: BackendGroupACLEntry | undefined;
    user?: string | undefined;
    adminDashboard?: boolean;
    socket: Socket;
    hideForm?: boolean;
}

Timeline.auth = true;
export default function Timeline({
    userIsAdmin = false,
    group,
    groupACL,
    user,
    adminDashboard,
    socket,
    hideForm = false,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const router = useRouter();

    // hotfix for date issue #570
    // let isoDate = new Date();
    // isoDate = add(isoDate, { minutes: -1 * isoDate.getTimezoneOffset() });
    const [toDate, setToDate] = useState<Date>(new Date());
    const [postToRepost, setPostToRepost] = useState<BackendPost | null>(null);
    const [allPosts, setAllPosts] = useState<BackendPost[]>([]);
    const [postsByDate, setPostsByDate] = useState<Record<string, BackendPost[]>>({});
    const [pinnedPostsExpanded, setPinnedPostsExpanded] = useState<boolean>(false);
    const [fetchCount, setFetchCount] = useState<number>(0);
    const perFetchLimit = 10;
    const [isLoadingTimeline, setIsLoadingTimeline] = useState<boolean>(true);

    const datePillColors: { vg: string; bg: string }[] = [
        { vg: '#00748f', bg: '#d8f2f9' }, // blue
        { vg: '#c4560b', bg: '#f5cfb5' }, // orange
        { vg: '#0f172a', bg: '#e2e2e2' }, // greyy
    ];

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
    );

    const { data: allGroups } = useGetAllGroups(session!.accessToken);

    const { data: pinnedPosts, mutate: mutatePinnedPosts } = useGetPinnedPosts(
        session!.accessToken,
        group!
    );

    useEffect(() => {
        if (isFetchingNewPosts) {
            return;
        } else if (!newFetchedPosts.length) {
            setIsLoadingTimeline(false);
            return;
        }
        if (allPosts.some((a) => newFetchedPosts.some((b) => b._id == a._id))) return;
        setIsLoadingTimeline(true);

        setFetchCount((prev) => ++prev);
        setAllPosts((prev) => {
            const allPosts = [...prev, ...newFetchedPosts];
            setPostsByDate(groupBy(allPosts, (p) => p.creation_date.replace(/T.+/, '')));
            setIsLoadingTimeline(false);
            return allPosts;
        });
    }, [newFetchedPosts, isFetchingNewPosts, allPosts]);

    // may get repost from request query: ?repost=...
    useEffect(() => {
        if (isLoadingTimeline) return;

        if (router.query.repost) {
            fetchGET(`/posts?post_id=${router.query.repost}`, session!.accessToken).then((data) => {
                if (data.post) {
                    setPostToRepost(data.post);
                    const editor = document.querySelector('.rsw-ce') as HTMLElement;
                    if (editor) editor.focus();
                }
            });
        }
    }, [router, isLoadingTimeline, session]);

    function groupBy<T>(arr: T[], fn: (item: T) => any) {
        return arr.reduce<Record<string, T[]>>((prev, curr) => {
            const groupKey = fn(curr);
            const group = prev[groupKey] || [];
            group.push(curr);
            return { ...prev, [groupKey]: group };
        }, {});
    }

    const fetchNextPosts = useCallback(
        (force: boolean = false) => {
            if (!allPosts.length || isLoadingTimeline) return;
            if (force !== true && fetchCount % 3 == 0) return;
            if (newFetchedPosts.length < perFetchLimit) return;

            setIsLoadingTimeline(true);
            const newToDate = new Date(allPosts[allPosts.length - 1].creation_date);
            newToDate.setMilliseconds(newToDate.getMilliseconds() + 1);

            setToDate(newToDate);
        },
        [allPosts, newFetchedPosts, isLoadingTimeline, fetchCount]
    );

    const updatePosts = (posts: BackendPost[]) => {
        setIsLoadingTimeline(true);
        setAllPosts(posts);
        setPostsByDate(groupBy(posts, (p) => p.creation_date.replace(/T.+/, '')));
        setIsLoadingTimeline(false);
    };

    const updatePost = (newPost: BackendPost) => {
        updatePosts(
            allPosts.map((post) => {
                return post._id == newPost._id ? { ...post, ...newPost } : post;
            })
        );
    };

    const removePost = (post: BackendPost) => {
        updatePosts(allPosts.filter((a) => a._id != post._id));
    };

    const afterCreatePost = (post: BackendPost) => {
        if (!post) return;
        if (post.isRepost) setPostToRepost(null);

        // TODO may use mutate->populateCache instead ?!
        // https://github.com/KMI-KPZ/ve-collab/blob/a791a2ed9d68e71b6968488fe33dbf8bac000d4c/frontend-vecollab/src/components/network/Timeline.tsx
        updatePosts([post, ...allPosts]);
    };

    const getDatePill = (i: number) => {
        return datePillColors[i % datePillColors.length];
    };

    if (error) {
        console.error(error);
        return <GeneralError />;
    }

    return (
        <div className="mb-5">
            {pinnedPosts.length > 0 && (
                <>
                    <div className="mx-2 my-10 px-4 pb-4 rounded-md border-2 border-gray-600 outline outline-1 outline-gray-400 outline-offset-4">
                        <div className="font-bold text-slate-900 text-xl inline px-3 py-1 rounded-md relative -top-[20px] border-2 border-gray-600 bg-[#e5e7eb]">
                            <TiPin size={25} className="inline" />{' '}
                            {pinnedPosts.length > 1 ? t('pinned_posts') : t('pinned_post')}
                        </div>
                        <div
                            className={`${
                                !pinnedPostsExpanded ? 'max-h-36' : ''
                            } overflow-hidden relative`}
                        >
                            {pinnedPosts.map((post, i) => (
                                <TimelinePost
                                    socket={socket}
                                    key={post._id}
                                    post={post}
                                    updatePost={(post) => {
                                        updatePost(post);
                                        mutatePinnedPosts();
                                    }}
                                    group={group}
                                    groupACL={groupACL}
                                    userIsAdmin={userIsAdmin}
                                    isLast={false}
                                    allGroups={allGroups}
                                    removePost={removePost}
                                    rePost={(post) => setPostToRepost(post)}
                                    fetchNextPosts={() => {}}
                                    updatePinnedPosts={mutatePinnedPosts}
                                />
                            ))}
                            {!pinnedPostsExpanded && (
                                <div
                                    onClick={(e) => {
                                        setPinnedPostsExpanded(true);
                                    }}
                                    className="absolute bottom-0 left-0 w-full h-full bg-linear-to-t to-50% from-[#e5e7eb]"
                                ></div>
                            )}
                        </div>
                    </div>
                    <div className="w-full text-center m-0 -mt-[50px] p-0 relative z-1">
                        {pinnedPostsExpanded ? (
                            <button
                                onClick={(e) => {
                                    setPinnedPostsExpanded(false);
                                }}
                                title={t('show_less')}
                                className="shadow-sm px-6 py-2 -mt-2 rounded-full bg-white hover:bg-slate-100"
                            >
                                <MdKeyboardDoubleArrowUp />
                            </button>
                        ) : (
                            <button
                                onClick={(e) => {
                                    setPinnedPostsExpanded(true);
                                }}
                                title={t('show_all')}
                                className="shadow-sm px-6 py-2 -mt-2 rounded-full bg-white hover:bg-slate-100"
                            >
                                <MdKeyboardDoubleArrowDown />
                            </button>
                        )}
                    </div>
                </>
            )}

            {!hideForm && (!groupACL || groupACL.post) ? (
                <div className={'p-4 my-8 bg-white rounded-sm shadow-sm '}>
                    <TimelinePostForm
                        group={group}
                        postToRepost={postToRepost}
                        onCancelRepost={() => setPostToRepost(null)}
                        onCreatedPost={afterCreatePost}
                        socket={socket}
                    />
                </div>
            ) : (
                <div className="h-6"></div>
            )}

            {Object.keys(postsByDate).map((date, i) => {
                const datePill = getDatePill(i);
                return (
                    <div
                        key={date}
                        style={{ borderColor: datePill.vg }}
                        className="-ml-7 pl-7 pb-4 border-l border-gray-200"
                    >
                        <div className="relativ sticky z-20 -ml-[47px] top-[17px] mb-4 flex items-center font-bold">
                            <div
                                style={{
                                    color: datePill.vg,
                                    borderColor: datePill.vg,
                                    backgroundColor: datePill.bg,
                                }}
                                className="rounded-full border border-gray-200 p-[2px] -mt-[11px] shadow-sm"
                            >
                                <HiOutlineCalendar className="m-2" />
                            </div>
                            <div
                                style={{ color: datePill.vg, backgroundColor: datePill.bg }}
                                className="relative px-4 py-2 ml-2 -mt-[11px] rounded-full shadow-sm"
                            >
                                <Timestamp timestamp={date} dateFormat="d. MMM" />
                            </div>
                        </div>

                        {postsByDate[date].map((post, j) => (
                            <TimelinePost
                                socket={socket}
                                key={post._id}
                                post={post}
                                updatePost={updatePost}
                                group={group}
                                groupACL={groupACL}
                                userIsAdmin={userIsAdmin}
                                isLast={
                                    i === Object.keys(postsByDate).length - 1 &&
                                    j === postsByDate[date].length - 1
                                }
                                allGroups={allGroups}
                                removePost={removePost}
                                rePost={(post) => setPostToRepost(post)}
                                fetchNextPosts={fetchNextPosts}
                                updatePinnedPosts={mutatePinnedPosts}
                            />
                        ))}
                    </div>
                );
            })}

            {isLoadingTimeline && <LoadingAnimation size="small" />}

            {!isLoadingTimeline &&
                allPosts.length > 0 &&
                newFetchedPosts.length >= perFetchLimit && (
                    <div className="text-center">
                        <ButtonLightBlue
                            onClick={() => fetchNextPosts(true)}
                            title={t('load_more_posts')}
                        >
                            {t('show_more_posts')}
                        </ButtonLightBlue>
                    </div>
                )}

            {!isLoadingTimeline && allPosts.length == 0 && (
                <div className="m-10 flex justify-center">
                    {group ? t('no_posts_in_group_yet') : t('no_posts_in_your_timeline_yet')}
                </div>
            )}
        </div>
    );
}
