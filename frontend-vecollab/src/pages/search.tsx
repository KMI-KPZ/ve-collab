import LoadingAnimation from "@/components/LoadingAnimation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

SearchResult.auth = true;
export default function SearchResult() {
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!router.isReady) return

        setLoading(false)
    }, [router])

    const Wrapper = ({children}: {children: JSX.Element}) => {
        return (
            <div className="bg-slate-100">
                <div className="flex flex-col m-auto p-12 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">
                    <div className="w-1/2">
                        {children}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Wrapper>
             <>
                <div className="font-bold text-4xl mb-2">Search Results for "{router.query.query}"</div>
                {loading ? (<LoadingAnimation />) : (<>TODO</>)}
             </>
        </Wrapper>
    )
}