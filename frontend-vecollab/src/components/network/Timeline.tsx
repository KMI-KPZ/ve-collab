import { useGetMyTimeline, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { useState } from "react";

interface Props {
    space?: string;
}

Timeline.auth = true
export default function Timeline({ space }: Props) {
    const { data: session } = useSession();
    const [toDate] = useState(new Date().toISOString());

    const now = new Date()
    const [fromDate] = useState( new Date(now.setFullYear( now.getFullYear() - 1 )).toISOString());
    // TODO fromDate is just a dummy until /timline/[space] supports the 'limit' parameter

    const {
        data: timeline,
        isLoading,
        error,
        mutate,
    } = space
        ? useGetTimeline(session!.accessToken, space, fromDate, toDate)
        : useGetMyTimeline(session!.accessToken, toDate)
    console.log({timeline, space});

    if (isLoading) {
        return (<><LoadingAnimation /></>)
    }

    if (error) {
        console.error(error);
        return (<>Error loading timeline. See console for details</>)
    }

    return (
        <>
            {!timeline.length ? ( <div>Timeline is Empty</div>) : (<></>)}
            {timeline.map((post, i) =>
                <TimelinePost key={i} post={post} mutate={mutate} />
            )}
        </>
    );
}