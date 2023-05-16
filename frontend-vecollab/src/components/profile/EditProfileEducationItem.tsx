import { Education } from '@/interfaces/profile/profileInterfaces';

interface Props {
    education: Education;
    index: number;
    modifyCallbacks: {
        modifyEducationInstitution(index: number, value: string): void;
        modifyEducationDegree(index: number, value: string): void;
        modifyEducationDepartment(index: number, value: string): void;
        modifyEducationTimestampFrom(index: number, value: string): void;
        modifyEducationTimestampTo(index: number, value: string): void;
        modifyEducationAdditionalInfo(index: number, value: string): void;
    };
}

export default function EditProfileEducationItem({ education, index, modifyCallbacks }: Props) {
    return (
        <div className={'p-4 my-4 bg-slate-200 rounded-3xl shadow-2xl'}>
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
                            modifyCallbacks.modifyEducationInstitution(index, e.target.value)
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
                        onChange={(e) =>
                            modifyCallbacks.modifyEducationDegree(index, e.target.value)
                        }
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
                            modifyCallbacks.modifyEducationDepartment(index, e.target.value)
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
                            modifyCallbacks.modifyEducationTimestampFrom(index, e.target.value)
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
                            modifyCallbacks.modifyEducationTimestampTo(index, e.target.value)
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
                            modifyCallbacks.modifyEducationAdditionalInfo(index, e.target.value)
                        }
                        placeholder="optional, z.B. Note, Spezialisierungen, Thesis-Titel, ..."
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                    />
                </div>
            </div>
        </div>
    );
}
