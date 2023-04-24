import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useContext } from 'react';
import { PlanIdContext } from '@/pages/_app';
import { useRouter } from 'next/router';
import { SubmitHandler, useForm } from 'react-hook-form';

interface FormData {
    projectName: string;
}

export default function EssentialInformation() {
    const router = useRouter();
    const fetchLastInputs = async (): Promise<FormData> => {
        return await fetchGET(`/planner/get?_id=${planId}`, session?.accessToken).then((data) => {
            return data.plan.projectName != null
                ? { projectName: data.plan.projectName }
                : { projectName: '' };
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
            '/planner/insert_empty',
            { name: watch('projectName') },
            session?.accessToken
        );
        await router.push('/startingWizard/generalInformation/2partners');
    };

    const { data: session } = useSession();

    const { planId } = useContext(PlanIdContext);

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={'text-center font-bold text-4xl mb-20'}>
                            Gib deinem Projekt einen Namen
                        </div>
                        <div className="m-7 flex justify-center">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Name eingeben"
                                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                    {...register('projectName', {
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
                                <p className="text-red-600 pt-2">{errors.projectName?.message}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <button
                                type="button"
                                className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg invisible"
                            >
                                Zurück
                            </button>
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
