import WhiteBox from '@/components/Layout/WhiteBox';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';

interface Institution {
    name: string;
    school_type: string;
    country: string;
    department: string;
    academic_courses: string;
}

export default function Institutions() {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const { data: session } = useSession();

    const router = useRouter();
    useEffect(() => {
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
        }
        fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
            (data) => {
                if (data.plan) {
                    if (data.plan.institutions.length > 0) {
                        let list = data.plan.institutions.map((institution: any) => ({
                            name: institution.name,
                            school_type: institution.school_type,
                            country: institution.country,
                            department: institution.departments[0].name,
                            academic_courses: institution.departments[0].academic_courses[0].name,
                        }));
                        setInstitutions(list);
                    } else {
                        setInstitutions([
                            {
                                name: '',
                                school_type: '',
                                country: '',
                                department: '',
                                academic_courses: '',
                            },
                        ]);
                    }
                } else {
                    setInstitutions([
                        {
                            name: '',
                            school_type: '',
                            country: '',
                            department: '',
                            academic_courses: '',
                        },
                    ]);
                }
            }
        );
    }, [session?.accessToken, router]);

    const handleSubmit = async () => {
        let institutionsList: any[] = [];
        institutions.forEach((institution) => {
            let payload = {
                name: institution.name,
                school_type: institution.school_type,
                country: institution.country,
                departments: [
                    {
                        name: institution.department,
                        academic_courses: [
                            {
                                name: institution.academic_courses,
                            },
                        ],
                    },
                ],
            };
            institutionsList.push(payload);
        });
        await fetchPOST(
            '/planner/update_field',
            {
                plan_id: router.query.plannerId,
                field_name: 'institutions',
                value: institutionsList,
            },
            session?.accessToken
        );
    };

    const modifyName = (index: number, value: string) => {
        let newInstitutions = [...institutions];
        newInstitutions[index].name = value;
        setInstitutions(newInstitutions);
    };
    const modifySchoolType = (index: number, value: string) => {
        let newInstitutions = [...institutions];
        newInstitutions[index].school_type = value;
        setInstitutions(newInstitutions);
    };
    const modifyCountry = (index: number, value: string) => {
        let newInstitutions = [...institutions];
        newInstitutions[index].country = value;
        setInstitutions(newInstitutions);
    };
    const modifyDepartment = (index: number, value: string) => {
        let newInstitutions = [...institutions];
        newInstitutions[index].department = value;
        setInstitutions(newInstitutions);
    };
    const modifyAcademicCourses = (index: number, value: string) => {
        let newInstitutions = [...institutions];
        newInstitutions[index].academic_courses = value;
        setInstitutions(newInstitutions);
    };

    const addInstitutionBox = (e: FormEvent) => {
        e.preventDefault();
        setInstitutions([
            ...institutions,
            { name: '', school_type: '', country: '', department: '', academic_courses: '' },
        ]);
    };

    const removeInstitutionBox = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...institutions]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setInstitutions(copy);
    };

    console.log(institutions);

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>
                            Beschreibe die teilnehmenden Institutionen
                        </div>
                        <div className={'text-center mb-20'}>optional</div>
                        <div className={'flex flex-wrap justify-center'}>
                            {institutions.map((institution, index) => (
                                <div key={index} className={'mx-2'}>
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
                                                    value={institution.name}
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
                                                <label htmlFor="schoolType" className="px-2 py-2">
                                                    Schulform
                                                </label>
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="text"
                                                    name="schoolType"
                                                    value={institution.school_type}
                                                    onChange={(e) =>
                                                        modifySchoolType(index, e.target.value)
                                                    }
                                                    placeholder="Schulform eingeben"
                                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/4 flex items-center">
                                                <label htmlFor="country" className="px-2 py-2">
                                                    Land
                                                </label>
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="text"
                                                    name="country"
                                                    value={institution.country}
                                                    onChange={(e) =>
                                                        modifyCountry(index, e.target.value)
                                                    }
                                                    placeholder="Land eingeben"
                                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/3 flex items-center">
                                                <label htmlFor="department" className="px-2 py-2">
                                                    Abteilungsname
                                                </label>
                                            </div>
                                            <div className="w-2/3">
                                                <input
                                                    type="text"
                                                    name="deaprtment"
                                                    value={institution.department}
                                                    onChange={(e) =>
                                                        modifyDepartment(index, e.target.value)
                                                    }
                                                    placeholder="Abteilungsname eingeben"
                                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/3 flex items-center">
                                                <label
                                                    htmlFor="academicCourses"
                                                    className="px-2 py-2"
                                                >
                                                    beteiligte Studiengänge
                                                </label>
                                            </div>
                                            <div className="w-2/3">
                                                <input
                                                    type="text"
                                                    name="academicCourses"
                                                    value={institution.academic_courses}
                                                    onChange={(e) =>
                                                        modifyAcademicCourses(index, e.target.value)
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
                            <button onClick={removeInstitutionBox}>
                                <RxMinus size={20} />
                            </button>{' '}
                            {/* todo state + useeffect to create more input fields*/}
                            <button onClick={addInstitutionBox}>
                                <RxPlus size={20} />
                            </button>{' '}
                            {/* todo state + useeffect to create more input fields*/}
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link
                                href={{
                                    pathname: '/startingWizard/generalInformation/2partners',
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
                                    pathname:
                                        '/startingWizard/generalInformation/4participatingCourses',
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
