import { fetchDELETE, fetchPOST, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { HiDotsHorizontal, HiHeart, HiOutlineCalendar, HiOutlineHeart, HiOutlineShare } from "react-icons/hi";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { IoIosSend } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import SmallTimestamp from "../SmallTimestamp";
import { BackendPosts } from "@/interfaces/api/apiInterfaces";
import { KeyedMutator } from "swr";
import { useRef } from 'react'

interface Props {
    post: BackendPosts;
    mutate: KeyedMutator<any>
}

Timeline.auth = true
export default function Timeline({post, mutate}: Props) {
    const { data: session } = useSession();
    // const [isLoading, setIsLoading] = useState<boolean>(false)
    const ref = useRef<HTMLFormElement>(null)
    const [likeIt, setLikeIt] = useState(post.likers.includes(session?.user.preferred_username as string))
    const [comments, setComments] = useState(post.comments)
    const [likers, setLikers] = useState(post.likers)

    // TODO delete (own) post
    // TODO edit (own) post
    // TODO reshare a post
    // TODO may set loadiungState on submit comment form

    useEffect(() => {
        const newComments = [...post.comments];
        newComments.reverse()
        setComments(newComments);
    }, [post]);

    async function onSubmitCommentForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            const formData = new FormData(event.currentTarget)
            if (formData.get('text') !== '') {
                await fetchPOST(
                    '/comment',
                    {
                        text: formData.get('text'),
                        post_id: post._id
                    },
                    session?.accessToken
                )
            }

            ref.current?.reset()
            mutate()
        } catch (error) {
            console.log(error);
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
        console.log('clicked shared btn...');
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
            <div>
                <div className='font-bold'>{authorName}</div>
                <SmallTimestamp timestamp={date} className='text-xs text-gray-500' />
            </div>
        </>
    )

    return (
        <>
            {/* <div className="-ml-5 flex items-center text-ve-collab-blue">
                <div className='rounded-full bg-ve-collab-blue/10'><HiOutlineCalendar className='m-4' /></div>
                <div className="p-3 m-2 rounded-full bg-ve-collab-blue/10">
                    <Timestamp timestamp={post.creation_date} className='inline-block' />
                </div>
            </div> */}

            <div className={'p-4 my-8 bg-white rounded-3xl shadow-2xl '}>
                <div className="flex items-center">
                    {post.isRepost ? (
                        <>
                            {PostAuthor(post.repostAuthorProfilePic as string, post.repostAuthor as string, post.creation_date)}
                            <div className='self-end text-xs text-gray-500 mx-2'>
                                teilte einen Post
                            </div>
                        </>
                    ) : (
                        <>
                            {PostAuthor(post.author.profile_pic, post.author.username, post.creation_date)}
                        </>
                     )}

                    {post.space ? (
                        <div className='self-end text-xs text-gray-500 mx-2'>
                            in <Link href={'#'}>{post.space}</Link>
                        </div>
                    ) : ( <></> )}

                    <div className='ml-auto'>
                        {likeIt ? (
                            <button className="p-2" onClick={onClickLikeBtn} title="click to unlike post"><HiHeart /></button>
                        ) : (
                            <button className="p-2" onClick={onClickLikeBtn} title="Click to like post"><HiOutlineHeart /></button>
                        )}
                        <button className="p-2" onClick={onClickShareBtn} title="Click to share post"><HiOutlineShare /></button>
                        <button className="p-2"><HiDotsHorizontal /></button>
                    </div>
                </div>

                {post.isRepost ? (
                    <>
                        <div className='my-5'>
                            <div>{post.repostText}</div>
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
                        <div>{post.text}</div>
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