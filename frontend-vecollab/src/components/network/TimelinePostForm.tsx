import { fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { FormEvent } from "react";
import { IoIosSend } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import { BackendPost } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'

interface Props {
    post?: BackendPost | undefined;
    space?: string | undefined;
    onCancelForm?: Function;
    onSubmitForm?: Function;
}

TimelinePostForm.auth = true
export default function TimelinePostForm(
{
    post,
    space,
    onSubmitForm,
    onCancelForm
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<HTMLFormElement>(null)

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        const text = (formData.get('text') as string).trim()

        if (text === '')  return

        const data = Object.assign({},
            post ? post : { tags: [] },
            space ? { space } : {},
            { text },
        )

        const createOrUpdatePost = async () => {
            return await fetchPOST(
                '/posts',
                data,
                session?.accessToken,
                true
            )
        }

        try {
            await createOrUpdatePost()
            ref.current?.reset()
            if (onSubmitForm) onSubmitForm()
        } catch (error) {
            console.error(error);
        }
    }

    const onCancel = () => {
        ref.current?.reset()
        if (onCancelForm) onCancelForm()
    }

    return (
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
                    className={'w-full border border-[#cccccc] rounded-md px-2 py-[6px]'}
                    placeholder={'Beitrag schreiben ...'}
                    name='text'
                    defaultValue={post ? (post.isRepost ? post.repostText : post.text) : ''}
                />
            </div>
            <div className="flex justify-end">

            <button className={`${!post ? "hidden" : ""} mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg`} title="Abbrechen" onClick={onCancel}>
                Abbrechen
            </button>
            <button className="flex items-center bg-ve-collab-orange text-white py-2 px-5 rounded-lg" type='submit' title="Senden">
                <IoIosSend className="mx-2" />{post ? ( <>Aktualisieren</> ) : ( <>Senden</> )}
            </button>
            </div>
        </form>
    );
}