import { WorkExperience } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileWorkExperienceItem from './EditProfileWorkExperienceItem';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';

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
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Berufserfahrung'} />
                {workExperience.map((workExp, index) => (
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
                ))}
                <EditProfilePlusMinusButtons
                    extendClassName="px-2"
                    minusCallback={removeWorkExperienceField}
                    plusCallback={addWorkExperienceField}
                />
            </EditProfileVerticalSpacer>
        </form>
    );
}
