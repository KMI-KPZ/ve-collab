import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';

interface TargetGroup {
    name: string;
    age_min?: number;
    age_max?: number;
    experience: string;
    academic_course: string;
    mother_tongue: string;
    foreign_languages: string;
}

export default function TargetGroups() {
    const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([
        {
            name: '',
            age_min: undefined,
            age_max: undefined,
            experience: '',
            academic_course: '',
            mother_tongue: '',
            foreign_languages: '',
        },
        {
            name: '',
            age_min: undefined,
            age_max: undefined,
            experience: '',
            academic_course: '',
            mother_tongue: '',
            foreign_languages: '',
        },
    ]);

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false)
    const router = useRouter();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== "loading") {
            if (!session || session?.error === "RefreshAccessTokenError") {
                console.log("forced new signIn")
                signIn("keycloak");
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === "loading") {
            setLoading(true)
            return
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
            return
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false)
                    if (data.plan) {
                        if (data.plan.audience.length > 0) {
                            let list = data.plan.audience.map((targetGroup: any) => ({
                                name: targetGroup.name,
                                age_min: targetGroup.age_min,
                                age_max: targetGroup.age_max,
                                experience: targetGroup.experience,
                                academic_course: targetGroup.academic_course,
                                mother_tongue: targetGroup.mother_tongue,
                                foreign_languages: targetGroup.foreign_languages.language,
                            }));
                            setTargetGroups(list);
                        } else {
                            setTargetGroups([
                                {
                                    name: '',
                                    age_min: undefined,
                                    age_max: undefined,
                                    experience: '',
                                    academic_course: '',
                                    mother_tongue: '',
                                    foreign_languages: '',
                                },
                            ]);
                        }
                    } else {
                        setTargetGroups([
                            {
                                name: '',
                                age_min: undefined,
                                age_max: undefined,
                                experience: '',
                                academic_course: '',
                                mother_tongue: '',
                                foreign_languages: '',
                            },
                        ]);
                    }
                }
            );
        }
    }, [session, status, router]);

    const handleSubmit = async () => {
        let tgList: any[] = [];
        targetGroups.forEach((tg) => {
            let payload = {
                name: tg.name,
                age_min: tg.age_min,
                age_max: tg.age_max,
                experience: tg.experience,
                academic_course: tg.academic_course,
                mother_tongue: tg.mother_tongue,
                foreign_languages: { language: tg.foreign_languages },
            };
            tgList.push(payload);
        });
        await fetchPOST(
            '/planner/update_field',
            { plan_id: router.query.plannerId, field_name: 'audience', value: tgList },
            session?.accessToken
        );
    };

    const modifyName = (index: number, value: string) => {
        let newTargetGroups = [...targetGroups];
        newTargetGroups[index].name = value;
        setTargetGroups(newTargetGroups);
    };
    const modifyAgeMin = (index: number, value: number) => {
        let newTargetGroups = [...targetGroups];
        newTargetGroups[index].age_min = value;
        setTargetGroups(newTargetGroups);
    };
    const modifyAgeMax = (index: number, value: number) => {
        let newTargetGroups = [...targetGroups];
        newTargetGroups[index].age_max = value;
        setTargetGroups(newTargetGroups);
    };
    const modifyExperience = (index: number, value: string) => {
        let newTargetGroups = [...targetGroups];
        newTargetGroups[index].experience = value;
        setTargetGroups(newTargetGroups);
    };
    const modifyaAcademicCourse = (index: number, value: string) => {
        let newTargetGroups = [...targetGroups];
        newTargetGroups[index].academic_course = value;
        setTargetGroups(newTargetGroups);
    };
    const modifyMotherTounge = (index: number, value: string) => {
        let newTargetGroups = [...targetGroups];
        newTargetGroups[index].mother_tongue = value;
        setTargetGroups(newTargetGroups);
    };
    const modifyForeignLanguages = (index: number, value: string) => {
        let newTargetGroups = [...targetGroups];
        newTargetGroups[index].foreign_languages = value;
        setTargetGroups(newTargetGroups);
    };

    const addBox = (e: FormEvent) => {
        e.preventDefault();
        setTargetGroups([
            ...targetGroups,
            {
                name: '',
                age_min: undefined,
                age_max: undefined,
                experience: '',
                academic_course: '',
                mother_tongue: '',
                foreign_languages: '',
            },
        ]);
    };

    const removeBox = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...targetGroups]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setTargetGroups(copy);
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Beschreibe alle Zielgruppen
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="flex flex-wrap justify-center">
                                {targetGroups.map((targetGroup, index) => (
                                    <div key={index} className="mx-2">
                                        <WhiteBox>
                                            <div className="mt-4 flex">
                                                <div className="w-1/4 flex items-center">
                                                    <label htmlFor="name" className="px-2 py-2">
                                                        Name
                                                    </label>
                                                </div>
                                                <div className="w-3/4">
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={targetGroup.name}
                                                        onChange={(e) =>
                                                            modifyName(index, e.target.value)
                                                        }
                                                        placeholder="Name eingeben"
                                                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex">
                                                <div className="w-1/4 flex items-center">
                                                    <label htmlFor="age" className="px-2 py-2">
                                                        Alter
                                                    </label>
                                                </div>
                                                <div className="w-3/4 flex">
                                                    <input
                                                        type="number"
                                                        name="age"
                                                        value={targetGroup.age_min}
                                                        onChange={(e) =>
                                                            modifyAgeMin(index, Number(e.target.value))
                                                        }
                                                        placeholder="von"
                                                        className="border border-gray-500 rounded-lg w-1/2 h-12 p-2 mr-2"
                                                    />
                                                    <input
                                                        type="number"
                                                        name="age"
                                                        value={targetGroup.age_max}
                                                        onChange={(e) =>
                                                            modifyAgeMax(index, Number(e.target.value))
                                                        }
                                                        placeholder="bis"
                                                        className="border border-gray-500 rounded-lg w-1/2 h-12 p-2 ml-2"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex">
                                                <div className="w-1/4 flex items-center">
                                                    <label htmlFor="experience" className="px-2 py-2">
                                                        Erfahrung
                                                    </label>
                                                </div>
                                                <div className="w-3/4">
                                                    <textarea
                                                        rows={3}
                                                        name="experience"
                                                        value={targetGroup.experience}
                                                        onChange={(e) =>
                                                            modifyExperience(index, e.target.value)
                                                        }
                                                        placeholder="welche Erfahrung hat die Zielgruppe bereits?"
                                                        className="border border-gray-500 rounded-lg w-full p-2"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex">
                                                <div className="w-1/4 flex items-center">
                                                    <label
                                                        htmlFor="academic_course"
                                                        className="px-2 py-2"
                                                    >
                                                        Studiengang
                                                    </label>
                                                </div>
                                                <div className="w-3/4">
                                                    <input
                                                        type="text"
                                                        name="academic_course"
                                                        value={targetGroup.academic_course}
                                                        onChange={(e) =>
                                                            modifyaAcademicCourse(index, e.target.value)
                                                        }
                                                        placeholder="Studiengang eingeben"
                                                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex">
                                                <div className="w-1/4 flex items-center">
                                                    <label htmlFor="motherTongue" className="px-2 py-2">
                                                        Muttersprache
                                                    </label>
                                                </div>
                                                <div className="w-3/4">
                                                    <input
                                                        type="text"
                                                        name="motherTongue"
                                                        value={targetGroup.mother_tongue}
                                                        onChange={(e) =>
                                                            modifyMotherTounge(index, e.target.value)
                                                        }
                                                        placeholder="Muttersprache eingeben"
                                                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex">
                                                <div className="w-1/4 flex items-center">
                                                    <label
                                                        htmlFor="foreignLanguages"
                                                        className="px-2 py-2"
                                                    >
                                                        Fremdsprache(n)
                                                    </label>
                                                </div>
                                                <div className="w-3/4">
                                                    <input
                                                        type="text"
                                                        name="foreignLanguages"
                                                        value={targetGroup.foreign_languages}
                                                        onChange={(e) =>
                                                            modifyForeignLanguages(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="mehrere durch Komma trennen"
                                                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                    />
                                                </div>
                                            </div>
                                        </WhiteBox>
                                    </div>
                                ))}
                            </div>
                            <div className={'mx-2 flex justify-end'}>
                                <button onClick={removeBox}>
                                    <RxMinus size={20} />
                                </button>{' '}
                                {/* todo state + useeffect to create more input fields*/}
                                <button onClick={addBox}>
                                    <RxPlus size={20} />
                                </button>{' '}
                                {/* todo state + useeffect to create more input fields*/}
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/5veTopic',
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
                                        pathname: '/startingWizard/generalInformation/7languages',
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
                )}
                <SideProgressBarSection />
            </div>
        </>
    );
}
