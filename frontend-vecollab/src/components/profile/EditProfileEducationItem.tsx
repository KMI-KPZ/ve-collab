import { Education } from '@/interfaces/profile/profileInterfaces';
import EditProfileItemRow from './EditProfileItemRow';
import SlateBox from '../common/SlateBox';
import { useTranslation } from 'next-i18next';

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
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="w-full">
            <SlateBox>
                <EditProfileItemRow
                    label={t('institution')}
                    value={education.institution}
                    onChange={(e) =>
                        modifyCallbacks.modifyEducationInstitution(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('education_institution_placeholder')}
                />
                <EditProfileItemRow
                    label={t('degree_and_field')}
                    value={education.degree}
                    onChange={(e) => modifyCallbacks.modifyEducationDegree(index, e.target.value)}
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('degree_and_field_placeholder')}
                />
                <EditProfileItemRow
                    label={t('education_department')}
                    value={education.department}
                    onChange={(e) =>
                        modifyCallbacks.modifyEducationDepartment(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('education_department_placeholder')}
                />
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="timestampFrom" className="px-2 py-2">
                            {t('common:from')}
                        </label>
                    </div>
                    <div className="w-2/3">
                        <input
                            type="date"
                            name="timestampFrom"
                            value={education.timestamp_from}
                            onChange={(e) =>
                                modifyCallbacks.modifyEducationTimestampFrom(index, e.target.value)
                            }
                            placeholder={t('common:optional')}
                            className="border border-[#cccccc] bg-white rounded-md px-2 py-[6px] w-full text-gray-400"
                        />
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="timestampTo" className="px-2 py-2">
                            {t('common:to')}
                        </label>
                    </div>
                    <div className="w-2/3 flex">
                        <input
                            type="date"
                            name="timestampTo"
                            value={education.timestamp_to}
                            onChange={(e) =>
                                modifyCallbacks.modifyEducationTimestampTo(index, e.target.value)
                            }
                            placeholder={t('common:optional')}
                            className="border border-[#cccccc] bg-white rounded-md px-2 py-[6px] w-full text-gray-400"
                        />
                    </div>
                </div>
                <EditProfileItemRow
                    label={t('additional_info')}
                    value={education.additional_info}
                    onChange={(e) =>
                        modifyCallbacks.modifyEducationAdditionalInfo(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('additional_info_placeholder')}
                />
            </SlateBox>
        </div>
    );
}
