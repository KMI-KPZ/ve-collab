import { WorkExperience } from '@/interfaces/profile/profileInterfaces';
import SlateBox from '../Layout/SlateBox';
import EditProfileItemRow from './EditProfileItemRow';

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
        <div className="w-full">
            <SlateBox>
                <EditProfileItemRow
                    label={'Position'}
                    value={workExperience.position}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperiencePosition(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder="Berufsbezeichnung"
                />
                <EditProfileItemRow
                    label={'Institution'}
                    value={workExperience.institution}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceInstitution(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder="Name der Institution"
                />
                <EditProfileItemRow
                    label={'Abteilung'}
                    value={workExperience.department}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceDepartment(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder="optional, z.B. Fakultät der Uni / Abteilung der Firma"
                />
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
                                modifyCallbacks.modifyWorkExperienceTimestampFrom(
                                    index,
                                    e.target.value
                                )
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
                                modifyCallbacks.modifyWorkExperienceTimestampTo(
                                    index,
                                    e.target.value
                                )
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
                <EditProfileItemRow
                    label={'Stadt'}
                    value={workExperience.city}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceCity(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder="optional"
                />
                <EditProfileItemRow
                    label={'Land'}
                    value={workExperience.country}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceCountry(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder="optional"
                />
                <EditProfileItemRow
                    label={'Zusatzinfos'}
                    value={workExperience.additional_info}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceAdditionalInfo(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder="optional, z.B. Tätigkeiten"
                />
            </SlateBox>
        </div>
    );
}
