import { ChangeEvent, FormEvent, useState } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditVisibilityRadioButtons from './EditVisibilityRadioButtons';

interface Props {
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}
export default function EditVisibilitySettings({
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const [visibilities, setVisibilities] = useState({
        veInfo: 'public',
        teaching: 'public',
        research: 'public',
        education: 'public',
        workExperience: 'public',
        veWindow: 'public',
    });

    const updateVeInfo = (e: ChangeEvent<HTMLInputElement>) => {
        setVisibilities({ ...visibilities, veInfo: e.target.value });
    };
    const updateTeaching = (e: ChangeEvent<HTMLInputElement>) => {
        setVisibilities({ ...visibilities, teaching: e.target.value });
    };
    const updateResearch = (e: ChangeEvent<HTMLInputElement>) => {
        setVisibilities({ ...visibilities, research: e.target.value });
    };
    const updateEducation = (e: ChangeEvent<HTMLInputElement>) => {
        setVisibilities({ ...visibilities, education: e.target.value });
    };
    const updateWorkExperience = (e: ChangeEvent<HTMLInputElement>) => {
        setVisibilities({ ...visibilities, workExperience: e.target.value });
    };
    const updateVeWindow = (e: ChangeEvent<HTMLInputElement>) => {
        setVisibilities({ ...visibilities, veWindow: e.target.value });
    };
    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Info'} />
                <EditVisibilityRadioButtons
                    name={'veInfo'}
                    visibility={visibilities.veInfo}
                    onChange={updateVeInfo}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Lehre'} />
                <EditVisibilityRadioButtons
                    name={'teaching'}
                    visibility={visibilities.teaching}
                    onChange={updateTeaching}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Forschung'} />
                <EditVisibilityRadioButtons
                    name={'research'}
                    visibility={visibilities.research}
                    onChange={updateResearch}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Ausbildung'} />
                <EditVisibilityRadioButtons
                    name={'education'}
                    visibility={visibilities.education}
                    onChange={updateEducation}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Berufserfahrung'} />
                <EditVisibilityRadioButtons
                    name={'workExperience'}
                    visibility={visibilities.workExperience}
                    onChange={updateWorkExperience}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Schaufenster'} />
                <EditVisibilityRadioButtons
                    name={'veWindow'}
                    visibility={visibilities.veWindow}
                    onChange={updateVeWindow}
                />
            </EditProfileVerticalSpacer>
        </form>
    );
}
