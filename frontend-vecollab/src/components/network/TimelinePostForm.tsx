import { fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { FormEvent, MouseEventHandler, useEffect } from "react";
import { IoIosSend, IoMdClose } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import { BackendPost, BackendPostAuthor } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import PostHeader from "./PostHeader";

interface Props {
    post?: BackendPost | undefined;
    space?: string | undefined;
    sharedPost?: BackendPost | null
    onCancelForm?: Function;
    onCancelRepost?: MouseEventHandler;
    onUpdatedPost?: (text: string) => void
    onCreatedPost?: (post: BackendPost) => void
}

TimelinePostForm.auth = true
export default function TimelinePostForm(
{
    post: postToEdit,
    space,
    sharedPost: postToRepost,
    onCancelForm,
    onCancelRepost,
    onCreatedPost,
    onUpdatedPost,
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<HTMLFormElement>(null)

    // scroll up to the form if user clicked to re-post a post
    useEffect(() => {
        if (postToRepost && ref.current) {
            window.scrollTo({ behavior: 'smooth', top: ref.current.offsetTop - 75 })
        }
    }, [ref, postToRepost])

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        const text = (formData.get('text') as string).trim()

        if (text === '')  return

        const createOrUpdatePost = async () => {
            return await fetchPOST(
                '/posts',
                Object.assign({},
                    postToEdit ? postToEdit : { tags: [] },
                    space ? { space } : {},
                    { text },
                ),
                session?.accessToken,
                true
            )
        }

        const rePost = async () => {
            const res = await fetchPOST(
                '/repost',
                Object.assign({},
                    {
                        post_id: postToRepost?._id,
                        text
                    },
                    space ? { space } : { space: null }
                ),
                session?.accessToken
            )
            return res
        }

        try {
            const res = postToRepost
                ? await rePost()
                : await createOrUpdatePost()

            ref.current?.reset()
            if (postToEdit && onUpdatedPost) onUpdatedPost(text)
            if (!postToEdit && !postToRepost && onCreatedPost) onCreatedPost(res.inserted_post)
            if (!postToEdit && postToRepost && onCreatedPost) onCreatedPost(res.inserted_repost)
        } catch (error) {
            console.error(error);
        }
    }

    const onCancel = () => {
        ref.current?.reset()
        if (onCancelForm) onCancelForm()
    }

    return (
        <>
            <form onSubmit={onSubmit} ref={ref}>
                <div className="flex items-center mb-5">
                    {!postToEdit && (
                        <AuthenticatedImage
                            imageId={"default_profile_pic.jpg"}
                            alt={'Benutzerbild'}
                            width={40}
                            height={40}
                            className={`rounded-full mr-3`}
                        ></AuthenticatedImage>
                    )}
                    <textarea
                        className={'w-full border border-[#cccccc] rounded-md px-2 py-2'}
                        placeholder={'Beitrag schreiben ...'}
                        name='text'
                        defaultValue={postToEdit ? (postToEdit.isRepost ? postToEdit.repostText : postToEdit.text) : ''}
                    />
                </div>

                {postToRepost && (
                    <div className="my-5 ml-[50px] p-3 rounded bg-ve-collab-blue/10">
                        <div className="flex items-center">
                            {postToRepost.isRepost
                                ? ( <PostHeader author={postToRepost.repostAuthor as BackendPostAuthor} date={postToRepost.creation_date} /> )
                                : ( <PostHeader author={postToRepost.author} date={postToRepost.creation_date} /> )
                            }
                            <button onClick={onCancelRepost} className="ml-auto self-start">
                                <IoMdClose />
                            </button>
                        </div>
                        <div className='mt-5  whitespace-break-spaces'>
                            {postToRepost.isRepost ? postToRepost.repostText : postToRepost.text}
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button className={`${!postToEdit ? "hidden" : ""} mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg`} title="Abbrechen" onClick={onCancel}>
                        Abbrechen
                    </button>
                    <button className="flex items-center bg-ve-collab-orange text-white py-2 px-5 rounded-lg" type='submit' title="Senden">
                        <IoIosSend className="mx-2" />{postToEdit ? ( <>Aktualisieren</> ) : ( <>Senden</> )}
                    </button>
                </div>
            </form>
        </>
    );
}