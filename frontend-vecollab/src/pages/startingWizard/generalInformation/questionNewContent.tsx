import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function NewContent() {
    const [newContent, setNewContent] = useState('');

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false)
    const router = useRouter();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== "loading") {
            if (!session || session?.error === "RefreshAccessTokenError") {
                console.log("forced new signIn")
                signIn("keycloak");
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === "loading") {
            setLoading(true)
            return
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
            return
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false)
                    if (data.plan) {
                        if (data.plan.new_content != null) {
                            let strVal = '';
                            if (data.plan.new_content === true) {
                                strVal = 'true';
                            } else if (data.plan.new_content === false) {
                                strVal = 'false';
                            }
                            setNewContent(strVal);
                        }
                    } else {
                        setNewContent('');
                    }
                }
            );
        }
    }, [session, status, router]);

    const handleSubmit = async () => {
        let boolVal = null;
        if (newContent === 'true') {
            boolVal = true;
        } else if (newContent === 'false') {
            boolVal = false;
        }
        await fetchPOST(
            '/planner/update_field',
            { plan_id: router.query.plannerId, field_name: 'new_content', value: boolVal },
            session?.accessToken
        );
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Werden Sie neue Inhalte für den VE erstellen und bestehende Teile der
                                Lehrveranstaltungen anpassen?
                            </div>
                            <div className={'mb-20'}></div>
                            <div className="mt-4 flex justify-center">
                                <div className="w-1/6">
                                    <div className="flex my-1">
                                        <div className="w-1/2">
                                            <label htmlFor="radio" className="px-2 py-2">
                                                Ja
                                            </label>
                                        </div>
                                        <div className="w-1/2">
                                            <input
                                                type="radio"
                                                name="radio"
                                                value={'true'}
                                                checked={newContent === 'true'}
                                                onChange={(e) => setNewContent(e.target.value)}
                                                className="border border-gray-500 rounded-lg p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex my-1">
                                        <div className="w-1/2">
                                            <label htmlFor="radio" className="px-2 py-2">
                                                Nein
                                            </label>
                                        </div>
                                        <div className="w-1/2">
                                            <input
                                                type="radio"
                                                name="radio"
                                                value={'false'}
                                                checked={newContent === 'false'}
                                                onChange={(e) => setNewContent(e.target.value)}
                                                placeholder="Name eingeben"
                                                className="border border-gray-500 rounded-lg p-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/languages',
                                        query: { plannerId: router.query.plannerId },
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    >
                                        Zurück
                                    </button>
                                </Link>
                            </div>
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/goals',
                                        query: { plannerId: router.query.plannerId },
                                    }}
                                >
                                    <button
                                        type="submit"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                        onClick={handleSubmit}
                                    >
                                        Weiter
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection />
            </div>
        </>
    );
}
