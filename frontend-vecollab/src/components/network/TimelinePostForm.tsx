import { fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { FormEvent, MouseEventHandler, useEffect } from "react";
import { IoIosSend, IoMdClose } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import { BackendPost } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import SmallTimestamp from "../SmallTimestamp";

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
    post,
    space,
    sharedPost,
    onCancelForm,
    onCancelRepost,
    onCreatedPost,
    onUpdatedPost,
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<HTMLFormElement>(null)

    // scroll up to the form if user clicked to re-post a post
    useEffect(() => {
        if (sharedPost && ref.current) {
            window.scrollTo({ behavior: 'smooth', top: ref.current.offsetTop - 75 })
        }
    }, [ref, sharedPost])

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        const text = (formData.get('text') as string).trim()

        if (text === '')  return

        const createOrUpdatePost = async () => {
            return await fetchPOST(
                '/posts',
                Object.assign({},
                    post ? post : { tags: [] },
                    space ? { space } : {},
                    { text },
                ),
                session?.accessToken,
                true
            )
        }

        const rePost = async () => {
            return await fetchPOST(
                '/repost',
                Object.assign({},
                    {
                        post_id: sharedPost?._id,
                        text
                    },
                    space ? { space } : { space: null }
                ),
                session?.accessToken
            )
        }

        try {
            const res = await sharedPost
                ? rePost()
                : createOrUpdatePost()

            ref.current?.reset()
            if (post && onUpdatedPost) onUpdatedPost(text)
            if (!post && onCreatedPost) onCreatedPost((await res).inserted_post)
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
                    <AuthenticatedImage
                        imageId={"default_profile_pic.jpg"}
                        alt={'Benutzerbild'}
                        width={40}
                        height={40}
                        className={`${post ? "hidden" : ""} rounded-full mr-3`}
                    ></AuthenticatedImage>
                    <textarea
                        className={'w-full border border-[#cccccc] rounded-md px-2 py-2'}
                        placeholder={'Beitrag schreiben ...'}
                        name='text'
                        defaultValue={post ? (post.isRepost ? post.repostText : post.text) : ''}
                    />
                </div>

                {sharedPost
                    ? (
                        <div className="my-5 ml-[50px] p-3 border-2 border-ve-collab-blue/25 rounded-lg">
                            <div className="flex items-center">
                                <AuthenticatedImage
                                    imageId={sharedPost.author.profile_pic}
                                    alt={'Benutzerbild'}
                                    width={40}
                                    height={40}
                                    className="rounded-full mr-3"
                                ></AuthenticatedImage>
                                <div className="flex flex-col">
                                    <div className='font-bold'>{sharedPost.author.username}</div>
                                    <SmallTimestamp timestamp={sharedPost.creation_date} className='text-xs text-gray-500' />
                                </div>
                                <button onClick={onCancelRepost} className="ml-auto self-start">
                                    <IoMdClose />
                                </button>
                            </div>
                            <div className='mt-5'>{sharedPost.text}</div>
                        </div>
                    ) : ( <></> )
                }

                <div className="flex justify-end">
                    <button className={`${!post ? "hidden" : ""} mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg`} title="Abbrechen" onClick={onCancel}>
                        Abbrechen
                    </button>
                    <button className="flex items-center bg-ve-collab-orange text-white py-2 px-5 rounded-lg" type='submit' title="Senden">
                        <IoIosSend className="mx-2" />{post ? ( <>Aktualisieren</> ) : ( <>Senden</> )}
                    </button>
                </div>
            </form>
        </>
    );
}