import { fetchDELETE, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { HiHeart, HiOutlineCalendar, HiOutlineHeart, HiOutlineShare } from "react-icons/hi";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { IoIosSend } from "react-icons/io";
import Dropdown from "../Dropdown";
import { BackendPost, BackendPostAuthor, BackendPostComment, BackendSpace } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import { MdDeleteOutline, MdDoubleArrow, MdModeEdit, MdOutlineAddComment, MdOutlineKeyboardDoubleArrowDown, MdThumbUp } from "react-icons/md";
import { TiArrowForward } from "react-icons/ti";
import TimelinePostForm from "./TimelinePostForm";
import PostHeader from "./PostHeader";

interface Props {
    post: BackendPost
    updatePost: (post: BackendPost) => void
    space?: string
    isLast: boolean
    allSpaces?: BackendSpace[]
    removePost: (post: BackendPost) => void
    sharePost?: (post: BackendPost) => void
    fetchNextPosts: Function
}

TimelinePost.auth = true
export default function TimelinePost(
{
    post,
    updatePost,
    space,
    isLast,
    allSpaces,
    removePost,
    sharePost: replyPost,
    fetchNextPosts
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<any>(null)
    const commentFormref = useRef<any>(null)
    const [wbRemoved, setWbRemoved] = useState<boolean>(false)
    const [repostExpand, setRepostExpand] = useState<boolean>(false)
    const [showCommentForm, setShowCommentForm] = useState<boolean>(false)
    const [showXComments, setShowXComments] = useState<number>(3)
    const [editPost, setEditPost] = useState<boolean>(false)

    // implement infinity scroll (detect intersection of window viewport with last post)
    useEffect(() => {
        if (!ref?.current) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (isLast && entry.isIntersecting) {
                fetchNextPosts()
                observer.unobserve(entry.target);
            }
        });

        observer.observe(ref.current);
    }, [isLast])

    // may collapse/expand repost
    useEffect(() => {
        if (ref.current && post.isRepost) {
            // TODO update on resize window ?!
            setTimeout(() => {
                const repostEl = ref.current.querySelector(".repost-text")
                setRepostExpand( repostEl.scrollHeight <= repostEl.clientHeight )
            }, 1)
        }
    });

    const onSubmitCommentForm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        const text = (formData.get('text') as string).trim()

        if (text === '')  return

        const addNewComment = async () => {
            const res = await fetchPOST(
                '/comment',
                {
                    text,
                    post_id: post._id
                },
                session?.accessToken
            )
            return res
        }

        try {
            const newComment = await addNewComment()
            updatePost( {...post, comments: [...post.comments, newComment.inserted_comment] } )
            commentFormref.current?.reset()
        } catch (error) {
            console.error(error);
        }
    }

    const onClickLikeBtn = async () => {
        let newLikers = [...post.likers];
        const likeIt = post.likers.includes(session?.user.preferred_username as string)

        try {
            if (likeIt) {
                await fetchDELETE( '/like', { post_id: post._id }, session?.accessToken )
                newLikers = newLikers.filter(a => a != session?.user.preferred_username)
            } else {
                await fetchPOST( '/like', { post_id: post._id }, session?.accessToken )
                newLikers.push(session?.user.preferred_username as string)
            }
            updatePost( {...post, likers: newLikers} )
        } catch (error) {
            console.log(error);
        }
    }

    const onClickReplyBtn = () => {
        if (replyPost) replyPost(post)
    }

    const deletePost = async () => {
        try {
            await fetchDELETE( '/posts', { post_id: post._id }, session?.accessToken )
            setWbRemoved(true)
            // wait until transition is done
            await new Promise(resolve => setTimeout(resolve, 450))
            removePost(post)
            setWbRemoved(false)
        } catch (error) {
            console.error(error);
        }
    }

    const handleSelectOption = (value: string) => {
        switch (value) {
            case 'remove':
                deletePost()
                break;
            case 'edit':
                setEditPost(true)
                break;
            default:
                break;
        }
    }

    const updatePostText = (newText: string) => {
        if (post.isRepost) {
            updatePost( {...post, repostText: newText} )
        } else {
            updatePost( {...post, text: newText} )
        }
        setEditPost(false)
    }

    const openCommentForm = () => {
        setShowCommentForm(true)
        setTimeout(() => {
            commentFormref.current?.querySelector("input")?.focus()
        }, 1);
    }

    const SpacenameById = (spaceId: string) => {
        if (!allSpaces) return (<>{spaceId}</>)
        const space = allSpaces.find(space => space._id == spaceId)
        return ( <>{ space?.name }</> )
    }

    const PostText = () => {
        if (editPost) return (
            <TimelinePostForm
                post={post}
                onCancelForm={() => setEditPost(false)}
                onUpdatedPost={updatePostText}
            />
        )

        return (
            <div className="whitespace-break-spaces">
                {post.isRepost
                    ? ( <>{post.repostText}</> )
                    : ( <>{post.text}</> )
                }
            </div>
        )
    }

    const Likes = () => {
        if (!post.likers.length) return ( <></> )

        let hoverMsg = "By "
        if (post.likers.length == 1) hoverMsg += `${post.likers[0]}`
        else if (post.likers.length == 2) hoverMsg += `${post.likers[0]} and ${post.likers[1]}`
        else if (post.likers.length == 3) hoverMsg += `${post.likers.slice(0, 2).join(", ")} and ${post.likers[2]}`
        else hoverMsg += `${post.likers.slice(0, 3).join(", ")} and others`

        return (
            <span className="hover:cursor-pointer text-sm mr-3" title={hoverMsg}>
                <MdThumbUp className="inline" /> {post.likers.length}
            </span>
        )
    }

    let drOptions = []
    if (
        (!post.isRepost && post.author.username == session?.user.preferred_username)
        || post.isRepost && post.repostAuthor?.username == session?.user.preferred_username
    ) {
        drOptions.push(
            { value: 'remove', label: 'löschen', icon: <MdDeleteOutline /> },
            { value: 'edit', label: 'bearbeiten', icon: <MdModeEdit /> }
        )
    }

    return (
        <>
            {/* <div className="-ml-5 flex items-center text-ve-collab-blue">
                <div className='rounded-full bg-ve-collab-blue/10'><HiOutlineCalendar className='m-4' /></div>
                <div className="p-3 m-2 rounded-full bg-ve-collab-blue/10">
                    <Timestamp timestamp={post.creation_date} className='inline-block' />
                </div>
            </div> */}

            <div ref={ref} className={`${wbRemoved ? "opacity-0 transition-opacity ease-in-out delay-50 duration-300" : "opacity-100 transition-none" } p-4 my-8 bg-white rounded shadow`}>
                <div className="flex items-center">
                    {(post.isRepost && post.repostAuthor) ? (
                        <>
                            <PostHeader author={post.repostAuthor} date={post.creation_date} />
                            {/* <div className='self-start leading-[1.6rem] text-xs text-gray-500 ml-1'>
                                teilte einen Beitrag
                            </div> */}
                        </>
                    ) : (
                        <>
                            <PostHeader author={post.author} date={post.creation_date} />
                        </>
                     )}

                    {(!space && post.space) && (
                        <div className='self-start leading-[1.6rem] text-xs text-gray-500 ml-1'>
                            <MdDoubleArrow className="inline" /> <Link href={`/space/?id=${post.space}`} className="font-bold align-middle">{SpacenameById(post.space)}</Link>
                        </div>
                    )}

                    <div className='ml-auto'>
                        {(post.likers.includes(session?.user.preferred_username as string)) ? (
                            <button className="p-2" onClick={onClickLikeBtn} title="click to unlike post"><HiHeart /></button>
                        ) : (
                            <button className="p-2" onClick={onClickLikeBtn} title="Click to like post"><HiOutlineHeart /></button>
                        )}
                        <button className="p-2" onClick={onClickReplyBtn} title="Click to reply post"><TiArrowForward /></button>
                        {drOptions.length > 0 && (
                            <Dropdown options={drOptions} onSelect={handleSelectOption} />
                        )}
                    </div>
                </div>

                {post.isRepost && (
                    <>
                        <div className="my-5 ml-5 p-4 rounded bg-[#e5f1f4]">
                            <div className="flex items-center">
                                <PostHeader author={post.repostAuthor as BackendPostAuthor} date={post.originalCreationDate as string} />
                            </div>
                            <div className={`${repostExpand ? "" : "max-h-40 overflow-hidden"} mt-5 whitespace-break-spaces relative repost-text`}>
                                {post.text}
                                <span className={`${repostExpand ? "hidden" : ""} absolute left-0 bottom-0 w-full h-20 bg-gradient-to-b from-transparent to-[#e5f1f4]`}>
                                    <button className="absolute bottom-0 left-10 mx-4 py-2 px-5" onClick={() => setRepostExpand(true)} title="Click to expand">
                                        <MdOutlineKeyboardDoubleArrowDown />
                                    </button>
                                </span>
                            </div>
                        </div>
                    </>
                )}

                <div className='my-5'>
                    <PostText />
                </div>

                <Likes />
                {(post.comments.length == 0 && !showCommentForm)
                    ? (
                        <button onClick={openCommentForm} title="Add comment" className="align-middle">
                            <MdOutlineAddComment />
                        </button>
                    ) : (
                        <div className='mt-4 pt-4 pl-4 border-t-2 border-ve-collab-blue/50'>
                            {/* <div className="mb-4 font-slate-900 rounded-t-md bg-ve-collab-blue/50 p-3 text-white font-bold text-lg"> */}
                            <div className="mb-4 font-slate-900 font-bold text-lg">
                                {/* <MdComment className="inline" />&nbsp; */}
                                Kommentare
                            </div>

                            <form onSubmit={onSubmitCommentForm} className="mb-2" ref={commentFormref}>
                                <input
                                    className={'border border-[#cccccc] rounded-md px-2 py-[6px]'}
                                    type="text"
                                    placeholder={'Kommentar schreiben ...'}
                                    name='text'
                                    autoComplete="off"
                                />
                                <button className="p-2" type='submit' title="Senden"><IoIosSend /></button>
                            </form>

                            {post.comments.length > 0 && (
                                <div className="pl-5 mt-5">
                                    {post.comments.reverse().map((comment, ci) => (
                                        <div key={ci}>
                                            <div className={`${ci >= showXComments ? "hidden" : ""}`}>
                                                <div className={`flex items-center`}>
                                                    <PostHeader author={comment.author} date={comment.creation_date} />
                                                </div>
                                                <div className='my-5'>{comment.text}</div>
                                            </div>
                                            {(ci+1 == showXComments && post.comments.length > showXComments) && (
                                                <button className="py-2 px-5 rounded-lg" onClick={() => setShowXComments(showXComments+5)} title="Show more comments">
                                                    <MdOutlineKeyboardDoubleArrowDown />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }
            </div>
        </>
    );
}