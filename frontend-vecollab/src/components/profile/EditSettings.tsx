import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useState } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditVisibilityRadioButtons from './EditVisibilityRadioButtons';

interface Props {
    excludedFromMatching: boolean;
    setExcludedFromMatching: Dispatch<SetStateAction<boolean>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}
export default function EditVisibilitySettings({
    excludedFromMatching,
    setExcludedFromMatching,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {

    /*
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
    */
   
    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Benachrichtigungen'} />
                <div className="my-4 border border-slate-300 rounded-xl overflow-hidden">
                    <table className="table-auto w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-300 bg-slate-100">
                                <th></th>
                                <th className="text-center p-4 font-medium">E-Mail & Push</th>
                                <th className="text-center p-4 font-medium">Push</th>
                                <th className="text-center p-4 font-medium">keine</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-300">
                                <td className="p-4">Neue Nachrichten</td>
                                <td className="text-center p-4">
                                    <input type="radio" name="newMessages" value="emailPush" />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="newMessages" value="push" />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="newMessages" value="none" />
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4">VE-Einladung</td>
                                <td className="text-center p-4">
                                    <input type="radio" name="veInvite" value="emailPush" />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="veInvite" value="push" />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="veInvite" value="none" />
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4">Gruppen-Einladung</td>
                                <td className="text-center p-4">
                                    <input type="radio" name="groupInvite" value="emailPush" />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="groupInvite" value="push" />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="groupInvite" value="none" />
                                </td>
                            </tr>
                            <tr>
                                <td className="p-4">Systembenachrichtigungen</td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="systemNotifications"
                                        value="emailPush"
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="systemNotifications" value="push" />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="systemNotifications"
                                        value="none"
                                        disabled
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </EditProfileVerticalSpacer>
            {/*
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
            */}
            <EditProfileVerticalSpacer>
                <div className="p-2 rounded-xl border border-red-600">
                    <EditProfileHeadline name={'Ausschluss vom Matching'} />
                    <div>
                        Achtung: wenn du dich vom Matching ausschließt, gibt es keine Chance für
                        andere Personen dich im Rahmen der VE-Partnersuche zu finden!
                    </div>
                    <select
                        value={excludedFromMatching === true ? 'true' : 'false'}
                        onChange={(e) => {
                            e.target.value === 'true'
                                ? setExcludedFromMatching(true)
                                : setExcludedFromMatching(false);
                        }}
                        className={
                            'border border-gray-500 rounded-lg p-2 mt-2 bg-white ' +
                            (excludedFromMatching === true ? 'text-red-500' : 'text-green-500')
                        }
                    >
                        <option value="false" className="text-green-500">
                            ich nehme am Matching teil
                        </option>
                        <option value="true" className="text-red-500">
                            vom Matching ausschließen
                        </option>
                    </select>
                </div>
            </EditProfileVerticalSpacer>
        </form>
    );
}
