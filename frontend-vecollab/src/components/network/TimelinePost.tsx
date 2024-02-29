import { fetchDELETE, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { HiHeart, HiOutlineCalendar, HiOutlineHeart, HiOutlineShare } from "react-icons/hi";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { IoIosSend } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import SmallTimestamp from "../SmallTimestamp";
import Dropdown from "../Dropdown";
import { BackendPost, BackendPostComment, BackendSpace } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import { MdDeleteOutline, MdModeEdit } from "react-icons/md";
import TimelinePostForm from "./TimelinePostForm";

interface Props {
    post: BackendPost
    space?: string
    isLast: boolean
    allSpaces?: BackendSpace[]
    removePost: (post: BackendPost) => void
    sharePost?: (post: BackendPost) => void
    reloadTimeline: Function
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
    sharePost,
    reloadTimeline,
    fetchNextPosts
}: Props) {
    const { data: session } = useSession();
    const [wbRemoved, setWbRemoved] = useState<boolean>(false)
    const ref = useRef<HTMLFormElement>(null)
    const [likeIt, setLikeIt] = useState<boolean>(post.likers.includes(session?.user.preferred_username as string))
    const [comments, setComments] = useState<BackendPostComment[]>(post.comments)
    const [likers, setLikers] = useState<string[]>(post.likers)
    const [editPost, setEditPost] = useState<boolean>(false)

    // reverse comments order
    useEffect(() => {
        const newComments = [...post.comments];
        newComments.reverse()
        setComments(newComments);
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
            await addNewComment()
            // TODO if /comment returns the new result we could use mutate() with 'populateCache'
            ref.current?.reset()
            reloadTimeline()
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

    const onClickShareBtn = () => {
        if (sharePost) sharePost(post)
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

    const PostAuthor = (imageId: string, authorName: string, date: string) => (
        <>
            <AuthenticatedImage
                imageId={imageId}
                alt={'Benutzerbild'}
                width={40}
                height={40}
                className="rounded-full mr-3"
            ></AuthenticatedImage>
            <div className="flex flex-col">
                <div className='font-bold'>{authorName}</div>
                <SmallTimestamp timestamp={date} className='text-xs text-gray-500' />
            </div>
        </>
    )

    const PostText = () => {
        if (editPost) return (
            <TimelinePostForm
                post={post}
                onCancelForm={() => setEditPost(false)}
                updatePost={updatePost}
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

    let drOptions = []
    if (
        (!post.isRepost && post.author.username == session?.user.preferred_username)
        || post.isRepost && post.repostAuthor == session?.user.preferred_username
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

            <div className={`${wbRemoved ? "opacity-0 transition-opacity ease-in-out delay-50 duration-300" : "opacity-100 transition-none" } p-4 my-8 bg-white rounded-3xl shadow-2xl`}>
                <div className="flex items-center">
                    {post.isRepost ? (
                        <>
                            {PostAuthor(post.repostAuthorProfilePic as string, post.repostAuthor as string, post.creation_date)}
                            <div className='self-start leading-[1.6rem] text-xs text-gray-500 ml-1'>
                                teilte einen Beitrag
                            </div>
                        </>
                    ) : (
                        <>
                            {PostAuthor(post.author.profile_pic, post.author.username, post.creation_date)}
                        </>
                     )}

                    {(!space && post.space) ? (
                        <div className='self-start leading-[1.6rem] text-xs text-gray-500 ml-1'>
                            in der Gruppe <Link href={`/space/?id=${post.space}`} className="font-bold">{SpacenameById(post.space)}</Link>
                        </div>
                    ) : ( <></> )}

                    <div className='ml-auto'>
                        {likeIt ? (
                            <button className="p-2" onClick={onClickLikeBtn} title="click to unlike post"><HiHeart /></button>
                        ) : (
                            <button className="p-2" onClick={onClickLikeBtn} title="Click to like post"><HiOutlineHeart /></button>
                        )}
                        <button className="p-2" onClick={onClickShareBtn} title="Click to share post"><HiOutlineShare /></button>
                        {drOptions.length ? (
                            <Dropdown options={drOptions} onSelect={handleSelectOption} />
                        ) : ( <></> )}
                    </div>
                </div>

                {post.isRepost ? (
                    <>
                        <div className='my-5'>
                            <PostText />
                        </div>
                        <div className="my-5 ml-5 p-5 border-2 border-ve-collab-blue/25 rounded-lg">
                            <div className="flex items-center">
                                {PostAuthor(post.author.profile_pic, post.author.username, post.creation_date)}
                            </div>
                            <div className='mt-5'>{post.text}</div>
                        </div>
                    </>
                ) : (
                    <div className='my-5'>
                        <PostText />
                    </div>
                 )}

                {likers.length ? (
                    <div className='my-5 text-sm'>
                        <span>Liked by </span>
                        {likers.map((liker, li) => (
                            <span className="font-bold" key={li}>{likers[li]}</span>
                        ))}
                    </div>
                ) : ( <></> )}

                <div>
                    <form onSubmit={onSubmitCommentForm} ref={ref}>
                        <input
                            className={'border border-[#cccccc] rounded-md px-2 py-[6px]'}
                            type="text"
                            placeholder={'Kommentar schreiben ...'}
                            name='text'
                            autoComplete="false"
                        />
                        <button className="p-2" type='submit' title="Senden"><IoIosSend /></button>
                    </form>
                </div>

                {comments.length ? (
                    <div className='mt-5 pt-5 pl-5 border-t-2 border-ve-collab-blue'>
                        <div className="-ml-5 mb-5">Kommentare</div>

                        {comments.map((comment, ci) => (
                            <div key={ci}>
                                <div className="flex items-center">
                                    {PostAuthor(comment.author.profile_pic, comment.author.username, comment.creation_date)}
                                </div>
                                <div className='my-5'>{comment.text}</div>
                            </div>
                        ))}
                    </div>
                ) : ( <></> )}
            </div>
        </>
    );
}