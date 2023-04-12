import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { PlanIdContext } from '../_app';
import { useRouter } from 'next/router';

export default function Partners() {
    const { planId, setPlanId } = useContext(PlanIdContext);

    const { data: session } = useSession();

    const [partners, setPartners] = useState(['']);
    //console.log(planId)

    const router = useRouter();
    useEffect(() => {
        if (!planId) {
            router.push('/overviewProjects');
        }

        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken).then((data) => {
            console.log(data);
            if (data.plan) {
                if (data.plan.involved_parties.length > 0) {
                    setPartners(data.plan.involved_parties);
                } else {
                    setPartners(['']);
                }
            } else {
                setPartners(['']);
            }
        });
    }, [planId, session?.accessToken, router]);

    const modifyPartner = (index: number, value: string) => {
        console.log(value);
        console.log(index);
        let newPartners = [...partners];
        newPartners[index] = value;
        setPartners(newPartners);
    };

    const addInputField = (e: FormEvent) => {
        e.preventDefault();
        setPartners([...partners, '']);
    };

    const removeInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...partners]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setPartners(copy);
    };

    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST(
            '/planner/update_field',
            { plan_id: planId, field_name: 'involved_parties', value: partners },
            session?.accessToken
        );
        console.log(response);
        console.log(partners);
    };

    //console.log(partners)

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Füge deine Partner hinzu
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        {partners.map((partner, index) => (
                            <div key={index} className="mx-7 mt-7 flex justify-center">
                                <input
                                    type="text"
                                    value={partner}
                                    onChange={(e) => modifyPartner(index, e.target.value)}
                                    placeholder="Name eingeben"
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
                            <Link href={'/planer/1'}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={'/planer/3'}>
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
