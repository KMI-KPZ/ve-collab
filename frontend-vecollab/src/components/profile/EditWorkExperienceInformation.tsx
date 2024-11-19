import { WorkExperience } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileWorkExperienceItem from './EditProfileWorkExperienceItem';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import Swapper from './Swapper';
import { useTranslation } from 'next-i18next';

interface Props {
    workExperience: WorkExperience[];
    setWorkExperience: Dispatch<SetStateAction<WorkExperience[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditWorkExperienceInformation({
    workExperience,
    setWorkExperience,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const { t } = useTranslation(['community', 'common']);

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

    const swapWorkExperiences = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        let newExperiences = [...workExperience];

        // swap indices
        [newExperiences[firstIndex], newExperiences[secondIndex]] = [
            newExperiences[secondIndex],
            newExperiences[firstIndex],
        ];
        setWorkExperience(newExperiences);
    };

    const deleteFromWorkExperiences = (e: FormEvent, index: number) => {
        e.preventDefault();

        let copy = [...workExperience];
        copy.splice(index, 1);
        setWorkExperience(copy);
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

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t("work_experience")} />
                <div className="mb-2 text-sm">
                    {t("work_experience_question")}
                </div>
                {workExperience.map((workExp, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={workExperience.length}
                        swapCallback={swapWorkExperiences}
                        deleteCallback={deleteFromWorkExperiences}
                    >
                        <EditProfileWorkExperienceItem
                            key={index}
                            workExperience={workExp}
                            index={index}
                            modifyCallbacks={{
                                modifyWorkExperiencePosition,
                                modifyWorkExperienceInstitution,
                                modifyWorkExperienceDepartment,
                                modifyWorkExperienceTimestampFrom,
                                modifyWorkExperienceTimestampTo,
                                modifyWorkExperienceCity,
                                modifyWorkExperienceCountry,
                                modifyWorkExperienceAdditionalInfo,
                            }}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addWorkExperienceField} />
            </EditProfileVerticalSpacer>
        </form>
    );
}
