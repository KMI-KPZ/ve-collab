import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';

export default function Languages() {
    const [languages, setLanguages] = useState(['']);

    const { data: session } = useSession();

    const router = useRouter();
    useEffect(() => {
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
        }
        fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
            (data) => {
                if (data.plan) {
                    if (data.plan.languages.length > 0) {
                        setLanguages(data.plan.languages);
                    } else {
                        setLanguages(['']);
                    }
                } else {
                    setLanguages(['']);
                }
            }
        );
    }, [session?.accessToken, router]);

    const handleSubmit = async () => {
        const response = await fetchPOST(
            '/planner/update_field',
            { plan_id: router.query.plannerId, field_name: 'languages', value: languages },
            session?.accessToken
        );
        console.log(response);
        console.log(languages);
    };

    const modifyLanguage = (index: number, value: string) => {
        let newLanguages = [...languages];
        newLanguages[index] = value;
        setLanguages(newLanguages);
    };

    const addInputField = (e: FormEvent) => {
        e.preventDefault();
        setLanguages([...languages, '']);
    };

    const removeInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...languages]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setLanguages(copy);
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            In welchen Sprachen findet der VE statt?
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        {languages.map((language, index) => (
                            <div key={index} className="mx-7 mt-7 flex justify-center">
                                <input
                                    type="text"
                                    value={language}
                                    onChange={(e) => modifyLanguage(index, e.target.value)}
                                    placeholder="Sprache eingeben"
                                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                />
                            </div>
                        ))}
                        <div className={'w-3/4 mx-7 mt-3 flex justify-end'}>
                            <button onClick={removeInputField}>
                                <RxMinus size={20} />
                            </button>
                            <button onClick={addInputField}>
                                <RxPlus size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link
                                href={{
                                    pathname: '/startingWizard/generalInformation/6targetGroups',
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
                                        '/startingWizard/generalInformation/8formalConditions',
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
