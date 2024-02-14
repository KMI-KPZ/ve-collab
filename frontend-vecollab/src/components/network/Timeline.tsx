import { fetchPOST, fetchPOSTAsFormdata, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { FormEvent, useState } from "react";
import { IoIosSend } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";

interface Props {
    space?: string | undefined;
}

Timeline.auth = true
export default function Timeline({ space }: Props) {
    const { data: session } = useSession();
    const [toDate, setToDate] = useState(new Date().toISOString());

    const now = new Date()
    const [fromDate] = useState( new Date(now.setFullYear( now.getFullYear() - 1 )).toISOString());
    // TODO fromDate is just a dummy until /timline/[space] supports the 'limit' parameter

    const {
        data: timeline,
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
    console.log({timeline, space});

    // TODO infinite scroll
    // TODO user profile pic should be part of session?.user

    const onSubmitForm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        const text = (formData.get('text') as string).trim()

        if (text === '')  return

        // TODO currently we reload the whole timeline
        //  to only load the new post the endpoint "/posts" may should return the newly added post which
        //  we can append here
        //  see https://blog.logrocket.com/handling-data-fetching-next-js-useswr/#mutation-revalidation
        //  alternative we load posts fromDate (last toDate) toDate (new now) and append

        try {
            await fetchPOST(
                '/posts',
                {
                    text,
                    tags: []
                },
                session?.accessToken,
                true
            )
            setToDate(new Date().toISOString())
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
                <form onSubmit={onSubmitForm}>
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
            {!timeline.length ? ( <div>Timeline is Empty</div>) : (<></>)}
            {timeline.map((post, i) =>
                <TimelinePost key={i} post={post} mutate={mutate} />
            )}
        </>
    );
}