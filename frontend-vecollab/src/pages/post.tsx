import LoadingAnimation from "@/components/LoadingAnimation";
import TimelinePost from "@/components/network/TimelinePost";
import { useGetPost } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

Post.auth = true;
export default function Post() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const {
        data,
        isLoading,
        error,
        mutate,
    } = useGetPost(
        session!.accessToken, router.query.id as string)

    console.log('post', {data});

    if (error) {
        console.error(error);
        return (<>Error loading post. See console for details</>)
    }

    return (
        <div className="bg-slate-100">
            <div className="flex flex-col m-auto p-12 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">

                <div className="w-1/2">

                    {isLoading ? (
                        <LoadingAnimation />
                    ) : (
                        <TimelinePost
                                post={data}
                                updatePost={() => {}}
                                userIsAdmin={false}
                                isLast={false}
                                removePost={() => {}}
                                // sharePost={post => {}}
                                fetchNextPosts={() => {}}
                                updatePinnedPosts={mutate}
                            />
                    )}

                </div>
            </div>
        </div>
    )
}