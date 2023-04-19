import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useContext, useEffect } from 'react';
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
    // TODO Error Message Anzeigen
    // TODO Error inputs werden nicht gesavt
    // TODO Inputs nur gesavt wenn auf weiter
    const fetchLastInputs = async (): Promise<FormData> => {
        return await fetchGET(`/planner/get?_id=${planId}`, session?.accessToken).then((data) => {
            return data.plan.topic != null ? { topic: data.plan.topic } : { topic: '' };
        });
    };

    const {
        watch,
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ mode: 'onChange', defaultValues: async () => fetchLastInputs() });

    const onSubmit: SubmitHandler<FormData> = async () => {
        await fetchPOST(
            '/planner/update_field',
            { plan_id: planId, field_name: 'topic', value: watch('topic') },
            session?.accessToken
        );
        await router.push('/startingWizard/generalInformation/6targetGroups');
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
                            zu welchem Thema soll der VE stattfinden?
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        <div className="m-7 flex justify-center">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Thema eingeben"
                                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                    {...register('topic', {
                                        maxLength: {
                                            value: 50,
                                            message:
                                                'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                        },
                                        pattern: {
                                            value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                            message:
                                                'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?-',
                                        },
                                    })}
                                />
                                <p className="text-red-600 pt-2">{errors.topic?.message}</p>
                            </div>
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
                            <button
                                type="submit"
                                className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                            >
                                Weiter
                            </button>
                        </div>
                    </div>
                </form>
                <SideProgressBarSection />
            </div>
        </>
    );
}
