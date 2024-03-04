import { fetchDELETE, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { HiHeart, HiOutlineCalendar, HiOutlineHeart, HiOutlineShare } from "react-icons/hi";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { IoIosSend } from "react-icons/io";
import Dropdown from "../Dropdown";
import { BackendPost, BackendPostAuthor, BackendPostComment, BackendSpace } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import { MdDeleteOutline, MdModeEdit, MdOutlineAddComment, MdThumbUp } from "react-icons/md";
import { TiArrowForward } from "react-icons/ti";
import TimelinePostForm from "./TimelinePostForm";
import PostHeader from "./PostHeader";

interface Props {
    post: BackendPost
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
    space,
    isLast,
    allSpaces,
    removePost,
    sharePost: replyPost,
    fetchNextPosts
}: Props) {
    const { data: session } = useSession();
    const [wbRemoved, setWbRemoved] = useState<boolean>(false)
    const ref = useRef<any>(null)
    const [showCommentForm, setShowCommentForm] = useState<boolean>(false)
    const [comments, setComments] = useState<BackendPostComment[]>([])
    const [likeIt, setLikeIt] = useState<boolean>(false)
    const [likers, setLikers] = useState<string[]>([])
    const [editPost, setEditPost] = useState<boolean>(false)

    // reverse comments order
    useEffect(() => {
        const newComments = [...post.comments];
        newComments.reverse()
        setComments(newComments);

        setLikeIt(post.likers.includes(session?.user.preferred_username as string))
        setLikers(post.likers)
    }, [post]);

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

    const onAddedNewComment = (newComment: BackendPostComment) => {
        if (!newComment) return
        setComments(prev => [newComment, ...prev]);
    }

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
            onAddedNewComment(newComment.inserted_comment)
            ref.current?.reset()
        } catch (error) {
            console.error(error);
        }
    }

    const onClickLikeBtn = async () => {
        let newLikers = [...likers];

        try {
            if (likeIt) {
                await fetchDELETE( '/like', { post_id: post._id }, session?.accessToken )
                newLikers = newLikers.filter(a => a != session?.user.preferred_username)
            } else {
                await fetchPOST( '/like', { post_id: post._id }, session?.accessToken )
                newLikers.push(session?.user.preferred_username as string)
            }
            setLikeIt(!likeIt)
            setLikers(newLikers)
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
            // HACK wait until transition is done (TODO find a better solution...)
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

    const updatePost = (newText: string) => {
        if (post.isRepost) {
            post.repostText = newText
        } else {
            post.text = newText
        }
        setEditPost(false)
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
                onUpdatedPost={updatePost}
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
        if (!likers.length) return ( <></> )

        let hoverMsg = "By "
        if (likers.length == 1) hoverMsg += `${likers[0]}`
        else if (likers.length == 2) hoverMsg += `${likers[0]} and ${likers[1]}`
        else if (likers.length == 3) hoverMsg += `${likers.slice(0, 2).join(", ")} and ${likers[2]}`
        else hoverMsg += `${likers.slice(0, 3).join(", ")} and others`

        return (
            <span className="hover:cursor-pointer text-sm" title={hoverMsg}>
                <MdThumbUp className="inline" /> {likers.length}
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
                            <div className='self-start leading-[1.6rem] text-xs text-gray-500 ml-1'>
                                teilte einen Beitrag
                            </div>
                        </>
                    ) : (
                        <>
                            <PostHeader author={post.author} date={post.creation_date} />
                        </>
                     )}

                    {(!space && post.space) && (
                        <div className='self-start leading-[1.6rem] text-xs text-gray-500 ml-1'>
                            in der Gruppe <Link href={`/space/?id=${post.space}`} className="font-bold">{SpacenameById(post.space)}</Link>
                        </div>
                    )}

                    <div className='ml-auto'>
                        {likeIt ? (
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
                        <div className="my-5 ml-5 p-4 border-2 border-ve-collab-blue/25 rounded">
                            <div className="flex items-center">
                                <PostHeader author={post.repostAuthor as BackendPostAuthor} date={post.originalCreationDate as string} />
                            </div>
                            <div className='mt-5'>{post.text}</div>
                        </div>
                    </>
                )}

                <div className='my-5'>
                    <PostText />
                </div>

                <Likes />
                {(comments.length == 0 && !showCommentForm) && (
                    <button onClick={() => {setShowCommentForm(!showCommentForm)}} title="Add comment" className="m-3 align-middle">
                        <MdOutlineAddComment />
                    </button>
                )}

                {(comments.length > 0 || showCommentForm)&& (
                    <div className='mt-4 pt-4 border-t-2 border-ve-collab-blue/25'>
                        <div className="mb-4 font-slate-900">
                            {/* <MdComment className="inline" />&nbsp; */}
                            Kommentare
                        </div>

                        <form onSubmit={onSubmitCommentForm}>
                            <input
                                className={'border border-[#cccccc] rounded-md px-2 py-[6px]'}
                                type="text"
                                placeholder={'Kommentar schreiben ...'}
                                name='text'
                                autoComplete="off"
                            />
                            <button className="p-2" type='submit' title="Senden"><IoIosSend /></button>
                        </form>

                        {comments.length > 0 && (
                            <div className="pl-5 mt-5">
                                {comments.map((comment, ci) => (
                                    <div key={ci}>
                                        <div className="flex items-center">
                                        <PostHeader author={comment.author} date={comment.creation_date} />
                                        </div>
                                        <div className='my-5'>{comment.text}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}