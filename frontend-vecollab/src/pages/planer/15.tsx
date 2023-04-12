import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { PlanIdContext } from '../_app';
import { useRouter } from 'next/router';

interface BroadStep {
    from: string;
    to: string;
    name: string;
}

export default function BroadStages() {
    const [steps, setSteps] = useState<BroadStep[]>([
        { from: '', to: '', name: '' },
        { from: '', to: '', name: '' },
    ]);

    const { planId, setPlanId } = useContext(PlanIdContext);
    const { data: session } = useSession();

    //console.log(planId)

    const router = useRouter();
    useEffect(() => {
        if (!planId) {
            router.push('/planer/overview');
        }
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken).then((data) => {
            console.log(data);

            if (data.plan) {
                if (data.plan.steps.length > 0) {
                    let list = data.plan.steps.map((step: any) => ({
                        name: step.name,
                        from: step.timestamp_from.split('T')[0],
                        to: step.timestamp_to.split('T')[0],
                    }));
                    setSteps(list);
                } else {
                    setSteps([{ from: '', to: '', name: '' }]);
                }
            } else {
                setSteps([{ from: '', to: '', name: '' }]);
            }
        });
    }, [planId, session?.accessToken, router]);

    const handleSubmit = async (e: FormEvent) => {
        steps.forEach(async (step) => {
            let payload = {
                name: step.name,
                workload: 0,
                timestamp_from: step.from,
                timestamp_to: step.to,
                social_form: null,
                learning_env: null,
                ve_approach: null,
                tasks: [],
                evaluation_tools: [],
                attachments: [],
                custom_attributes: {},
            };
            const response = await fetchPOST(
                '/planner/append_step',
                { plan_id: planId, step: payload },
                session?.accessToken
            );
            console.log(response);
        });
        console.log(steps);
    };

    const modifyName = (index: number, value: string) => {
        let newSteps = [...steps];
        newSteps[index].name = value;
        setSteps(newSteps);
    };
    const modifyFrom = (index: number, value: string) => {
        let newSteps = [...steps];
        newSteps[index].from = value;
        setSteps(newSteps);
    };
    const modifyTo = (index: number, value: string) => {
        let newSteps = [...steps];
        newSteps[index].to = value;
        setSteps(newSteps);
    };

    const addBox = (e: FormEvent) => {
        e.preventDefault();
        setSteps([...steps, { from: '', to: '', name: '' }]);
    };

    const removeBox = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...steps]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setSteps(copy);
    };

    console.log(steps);

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Plane den groben Ablauf
                        </div>
                        <div className={'text-center mb-20'}>
                            erstelle beliebig viele Etappen, setze deren Daten und vergib für jede
                            einen individuellen Namen
                        </div>
                        {steps.map((step, index) => (
                            <WhiteBox key={index}>
                                <div className="flex justify-center items-center">
                                    <label htmlFor="from" className="">
                                        von:
                                    </label>
                                    <input
                                        type="date"
                                        name="from"
                                        value={step.from}
                                        onChange={(e) => modifyFrom(index, e.target.value)}
                                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                                    />
                                    <label htmlFor="to" className="">
                                        bis:
                                    </label>
                                    <input
                                        type="date"
                                        name="to"
                                        value={step.to}
                                        onChange={(e) => modifyTo(index, e.target.value)}
                                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                                    />
                                    <input
                                        type="text"
                                        value={step.name}
                                        onChange={(e) => modifyName(index, e.target.value)}
                                        placeholder="Name, z.B. Kennenlernphase"
                                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                                    />
                                </div>
                            </WhiteBox>
                        ))}
                        <div className={'w-3/4 mx-7 mt-3 flex justify-end'}>
                            <button onClick={removeBox}>
                                <RxMinus size={20} />
                            </button>
                            <button onClick={addBox}>
                                <RxPlus size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={'/planer/14'}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={'/planer/16'}>
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
