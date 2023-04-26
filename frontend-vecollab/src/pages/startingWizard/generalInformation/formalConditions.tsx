import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Parameters() {
    const router = useRouter();
    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Checkt die folgenden formalen Rahmenbedingungen
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        <div className="mx-7 mt-7 flex justify-center">
                            <div className="w-1/2">
                                <div className="flex my-3">
                                    <div className="w-1/2">
                                        <label htmlFor="technik" className="px-2 py-2">
                                            Technik
                                        </label>
                                    </div>
                                    <div className="w-1/2 flex justify-center items-center">
                                        <input
                                            type="checkbox"
                                            /*onChange={handleChange}*/
                                            name="technik"
                                            className="border border-gray-500 rounded-lg w-4 h-4 p-2"
                                        />
                                    </div>
                                </div>
                                <div className="flex my-3">
                                    <div className="w-1/2">
                                        <label htmlFor="exam" className="px-2 py-2">
                                            Prüfungsordnung
                                        </label>
                                    </div>
                                    <div className="w-1/2 flex justify-center items-center">
                                        <input
                                            type="checkbox"
                                            /*onChange={handleChange}*/
                                            name="exam"
                                            className="border border-gray-500 rounded-lg w-4 h-4 p-2"
                                        />
                                    </div>
                                </div>
                                <div className="flex my-3">
                                    <div className="w-1/2">
                                        <label htmlFor="more" className="px-2 py-2">
                                            ...
                                        </label>
                                    </div>
                                    <div className="w-1/2 flex justify-center items-center">
                                        <input
                                            type="checkbox"
                                            /*onChange={handleChange}*/
                                            name="more"
                                            className="border border-gray-500 rounded-lg w-4 h-4 p-2"
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
                                    pathname: '/startingWizard/generalInformation/tools',
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
                                    pathname: '/startingWizard/broadPlanner',
                                    query: { plannerId: router.query.plannerId },
                                }}
                            >
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
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
