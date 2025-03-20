import { WorkExperience } from '@/interfaces/profile/profileInterfaces';
import SlateBox from '../common/SlateBox';
import EditProfileItemRow from './EditProfileItemRow';
import { useTranslation } from 'next-i18next';

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
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="w-full">
            <SlateBox>
                <EditProfileItemRow
                    label={t('position')}
                    value={workExperience.position}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperiencePosition(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('position_placeholder')}
                />
                <EditProfileItemRow
                    label={t('institution')}
                    value={workExperience.institution}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceInstitution(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('work_experience_institution_placeholder')}
                />
                <EditProfileItemRow
                    label={t('work_experience_department')}
                    value={workExperience.department}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceDepartment(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('work_experience_department_placeholder')}
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
                            value={workExperience.timestamp_from}
                            onChange={(e) =>
                                modifyCallbacks.modifyWorkExperienceTimestampFrom(
                                    index,
                                    e.target.value
                                )
                            }
                            placeholder={t('common:optional')}
                            className="border border-[#cccccc] rounded-md px-2 py-[6px] w-full text-gray-400"
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
                            value={workExperience.timestamp_to}
                            onChange={(e) =>
                                modifyCallbacks.modifyWorkExperienceTimestampTo(
                                    index,
                                    e.target.value
                                )
                            }
                            placeholder={t('common:optional')}
                            className="border border-[#cccccc] rounded-md px-2 py-[6px] w-full text-gray-400"
                        />
                    </div>
                </div>
                <EditProfileItemRow
                    label={t('common:city')}
                    value={workExperience.city}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceCity(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('common:optional')}
                />
                <EditProfileItemRow
                    label={t('country')}
                    value={workExperience.country}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceCountry(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('common:optional')}
                />
                <EditProfileItemRow
                    label={t('additional_info')}
                    value={workExperience.additional_info}
                    onChange={(e) =>
                        modifyCallbacks.modifyWorkExperienceAdditionalInfo(index, e.target.value)
                    }
                    labelElementWidth="w-1/3"
                    inputElemenWidth="w-2/3"
                    placeholder={t('work_experience_additional_info')}
                />
            </SlateBox>
        </div>
    );
}
