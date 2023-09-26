import AuthenticatedImage from '@/components/AuthenticatedImage';
import BoxHeadline from '@/components/BoxHeadline';
import LoadingAnimation from '@/components/LoadingAnimation';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';

Matching.auth = true;
export default function Matching() {
    const { data: session } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    const [matchedUserSnippets, setMatchedUserSnippets] = useState<BackendUserSnippet[]>([]);

    const getMatchingCandidates = () => {
        setLoading(true);
        fetchGET('/matching', session?.accessToken).then((data) => {
            data.matching_hits.sort((a: any, b: any) => b.score - a.score);
            setMatchedUserSnippets(data.matching_hits);
            setLoading(false);
        });
    };

    return (
        <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat min-h-[70vh]">
            <div className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-content">
                <div>
                    <h1 className="text-center font-bold text-4xl mb-2">Matching</h1>
                    <div className="text-center mb-14 w-[30rem]">
                        Klicke auf den Button, um deine Top 5 passenden poteniziellen Partner,
                        basierend auf deinem Profil, zu bekommen.
                    </div>
                    <div className="flex justify-around w-full mb-8">
                        <button
                            className={
                                'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={getMatchingCandidates}
                        >
                            <span>Partner finden</span>
                        </button>
                    </div>
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <div className="max-h-[30rem] overflow-y-auto content-scrollbar">
                            {matchedUserSnippets.map((snippet, index) => (
                                <li key={index} className="flex py-2">
                                    <div className="flex">
                                        <div className="flex justify-center items-center mx-4 font-bold text-3xl">
                                            {index + 1}
                                        </div>
                                        <div
                                            className="flex cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.push(
                                                    `/profile?username=${snippet.username}`
                                                );
                                            }}
                                        >
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={snippet.profile_pic}
                                                    alt={'Profilbild'}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline
                                                    title={
                                                        snippet.first_name + ' ' + snippet.last_name
                                                    }
                                                />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {snippet.institution}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
