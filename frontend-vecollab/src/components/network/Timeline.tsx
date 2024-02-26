import { fetchPOST, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { FormEvent, useState } from "react";
import { IoIosSend } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import { useRef } from 'react'

interface Props {
    space?: string | undefined;
}

Timeline.auth = true
export default function Timeline({ space }: Props) {
    const { data: session } = useSession();
    const ref = useRef<HTMLFormElement>(null)

    const [toDate, setToDate] = useState(new Date().toISOString());

    const now = new Date()
    const [fromDate] = useState( new Date(now.setFullYear( now.getFullYear() - 1 )).toISOString());
    // TODO fromDate is just a dummy until /timline/[space] supports the 'limit' parameter

    const {
        data: posts,
        isLoading: isLoadingTimeline,
        error,
        mutate,
    } = useGetTimeline(
        session!.accessToken,
        toDate,
        fromDate,
        10,
        space
    )
    console.log({posts, space});

    // TODO infinite scroll
    // TODO user profile pic should be part of session?.user

    const reloadTimeline = () => {
        setToDate(new Date().toISOString())
    }

    // TODO Form should be an own component (also for edit post)

    const onSubmitForm = async (event: FormEvent<HTMLFormElement>) => {
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
            await mutate(addNewPost, {
                populateCache: (newPost, posts) => {
                    return { success: true, posts: [newPost, ...posts.posts] };
                },
                revalidate: false,
            });
            ref.current?.reset()

        } catch (error) {
            console.error(error);
        }
    }

    if (isLoadingTimeline) {
        return (<><LoadingAnimation /></>)
    }

    if (error) {
        console.error(error);
        return (<>Error loading timeline. See console for details</>)
    }

    return (
        <>
            <div className={'p-4 my-8 bg-white rounded-3xl shadow-2xl '}>
                <form onSubmit={onSubmitForm} ref={ref}>
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
            </div>
            {!posts.length ? ( <div>Timeline is Empty</div>) : (<></>)}
            {posts.map((post, i) =>
                <TimelinePost key={i} post={post} reloadTimeline={reloadTimeline} />
            )}
        </>
    );
}