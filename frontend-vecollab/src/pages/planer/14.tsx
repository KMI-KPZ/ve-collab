import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { PlanIdContext } from '../_app';
import { useRouter } from 'next/router';

export default function NewContent() {
    const [newContent, setNewContent] = useState('');

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
        });
    }, [planId, session?.accessToken, router]);

    const handleSubmit = async (e: FormEvent) => {
        let boolVal = null;
        if (newContent === 'true') {
            boolVal = true;
        } else if (newContent === 'false') {
            boolVal = false;
        }
        const response = await fetchPOST(
            '/planner/update_field',
            { plan_id: planId, field_name: 'new_content', value: boolVal },
            session?.accessToken
        );
        console.log(response);
        console.log(newContent);
    };

    console.log(newContent);

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
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
                            <Link href={'/planer/13'}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={'/planer/15'}>
                                {' '}
                                {/* for now just go on page back even on success to not lose the planId context*/}
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
