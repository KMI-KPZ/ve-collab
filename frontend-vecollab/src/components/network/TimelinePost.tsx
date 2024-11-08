import { fetchDELETE, fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { HiHeart, HiOutlineHeart } from "react-icons/hi";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { IoIosSend } from "react-icons/io";
import Dropdown from "../common/Dropdown";
import { BackendPost, BackendPostAuthor, BackendPostComment, BackendPostFile, BackendGroup, BackendGroupACLEntry } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import { MdAudioFile, MdDeleteOutline, MdDoubleArrow, MdModeEdit, MdOutlineDocumentScanner, MdOutlineKeyboardDoubleArrowDown, MdShare, MdThumbUp, MdVideoFile } from "react-icons/md";
import { TiArrowForward, TiPin, TiPinOutline } from "react-icons/ti";
import TimelinePostForm from "./TimelinePostForm";
import PostHeader from "./PostHeader";
import { AuthenticatedFile } from "../common/AuthenticatedFile";
import { RxFile, RxFileText } from "react-icons/rx";
import TimelinePostText from "./TimelinePostText";
import AuthenticatedImage from "../common/AuthenticatedImage";
import { KeyedMutator } from "swr";
import Alert from "../common/dialogs/Alert";
import ConfirmDialog from "../common/dialogs/Confirm";
import { PlanPreview } from "@/interfaces/planner/plannerInterfaces";
import { Socket } from "socket.io-client";

interface Props {
    post: BackendPost
    updatePost: (post: BackendPost) => void
    group?: string
    groupACL?: BackendGroupACLEntry | undefined
    userIsAdmin: boolean
    isLast: boolean
    allGroups?: BackendGroup[]
    removePost: (post: BackendPost) => void
    rePost?: (post: BackendPost) => void
    fetchNextPosts: () => void
    updatePinnedPosts: KeyedMutator<any> | undefined,
    socket: Socket;
}

TimelinePost.auth = true
export default function TimelinePost(
{
    post,
    updatePost,
    group,
    groupACL,
    userIsAdmin=false,
    isLast,
    allGroups,
    removePost,
    rePost,
    fetchNextPosts,
    updatePinnedPosts,
    socket
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<any>(null)
    const commentFormref = useRef<any>(null)
    const [willRemvoe, setWillRemove] = useState<boolean>(false)
    const [repostExpand, setRepostExpand] = useState<boolean>(false)
    const [comments, setComments] = useState<BackendPostComment[]>( post.comments )
    const [showCommentForm, setShowCommentForm] = useState<boolean>(false)
    const [showXComments, setShowXComments] = useState<number>(3)
    const [editPost, setEditPost] = useState<boolean>(false)
    const [shareDialogIsOpen, setShareDialogIsOpen] = useState<boolean>(false)
    const [loadingLikers, setLoadingLikers] = useState<boolean>(false)
    const [likers, setLikers] = useState<BackendPostAuthor[]>([])
    const [askDeletion, setAskDeletion] = useState<boolean>(false)

    const attachedImages = post.files.filter(file =>  file.file_type.startsWith('image/') )
    const attachedFiles = post.files.filter(file =>  !file.file_type.startsWith('image/') )

    // infinity scroll (detect intersection of window viewport with last post)
    useEffect(() => {
        if (!ref?.current) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                // TODO es linter grumbles
                //  but adding 'fetchNextPosts' to dependency array calls the fetchNextPosts zwice...
                //  tried useCallback, timeouts - nothing helped yet ...
                observer.unobserve(entry.target);
                fetchNextPosts()
            }
        });

        if (isLast) {
            observer.observe(ref.current);
        }

    }, [isLast, fetchNextPosts])

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

        try {
            const newComment = await fetchPOST('/comment', { text, post_id: post._id }, session?.accessToken )
            if (newComment.inserted_comment) {
                setComments(prev => [...prev, newComment.inserted_comment])
            }
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
            fetchLikers(newLikers)
        } catch (error) {
            console.log(error);
        }
    }

    const onClickPin = async () => {
        try {
            if (post.pinned) {
                await fetchDELETE( '/pin', { id: post._id, pin_type: 'post' }, session?.accessToken )
            } else {
                await fetchPOST( '/pin', { id: post._id, pin_type: 'post' }, session?.accessToken )
            }
            updatePost( {...post, pinned: !post.pinned} )
            if (updatePinnedPosts) updatePinnedPosts()
        } catch (error) {
            console.log(error);
        }
    }

    const onClickRepostBtn = () => {
        if (rePost) rePost(post)
    }

    const deletePost = async () => {
        try {
            setWillRemove(true)
            await fetchDELETE( '/posts', { post_id: post._id }, session?.accessToken )
            // wait until transition animation is done
            await new Promise(resolve => setTimeout(resolve, 450))
            removePost(post)
            setWillRemove(false)
        } catch (error) {
            console.error(error);
        }
    }

    const deleteComment = async (comment: BackendPostComment) => {
        try {
            await fetchDELETE( '/comment', { comment_id: comment._id }, session?.accessToken )
            setComments(prev => prev.filter(c => c._id != comment._id) )
        } catch (error) {
            console.error(error);
        }
    }

    const handleSelectOption = (value: string, ...rest: any[]) => {
        switch (value) {
            case 'share':
                navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
                setShareDialogIsOpen(true)
                break;
            case 'remove':
                setAskDeletion(true)
                break;
            case 'edit':
                setEditPost(true)
                break;
            case 'remove-comment':
                deleteComment(rest[0])
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

    const fetchLikers = (usernames: string[]) => {
        if (likers.length == usernames.length || loadingLikers) return

        setLoadingLikers(true)
        fetchPOST('/profile_snippets', { usernames }, session?.accessToken)
        .then(data => {
            setLikers(data.user_snippets)
            setLoadingLikers(false)
        });
    }

    const pinComment = async (comment: BackendPostComment) => {
        try {
            if (comment.pinned) {
                await fetchDELETE( '/pin', { id: comment._id, pin_type: 'comment' }, session?.accessToken )
            } else {
                await fetchPOST( '/pin', { id: comment._id, pin_type: 'comment' }, session?.accessToken )
            }
            setComments(prev => prev.map(c => {
                    return c._id == comment._id ? { ...c, pinned: !comment.pinned } : c
                })
            )
        } catch (error) {
            console.log(error);
        }
    }

    const GroupnameById = (groupId: string) => {
        if (!allGroups) return (<>{groupId}</>)
        const group = allGroups.find(group => group._id == groupId)
        return ( <>{ group?.name }</> )
    }

    const Likes = () => {
        if (!post.likers.length) return ( <></> )

        return (
            <div className="group/likes w-10 text-sm mr-3 my-4 flex relative hover:cursor-pointer overflow-hidden hover:overflow-visible" onMouseOver={() => fetchLikers(post.likers)}>
                <MdThumbUp className="" size={20} />&nbsp;{post.likers.length}
                <div className="absolute w-40 overflow-y-auto max-h-32 left-1/2 -translate-x-1/2 p-2 mt-5 group-hover/likes:opacity-100 hover:!opacity-100 transition-opacity opacity-0 rounded-md bg-white shadow border">
                    {likers.map((liker, i) => (
                        <Link key={i} href={`/profile/user/${liker.username}`} className='truncate'>
                            <AuthenticatedImage
                                imageId={liker.profile_pic}
                                alt={'Benutzerbild'}
                                width={20}
                                height={20}
                                className="rounded-full mr-3 inline"
                            />
                            {liker.first_name ? (
                                <>{liker.first_name} {liker.last_name}</>
                            ) : (
                                <>{liker.username}</>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        )
    }

    const Comment = ({comment}: {comment: BackendPostComment}) => (
        <>
            <div className={`flex items-center group/comment`}>
                <PostHeader author={comment.author} date={comment.creation_date} />
                <div className={`ml-auto ${!comment.pinned ? 'opacity-0' : ''} transition-opacity group-hover/comment:opacity-100`}>
                    {(userIsAdmin || comment.author.username == session?.user.preferred_username) ? (
                        <button className="p-2 rounded-full hover:bg-ve-collab-blue-light" onClick={e => pinComment(comment)} title={comment.pinned ? "Kommentar abheften" : "Kommentar anheften"}>
                            {comment.pinned ? (
                                <TiPin />
                            ) : (
                                <TiPinOutline />
                            )}
                        </button>
                    ) : (
                        <>
                        {comment.pinned && ( <TiPin /> )}
                        </>
                    )}
                    <div className="inline opacity-0 group-hover/comment:opacity-100"><CommentHeaderDropdown comment={comment} /></div>
                </div>
            </div>
            <div className='mt-3 mb-6'>{comment.text}</div>
        </>
    )

    const CommentHeaderDropdown = ({comment}: {comment: BackendPostComment}) => {
        if (comment.author.username == session?.user.preferred_username
            || userIsAdmin
        ) {
            return <Dropdown options={[
                { value: 'remove-comment', label: 'löschen', icon: <MdDeleteOutline /> }
            ]} onSelect={value => { handleSelectOption(value, comment) }} />
        }
        return <></>
    }

    const FileIcon = ({_file}: {_file: BackendPostFile}) => {
        if (_file.file_type?.startsWith('video/')) {
            return <div className="h-[50px] flex items-center"><MdVideoFile size={35} /></div>
        }
        else if (_file.file_type?.startsWith('audio/')) {
            return <div className="h-[50px] flex items-center"><MdAudioFile size={35} /></div>
        }
        else if (_file.file_type?.startsWith('text/')) {
            return <div className="h-[50px] flex items-center"><RxFileText size={35} /></div>
        }
        else {
            return <div className="h-[50px] flex items-center"><RxFile size={35} /></div>
        }
    }

    const PostHeaderDropdown = ({post}: {post: BackendPost}) => {
        let options = [
            { value: 'share', label: 'Link kopieren', icon: <MdShare /> }
        ]
        if (
            (!post.isRepost && post.author.username == session?.user.preferred_username)
            || (post.isRepost && post.repostAuthor?.username == session?.user.preferred_username)
        ) {
            options.push(
                { value: 'remove', label: 'löschen', icon: <MdDeleteOutline /> },
                { value: 'edit', label: 'bearbeiten', icon: <MdModeEdit /> }
            )
        } else if (userIsAdmin) {
            options.push(
                { value: 'remove', label: 'löschen', icon: <MdDeleteOutline /> }
            )
        }

        return <Dropdown options={options} onSelect={handleSelectOption} />
    }

    return (
        <>
            {shareDialogIsOpen && (
                <Alert autoclose={3000} onClose={() => setShareDialogIsOpen(false)}>
                    <>Link kopiert</>
                </Alert>
            )}

            {askDeletion && (
                <ConfirmDialog message="Beitrag löschen?" callback={proceed => {
                    if (proceed) deletePost()
                    setAskDeletion(false)
                }} />
            )}

            <div ref={ref} className={`${willRemvoe ? "opacity-0 transition-opacity ease-in-out delay-50 duration-300" : "opacity-100 transition-none" }
                group/post p-4 mb-4 bg-white rounded shadow`}
            >
                <div className="flex items-center">
                    {(post.isRepost && post.repostAuthor) ? (
                        <PostHeader author={post.repostAuthor} date={post.creation_date} />
                    ) : (
                        <PostHeader author={post.author} date={post.creation_date} />
                    )}

                    {(!group && post.space) && (
                        <div className='self-start leading-[1.6rem] text-xs text-gray-500 ml-1 text-nowrap'>
                            <MdDoubleArrow className="inline" /> <Link href={`/group/${post.space}`} className="font-bold align-middle">{GroupnameById(post.space)}</Link>
                        </div>
                    )}

                    <div className='ml-auto opacity-0 group-hover/post:opacity-100 transition-opacity'>
                        {(post.likers.includes(session?.user.preferred_username as string)) ? (
                            <button className="p-2 rounded-full hover:bg-ve-collab-blue-light" onClick={onClickLikeBtn}><HiHeart /></button>
                        ) : (
                            <button className="p-2 rounded-full hover:bg-ve-collab-blue-light" onClick={onClickLikeBtn}><HiOutlineHeart /></button>
                        )}
                        {(group && userIsAdmin) && (
                            <button className="p-2 rounded-full hover:bg-ve-collab-blue-light" onClick={onClickPin} title={post.pinned ? "Beitrag abheften" : "Beitrag anheften"}>
                                {post.pinned ? (
                                    <TiPin />
                                ) : (
                                    <TiPinOutline />
                                )}
                            </button>
                        )}
                        <button className="p-2 rounded-full hover:bg-ve-collab-blue-light" onClick={onClickRepostBtn} title="Beitrag zitieren"><TiArrowForward /></button>
                        <PostHeaderDropdown post={post} />
                    </div>
                </div>

                {post.isRepost && (
                    <div className="my-5 ml-5 p-4 rounded bg-slate-100">
                        <div className="flex items-center">
                            <PostHeader author={post.repostAuthor as BackendPostAuthor} date={post.originalCreationDate as string} />
                        </div>
                        <div className={`${repostExpand ? "" : "max-h-40 overflow-hidden"} mt-5 whitespace-break-spaces relative repost-text`}>
                            <TimelinePostText text={ post.text as string } />
                            <span className={`${repostExpand ? "hidden" : ""} absolute left-0 bottom-0 w-full h-20 bg-gradient-to-b from-transparent to-[#e5f1f4]`}>
                                <button className="absolute bottom-0 left-10 mx-4 p-2 rounded-full hover:bg-ve-collab-blue-light" onClick={() => setRepostExpand(true)} title="Erweitern">
                                    <MdOutlineKeyboardDoubleArrowDown />
                                </button>
                            </span>
                        </div>
                    </div>
                )}

                <div className='my-5'>
                    {editPost
                        ? (
                            <TimelinePostForm
                                socket={socket}
                                post={post}
                                onCancelForm={() => setEditPost(false)}
                                onUpdatedPost={updatePostText}
                            />
                        ) : (
                            <TimelinePostText text={
                                post.isRepost
                                    ? post.repostText as string
                                    : post.text as string
                            } />
                        )
                    }
                </div>

                {attachedImages.length > 0 && (
                    <div className="my-4">
                        <div className="mb-8 flex flex-wrap max-h-[100vh] overflow-y-auto content-scrollbar">
                            {attachedImages.map((file, index) => (
                                <AuthenticatedFile
                                    key={index}
                                    url={`/uploads/${file.file_id}`}
                                    filename={file.file_name}
                                    title="Download image"
                                >
                                    <div className="flex justify-center">
                                        <AuthenticatedImage
                                            imageId={file.file_id}
                                            alt={file.file_name}
                                            width={250}
                                            height={250}
                                            className="rounded-md drop-shadow"
                                        ></AuthenticatedImage>
                                    </div>
                                    <div className="max-w-1/2 justify-center mx-2 px-1 my-1 truncate text-center">
                                        {file.file_name}
                                    </div>
                                </AuthenticatedFile>
                            ))}
                        </div>
                    </div>
                )}

                {attachedFiles.length > 0 && (
                    <div className="my-4">
                        <div className="mb-2 text-slate-900 font-bold">Dateien</div>
                        <div className="mb-8 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                            {attachedFiles.map((file, index) => (
                                <AuthenticatedFile
                                    key={index}
                                    url={`/uploads/${file.file_id}`}
                                    filename={file.file_name}
                                    title="Download file"
                                >
                                    <div className="flex justify-center">
                                        <FileIcon _file={file} />
                                    </div>
                                    <div className="max-w-1/2 justify-center mx-2 px-1 my-1 truncate">
                                        {file.file_name}
                                    </div>
                                </AuthenticatedFile>
                            ))}
                        </div>
                    </div>
                )}

                {post.plans !== undefined && post.plans.length > 0 && (
                    <div className="my-4">
                        <div className="mb-2 text-slate-900 font-bold">Pläne</div>
                        <div className="mb-8 flex flex-wrap space-x-4 max-h-[40vh] overflow-y-auto content-scrollbar">
                            {post.plans.map((plan, index) => (
                                <Link
                                    key={index}
                                    href={{pathname: `/plan/${plan._id}`}}
                                >
                                    <div className="flex justify-center">
                                        <MdOutlineDocumentScanner size={50} />
                                    </div>
                                    <div className="max-w-1/2 justify-center mx-2 px-1 my-1 truncate">
                                        {plan.name}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <Likes />

                {(comments.length == 0 && !showCommentForm && (!groupACL || groupACL.comment)) && (
                    <div className="mt-4 mb-2">
                        <button onClick={openCommentForm} className="px-2 py-[6px] w-1/3 rounded-md border text-gray-400 text-left text-nowrap overflow-hidden truncate">
                            Kommentar schreiben ...
                        </button>
                    </div>
                )}

                {(comments.length > 0 || showCommentForm) && (
                    <div className='mt-4 pt-4 px-4 border-t-2 border-ve-collab-blue/50'>
                        <div className="mb-4 text-slate-900 font-bold text-lg">
                            Kommentare
                        </div>

                        {(!groupACL || groupACL.comment) && (
                            <form onSubmit={onSubmitCommentForm} className="mb-2" ref={commentFormref}>
                                <input
                                    className={'w-1/3 border border-[#cccccc] rounded-md px-2 py-[6px]'}
                                    type="text"
                                    placeholder={'Kommentar schreiben ...'}
                                    name='text'
                                    autoComplete="off"
                                />
                                <button className="p-2" type='submit' title="Senden"><IoIosSend /></button>
                            </form>
                        )}

                        {comments.length > 0 && (
                            <div className="px-5 mt-5">
                                {comments.filter(c => c.pinned).reverse().map((cmnt, ci) => (
                                    <div key={ci}>
                                        <Comment comment={cmnt} />
                                    </div>
                                ))}
                                {comments.filter(c => !c.pinned).reverse().slice(0, showXComments).map((cmnt, ci) => (
                                    <div key={cmnt._id}>
                                        <Comment comment={cmnt} />
                                        {(ci+1 == showXComments && comments.filter(c => !c.pinned).length > showXComments) && (
                                            <button className="py-2 px-5 rounded-full hover:bg-ve-collab-blue-light" onClick={() => setShowXComments(showXComments+5)} title="Weitere Kommentare anzeigen">
                                                <MdOutlineKeyboardDoubleArrowDown />
                                            </button>
                                        )}
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