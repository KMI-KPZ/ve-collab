import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import Link from 'next/link';
import { FormEvent } from 'react';
import { useRouter } from 'next/router';

export default function Finished() {
    const router = useRouter();
    const handleSubmit = async (e: FormEvent) => {};

    return (
        <>
            <HeadProgressBarSection stage={3} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>Fertig</div>
                        <div className={'text-center mb-20'}>
                            herzlichen Glückwunsch, du hast den VE erfolgreich geplant!
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link
                                href={{
                                    pathname: '/startingWizard/finePlanner',
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
                            <Link href={'/overviewProjects'}>
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={handleSubmit}
                                >
                                    Weiter zur Übersicht
                                </button>
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
