import Link from 'next/link';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';

interface Props {
    educations: Education[];
    setEducations: Dispatch<SetStateAction<Education[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
}

interface Education {
    institution: string;
    degree: string;
    department?: string;
    timestamp_from: string;
    timestamp_to: string;
    additional_info?: string;
}

export default function EditEducationInformation({
    educations,
    setEducations,
    updateProfileData,
}: Props) {
    const modifyEducationInstitution = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].institution = value;
        setEducations(newEducations);
    };

    const modifyEducationDegree = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].degree = value;
        setEducations(newEducations);
    };

    const modifyEducationDepartment = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].department = value;
        setEducations(newEducations);
    };

    const modifyEducationTimestampFrom = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].timestamp_from = value;
        setEducations(newEducations);
    };

    const modifyEducationTimestampTo = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].timestamp_to = value;
        setEducations(newEducations);
    };

    const modifyEducationAdditionalInfo = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].additional_info = value;
        setEducations(newEducations);
    };

    const addEducationField = (e: FormEvent) => {
        e.preventDefault();
        setEducations([
            ...educations,
            {
                institution: '',
                degree: '',
                department: '',
                timestamp_from: '',
                timestamp_to: '',
                additional_info: '',
            },
        ]);
    };

    const removeEducationField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...educations]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setEducations(copy);
    };

    return (
        <form onSubmit={updateProfileData}>
            <div className={'flex justify-end'}>
                <Link href={'/profile'}>
                    <button className={'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'}>
                        Abbrechen
                    </button>
                </Link>
                <button
                    type="submit"
                    className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                >
                    Speichern
                </button>
            </div>

            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Ausbildung</div>
                {educations.map((education, index) => (
                    <div key={index} className={'p-4 my-4 bg-slate-200 rounded-3xl shadow-2xl'}>
                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="institution" className="px-2 py-2">
                                    Institution
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    name="institution"
                                    value={education.institution}
                                    onChange={(e) =>
                                        modifyEducationInstitution(index, e.target.value)
                                    }
                                    placeholder="Name der Bildungseinrichtung"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="degree" className="px-2 py-2">
                                    Abschluss und Fach
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    name="degree"
                                    value={education.degree}
                                    onChange={(e) => modifyEducationDegree(index, e.target.value)}
                                    placeholder="z.B. Bachelor/Master/PhD Informatik"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="department" className="px-2 py-2">
                                    Abteilung
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    name="department"
                                    value={education.department}
                                    onChange={(e) =>
                                        modifyEducationDepartment(index, e.target.value)
                                    }
                                    placeholder="optional, Abteilung der Einrichtung, z.B. Fakultät"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="timestampFrom" className="px-2 py-2">
                                    von
                                </label>
                            </div>
                            <div className="w-2/3">
                                {/* TODO month/year only date picker*/}
                                <input
                                    type="text"
                                    name="timestampFrom"
                                    value={education.timestamp_from}
                                    onChange={(e) =>
                                        modifyEducationTimestampFrom(index, e.target.value)
                                    }
                                    placeholder="optional"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="timestampTo" className="px-2 py-2">
                                    bis
                                </label>
                            </div>
                            <div className="w-2/3 flex">
                                {/* TODO month/year only date picker*/}
                                <input
                                    type="text"
                                    name="timestampTo"
                                    value={education.timestamp_to}
                                    onChange={(e) =>
                                        modifyEducationTimestampTo(index, e.target.value)
                                    }
                                    placeholder="optional"
                                    className="border border-gray-500 rounded-lg h-12 p-2"
                                />
                                <div className="w-full flex justify-end items-center mx-2">
                                    <input type="checkbox" name="tody" className="mx-2" />
                                    <label htmlFor="today">heute</label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="additionalInfo" className="px-2 py-2">
                                    Zusatzinfos
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    name="additionalInfo"
                                    value={education.additional_info}
                                    onChange={(e) =>
                                        modifyEducationAdditionalInfo(index, e.target.value)
                                    }
                                    placeholder="optional, z.B. Note, Spezialisierungen, Thesis-Titel, ..."
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                <div className={'w-full mt-1 px-2 flex justify-end'}>
                    <button onClick={(e) => removeEducationField(e)}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={(e) => addEducationField(e)}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </form>
    );
}
