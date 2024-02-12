import { useGetMyTimeline, useGetTimeline } from "@/lib/backend";
import { useSession } from "next-auth/react";
import LoadingAnimation from "../LoadingAnimation";
import TimelinePost from "./TimelinePost";
import { useState } from "react";

interface Props {
    room?: string;
}

Timeline.auth = true
export default function Timeline({ room }: Props) {
    const { data: session, status } = useSession();
    const [toDate] = useState(new Date().toISOString());


    // TODO use specific room or personal
    const {
        data: timeline,
        isLoading,
        error,
        mutate,
    } = useGetMyTimeline(session!.accessToken, toDate);
    console.log({timeline});

    if (isLoading) {
        return (<><LoadingAnimation /></>)
    }

    if (error) {
        console.log(error);
        return (<>{error}</>)
    }

    return (
        <>
        {timeline.map((post, i) =>
            <TimelinePost key={i} post={post} mutate={mutate} />
        )}
        </>
    );
}