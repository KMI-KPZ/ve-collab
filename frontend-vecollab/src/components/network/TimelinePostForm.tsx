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
    reloadTimeline: () => void;
}

TimelinePostForm.auth = true
export default function TimelinePostForm(
{
    post,
    space,
    reloadTimeline
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<HTMLFormElement>(null)

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        const text = (formData.get('text') as string).trim()

        if (text === '')  return

        const addNewPost = async () => {
            const res = await fetchPOST(
                '/posts',
                Object.assign({}, {
                    text,
                    tags: []
                }, space ? { space } : {}),
                session?.accessToken,
                true
            )
            return res.inserted_post
        }

        try {
            await addNewPost()
            reloadTimeline()
            ref.current?.reset()

        } catch (error) {
            console.error(error);
        }
    }

    return (
        <form onSubmit={onSubmit} ref={ref}>
            <div className="flex items-center mb-5">
                <AuthenticatedImage
                    imageId={"default_profile_pic.jpg"}
                    alt={'Benutzerbild'}
                    width={40}
                    height={40}
                    className="rounded-full mr-3"
                ></AuthenticatedImage>
                <textarea
                    className={'w-full border border-[#cccccc] rounded-md px-2 py-[6px]'}
                    placeholder={'Beitrag schreiben ...'}
                    name='text'
                />
            </div>
            <div className="flex justify-end">

            <button className="flex items-center bg-ve-collab-orange text-white py-2 px-5 rounded-lg" type='submit' title="Senden">
                <IoIosSend className="mx-2" />Senden
            </button>
            </div>
        </form>
    );
}