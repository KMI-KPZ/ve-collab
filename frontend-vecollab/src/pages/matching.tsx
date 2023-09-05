import { fetchGET } from "@/lib/backend";
import { useSession } from "next-auth/react";

export default function Matching() {
    const {data: session} = useSession();

    const getMatchingCandidates = () => {
        fetchGET("/matching", session?.accessToken).then((data) => {
            console.log(data);
        })
    };
    return (
        <div className="flex min-h-[70vh] items-center justify-center">
            <div>
                <h1 className="flex justify-center">Matching</h1>
                <button
                    className={
                        'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                    }
                    onClick={getMatchingCandidates}
                >
                    <span>Partner finden</span>
                </button>
            </div>
        </div>
    );
}
