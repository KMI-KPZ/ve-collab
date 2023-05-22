import { Education } from '@/interfaces/profile/profileInterfaces';
import SlateBox from '../Layout/SlateBox';
import EditProfileItemRow from './EditProfileItemRow';

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
        <SlateBox>
            <EditProfileItemRow
                label={'Institution'}
                value={education.institution}
                onChange={(e) => modifyCallbacks.modifyEducationInstitution(index, e.target.value)}
                labelElementWidth="w-1/3"
                inputElemenWidth="w-2/3"
                placeholder="Name der Bildungseinrichtung"
            />
            <EditProfileItemRow
                label={'Abschluss und Fach'}
                value={education.degree}
                onChange={(e) => modifyCallbacks.modifyEducationDegree(index, e.target.value)}
                labelElementWidth="w-1/3"
                inputElemenWidth="w-2/3"
                placeholder="z.B. Bachelor/Master/PhD Informatik"
            />
            <EditProfileItemRow
                label={'Abteilung'}
                value={education.department}
                onChange={(e) => modifyCallbacks.modifyEducationDepartment(index, e.target.value)}
                labelElementWidth="w-1/3"
                inputElemenWidth="w-2/3"
                placeholder="optional, Abteilung der Einrichtung, z.B. Fakultät"
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
            <EditProfileItemRow
                label={'Zusatzinfos'}
                value={education.additional_info}
                onChange={(e) =>
                    modifyCallbacks.modifyEducationAdditionalInfo(index, e.target.value)
                }
                labelElementWidth="w-1/3"
                inputElemenWidth="w-2/3"
                placeholder="optional, z.B. Note, Spezialisierungen, Thesis-Titel, ..."
            />
        </SlateBox>
    );
}
