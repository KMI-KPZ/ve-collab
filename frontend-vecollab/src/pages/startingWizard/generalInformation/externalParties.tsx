import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';

export default function ExternalPersons() {
    const [externals, setExternals] = useState(['']);

    const router = useRouter();

    const handleSubmit = () => {
        console.log(externals);
    };

    const modifyExternals = (index: number, value: string) => {
        let newExternals = [...externals];
        newExternals[index] = value;
        setExternals(newExternals);
    };

    const addInputField = (e: FormEvent) => {
        e.preventDefault();
        setExternals([...externals, '']);
    };

    const removeInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...externals]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setExternals(copy);
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Gibt es externe Beteiligte?
                        </div>
                        <div className={'text-center mb-20'}>
                            optional, falls ja, benenne diese, ansonsten einfach weiter
                        </div>
                        {externals.map((externalPerson, index) => (
                            <div key={index} className="mt-4 flex justify-center">
                                <input
                                    type="text"
                                    value={externalPerson}
                                    onChange={(e) => modifyExternals(index, e.target.value)}
                                    placeholder="Name eingeben"
                                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                />
                            </div>
                        ))}
                        <div className={'mx-2 flex justify-end mr-14 mt-2'}>
                            <button onClick={removeInputField}>
                                <RxMinus size={20} />
                            </button>{' '}
                            {/* todo state + useeffect to create more input fields*/}
                            <button onClick={addInputField}>
                                <RxPlus size={20} />
                            </button>{' '}
                            {/* todo state + useeffect to create more input fields*/}
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link
                                href={{
                                    pathname: '/startingWizard/generalInformation/partners',
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
                                    pathname: '/startingWizard/generalInformation/institutions',
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
