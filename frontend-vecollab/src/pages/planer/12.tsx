import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { PlanIdContext } from '../_app';
import { useRouter } from 'next/router';

export default function LearningEnvironment() {
    const [environment, setEnvironment] = useState('');

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
                if (data.plan.learning_env) {
                    setEnvironment(data.plan.learning_env);
                }
            } else {
                setEnvironment('');
            }
        });
    }, [planId, session?.accessToken, router]);

    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST(
            '/planner/update_field',
            { plan_id: planId, field_name: 'learning_env', value: environment },
            session?.accessToken
        );
        console.log(response);
        console.log(environment);
    };

    console.log(environment);

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Was ist die digitale Lernumgebung?
                        </div>
                        <div className={'text-center '}>optional</div>
                        <div className={'text-center mb-20'}>
                            Wo können die Infos/Aufgaben für die Studiernden zur Verfügung gestellt
                            und umgesetzt werden?
                        </div>
                        <div className="mt-4 flex justify-center">
                            <textarea
                                rows={5}
                                value={environment}
                                onChange={(e) => setEnvironment(e.target.value)}
                                placeholder="z.B. Moodle, ..."
                                className="border border-gray-500 rounded-lg w-3/4 p-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={'/planer/11'}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={'/planer/13'}>
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
