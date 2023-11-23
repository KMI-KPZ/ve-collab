import { Education } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileEducationItem from './EditProfileEducationItem';
import Swapper from './Swapper';

interface Props {
    educations: Education[];
    setEducations: Dispatch<SetStateAction<Education[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditEducationInformation({
    educations,
    setEducations,
    updateProfileData,
    orcid,
    importOrcidProfile,
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
        console.log(value);
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

    const swapEducations = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        let newEducations = [...educations];

        // swap indices
        [newEducations[firstIndex], newEducations[secondIndex]] = [
            newEducations[secondIndex],
            newEducations[firstIndex],
        ];
        setEducations(newEducations);
    };

    const deleteFromEducations = (e: FormEvent, index: number) => {
        e.preventDefault();

        let copy = [...educations];
        copy.splice(index, 1);
        setEducations(copy);
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

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Ausbildung'} />
                {educations.map((education, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={educations.length}
                        swapCallback={swapEducations}
                        deleteCallback={deleteFromEducations}
                    >
                        <EditProfileEducationItem
                            education={education}
                            index={index}
                            modifyCallbacks={{
                                modifyEducationInstitution,
                                modifyEducationDegree,
                                modifyEducationDepartment,
                                modifyEducationTimestampFrom,
                                modifyEducationTimestampTo,
                                modifyEducationAdditionalInfo,
                            }}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addEducationField} />
            </EditProfileVerticalSpacer>
        </form>
    );
}
