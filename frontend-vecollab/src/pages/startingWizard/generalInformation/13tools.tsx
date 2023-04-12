import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { PlanIdContext } from '@/pages/_app';

export default function Tools() {
    const [tools, setTools] = useState(['']);

    const { planId, setPlanId } = useContext(PlanIdContext);
    const { data: session } = useSession();

    //console.log(planId)

    const router = useRouter();
    useEffect(() => {
        if (!planId) {
            router.push('/overviewProjects');
        }
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken).then((data) => {
            console.log(data);
            if (data.plan) {
                if (data.plan.tools.length > 0) {
                    setTools(data.plan.tools);
                } else {
                    setTools(['']);
                }
            } else {
                setTools(['']);
            }
        });
    }, [planId, session?.accessToken, router]);

    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST(
            '/planner/update_field',
            { plan_id: planId, field_name: 'tools', value: tools },
            session?.accessToken
        );
        console.log(response);
        console.log(tools);
    };

    const modifyTools = (index: number, value: string) => {
        let newTools = [...tools];
        newTools[index] = value;
        setTools(newTools);
    };

    const addInputField = (e: FormEvent) => {
        e.preventDefault();
        setTools([...tools, '']);
    };

    const removeInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...tools]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setTools(copy);
    };

    console.log(tools);

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Mit welchen Tools können die Studierenden arbeiten?
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        {tools.map((tool, index) => (
                            <div key={index} className="mt-4 flex justify-center">
                                <input
                                    type="text"
                                    value={tool}
                                    onChange={(e) => modifyTools(index, e.target.value)}
                                    placeholder="Tool eingeben"
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
                            <Link href={'/startingWizard/generalInformation/12learningPlatform'}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={'/startingWizard/generalInformation/14questionNewContent'}>
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
