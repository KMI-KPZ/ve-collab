import { WorkExperience } from '@/interfaces/profile/profileInterfaces';
import Link from 'next/link';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';

interface Props {
    workExperience: WorkExperience[];
    setWorkExperience: Dispatch<SetStateAction<WorkExperience[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
}

export default function EditWorkExperienceInformation({
    workExperience,
    setWorkExperience,
    updateProfileData,
}: Props) {
    const modifyWorkExperiencePosition = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].position = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceInstitution = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].institution = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceDepartment = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].department = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceTimestampFrom = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].timestamp_from = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceTimestampTo = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].timestamp_to = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceCity = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].city = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceCountry = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].country = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceAdditionalInfo = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].additional_info = value;
        setWorkExperience(newExperiences);
    };

    const addWorkExperienceField = (e: FormEvent) => {
        e.preventDefault();
        setWorkExperience([
            ...workExperience,
            {
                position: '',
                institution: '',
                department: '',
                timestamp_from: '',
                timestamp_to: '',
                city: '',
                country: '',
                additional_info: '',
            },
        ]);
    };

    const removeWorkExperienceField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...workExperience]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setWorkExperience(copy);
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
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Berufserfahrung</div>
                {workExperience.map((workExp, index) => (
                    <div key={index} className={'p-4 my-4 bg-slate-200 rounded-3xl shadow-2xl'}>
                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="position" className="px-2 py-2">
                                    Position
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    name="position"
                                    value={workExp.position}
                                    onChange={(e) =>
                                        modifyWorkExperiencePosition(index, e.target.value)
                                    }
                                    placeholder="Berufsbezeichnung"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
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
                                    value={workExp.institution}
                                    onChange={(e) =>
                                        modifyWorkExperienceInstitution(index, e.target.value)
                                    }
                                    placeholder="Name der Institution"
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
                                    value={workExp.department}
                                    onChange={(e) =>
                                        modifyWorkExperienceDepartment(index, e.target.value)
                                    }
                                    placeholder="optional, z.B. Fakultät der Uni / Abteilung der Firma"
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
                                    value={workExp.timestamp_from}
                                    onChange={(e) =>
                                        modifyWorkExperienceTimestampFrom(index, e.target.value)
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
                                    value={workExp.timestamp_to}
                                    onChange={(e) =>
                                        modifyWorkExperienceTimestampTo(index, e.target.value)
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
                                <label htmlFor="city" className="px-2 py-2">
                                    Stadt
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    name="city"
                                    value={workExp.city}
                                    onChange={(e) =>
                                        modifyWorkExperienceCity(index, e.target.value)
                                    }
                                    placeholder="optional"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="country" className="px-2 py-2">
                                    Land
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    name="country"
                                    value={workExp.country}
                                    onChange={(e) =>
                                        modifyWorkExperienceCountry(index, e.target.value)
                                    }
                                    placeholder="optional"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
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
                                    value={workExp.additional_info}
                                    onChange={(e) =>
                                        modifyWorkExperienceAdditionalInfo(index, e.target.value)
                                    }
                                    placeholder="optional, z.B. Tätigkeiten"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                <div className={'w-full mt-1 px-2 flex justify-end'}>
                    <button onClick={(e) => removeWorkExperienceField(e)}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={(e) => addWorkExperienceField(e)}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </form>
    );
}
