import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PlanIdContext } from '@/pages/_app';
import { useForm, SubmitHandler } from 'react-hook-form';

interface FormData {
    topic: string;
}

export default function Topic() {
    const { planId } = useContext(PlanIdContext);
    const { data: session } = useSession();

    const router = useRouter();
    useEffect(() => {
        if (!planId) {
            router.push('/overviewProjects');
        }
    }, [planId, session?.accessToken, router]);

    // TODO Error handlen in API response
    // TODO Valdierungskiterien anlegen
    // TODO Error Message Anzeigen
    const fetchLastInputs = async (): Promise<FormData> => {
        return await fetchGET(`/planner/get?_id=${planId}`, session?.accessToken).then((data) => {
            return data.plan.topic != null ? { topic: data.plan.topic } : { topic: '' };
        });
    };

    const {
        getValues,
        register,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<FormData>({ mode: 'onChange', defaultValues: async () => fetchLastInputs() });
    const onSubmit: SubmitHandler<FormData> = async () => {
        await fetchPOST(
            '/planner/update_field',
            { plan_id: planId, field_name: 'topic', value: getValues('topic') },
            session?.accessToken
        );
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            zu welchem Thema soll der VE statfinden?
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        <div className="m-7 flex justify-center">
                            <input
                                type="text"
                                placeholder="Thema eingeben"
                                className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                {...register('topic', { required: true })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={'/startingWizard/generalInformation/4participatingCourses'}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            {isValid ? (
                                <Link href={'/startingWizard/generalInformation/6targetGroups'}>
                                    <button
                                        type="submit"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    >
                                        Weiter
                                    </button>
                                </Link>
                            ) : (
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Weiter
                                </button>
                            )}
                        </div>
                    </div>
                </form>
                <SideProgressBarSection />
            </div>
        </>
    );
}
