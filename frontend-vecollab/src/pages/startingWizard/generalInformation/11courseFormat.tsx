import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Realization() {
    const [realization, setRealization] = useState('');

    const { data: session } = useSession();

    const router = useRouter();
    useEffect(() => {
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
        }
        fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
            (data) => {
                console.log(data);
                if (data.plan) {
                    if (data.plan.realization) {
                        setRealization(data.plan.realization);
                    }
                } else {
                    setRealization('');
                }
            }
        );
    }, [session?.accessToken, router]);

    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST(
            '/planner/update_field',
            { plan_id: router.query.plannerId, field_name: 'realization', value: realization },
            session?.accessToken
        );
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Wie wird der VE umgesetzt?
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        <div className="mx-7 mt-7 flex justify-center">
                            <select
                                value={realization}
                                onChange={(e) => setRealization(e.target.value)}
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                            >
                                <option value="">keine Auswahl</option>
                                <option value="asynchron">asynchron</option>
                                <option value="synchron">synchron</option>
                                <option value="gemischt">gemischt</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link
                                href={{
                                    pathname:
                                        '/startingWizard/generalInformation/10externalParties',
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
                                    pathname:
                                        '/startingWizard/generalInformation/12learningPlatform',
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
                <SideProgressBarSection />
            </div>
        </>
    );
}
