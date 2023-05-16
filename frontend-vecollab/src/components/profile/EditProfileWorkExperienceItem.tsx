import { WorkExperience } from '@/interfaces/profile/profileInterfaces';

interface Props {
    workExperience: WorkExperience;
    index: number;
    modifyCallbacks: {
        modifyWorkExperiencePosition(index: number, value: string): void;
        modifyWorkExperienceInstitution(index: number, value: string): void;
        modifyWorkExperienceDepartment(index: number, value: string): void;
        modifyWorkExperienceTimestampFrom(index: number, value: string): void;
        modifyWorkExperienceTimestampTo(index: number, value: string): void;
        modifyWorkExperienceCity(index: number, value: string): void;
        modifyWorkExperienceCountry(index: number, value: string): void;
        modifyWorkExperienceAdditionalInfo(index: number, value: string): void;
    };
}

export default function EditProfileWorkExperienceItem({
    workExperience,
    index,
    modifyCallbacks,
}: Props) {
    return (
        <div className={'p-4 my-4 bg-slate-200 rounded-3xl shadow-2xl'}>
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
                        value={workExperience.position}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperiencePosition(index, e.target.value)
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
                        value={workExperience.institution}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperienceInstitution(index, e.target.value)
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
                        value={workExperience.department}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperienceDepartment(index, e.target.value)
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
                        value={workExperience.timestamp_from}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperienceTimestampFrom(index, e.target.value)
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
                        value={workExperience.timestamp_to}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperienceTimestampTo(index, e.target.value)
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
                        value={workExperience.city}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperienceCity(index, e.target.value)
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
                        value={workExperience.country}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperienceCountry(index, e.target.value)
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
                        value={workExperience.additional_info}
                        onChange={(e) =>
                            modifyCallbacks.modifyWorkExperienceAdditionalInfo(
                                index,
                                e.target.value
                            )
                        }
                        placeholder="optional, z.B. Tätigkeiten"
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                    />
                </div>
            </div>
        </div>
    );
}
