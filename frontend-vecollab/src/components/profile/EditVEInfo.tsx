import { VEInformation } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import { RxArrowDown, RxArrowUp, RxTrash } from 'react-icons/rx';
import Swapper from './Swapper';

interface Props {
    veInformation: VEInformation;
    setVeInformation: Dispatch<SetStateAction<VEInformation>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditVEInfo({
    veInformation,
    setVeInformation,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const modifyVeInterests = (index: number, value: string) => {
        let newInterests = [...veInformation.veInterests];
        newInterests[index] = value;
        setVeInformation({ ...veInformation, veInterests: newInterests });
    };

    const swapVeInterests = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        // swap indices
        [veInformation.veInterests[firstIndex], veInformation.veInterests[secondIndex]] = [
            veInformation.veInterests[secondIndex],
            veInformation.veInterests[firstIndex],
        ];
        setVeInformation({ ...veInformation, veInterests: veInformation.veInterests });
    };

    const deleteFromVeInterests = (e: FormEvent, index: number) => {
        e.preventDefault();
        veInformation.veInterests.splice(index, 1);
        setVeInformation({ ...veInformation, veInterests: veInformation.veInterests });
    };

    const addVeInterestInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({ ...veInformation, veInterests: [...veInformation.veInterests, ''] });
    };

    const modifyVeGoals = (index: number, value: string) => {
        let newGoals = [...veInformation.veGoals];
        newGoals[index] = value;
        setVeInformation({ ...veInformation, veGoals: newGoals });
    };

    const swapVeGoals = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        // swap indices
        [veInformation.veGoals[firstIndex], veInformation.veGoals[secondIndex]] = [
            veInformation.veGoals[secondIndex],
            veInformation.veGoals[firstIndex],
        ];
        setVeInformation({ ...veInformation, veGoals: veInformation.veGoals });
    };

    const deleteFromVeGoals = (e: FormEvent, index: number) => {
        e.preventDefault();
        veInformation.veGoals.splice(index, 1);
        setVeInformation({ ...veInformation, veGoals: veInformation.veGoals });
    };

    const addVeGoalsInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({ ...veInformation, veGoals: [...veInformation.veGoals, ''] });
    };

    const modifyExperience = (index: number, value: string) => {
        let newExperience = [...veInformation.experience];
        newExperience[index] = value;
        setVeInformation({ ...veInformation, experience: newExperience });
    };

    const swapExperience = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        // swap indices
        [veInformation.experience[firstIndex], veInformation.experience[secondIndex]] = [
            veInformation.experience[secondIndex],
            veInformation.experience[firstIndex],
        ];
        setVeInformation({ ...veInformation, experience: veInformation.experience });
    };

    const deleteFromExperience = (e: FormEvent, index: number) => {
        e.preventDefault();
        veInformation.experience.splice(index, 1);
        setVeInformation({ ...veInformation, experience: veInformation.experience });
    };

    const addExperienceInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({ ...veInformation, experience: [...veInformation.experience, ''] });
    };

    const modifyPreferredFormats = (index: number, value: string) => {
        let newFormats = [...veInformation.preferredFormats];
        newFormats[index] = value;
        setVeInformation({ ...veInformation, preferredFormats: newFormats });
    };

    const swapPreferredFormats = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        // swap indices
        [veInformation.preferredFormats[firstIndex], veInformation.preferredFormats[secondIndex]] =
            [
                veInformation.preferredFormats[secondIndex],
                veInformation.preferredFormats[firstIndex],
            ];
        setVeInformation({ ...veInformation, preferredFormats: veInformation.preferredFormats });
    };

    const deleteFromPreferredFormats = (e: FormEvent, index: number) => {
        e.preventDefault();
        veInformation.preferredFormats.splice(index, 1);
        setVeInformation({ ...veInformation, preferredFormats: veInformation.preferredFormats });
    };

    const addPreferredFormatsInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({
            ...veInformation,
            preferredFormats: [...veInformation.preferredFormats, ''],
        });
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Themeninteressen'} />
                {veInformation.veInterests.map((interest, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.veInterests.length}
                        swapCallback={swapVeInterests}
                        deleteCallback={deleteFromVeInterests}
                    >
                        <input
                            className={
                                'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full mx-1'
                            }
                            type="text"
                            placeholder={'In welchen Themengebieten willst du dich mit VE bewegen?'}
                            value={interest}
                            onChange={(e) => modifyVeInterests(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeInterestInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Zielsetzung'} />
                {veInformation.veGoals.map((goal, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.veGoals.length}
                        swapCallback={swapVeGoals}
                        deleteCallback={deleteFromVeGoals}
                    >
                        <input
                            className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                            type="text"
                            placeholder={'Welche Ziele willst du mit VE erreichen?'}
                            value={goal}
                            onChange={(e) => modifyVeGoals(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeGoalsInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Erfahrungen'} />
                {veInformation.experience.map((exp, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.experience.length}
                        swapCallback={swapExperience}
                        deleteCallback={deleteFromExperience}
                    >
                        <input
                            className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                            type="text"
                            placeholder={'Welche Erfahrungen konntest du bereits sammeln?'}
                            value={exp}
                            onChange={(e) => modifyExperience(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addExperienceInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'präferierte Formate'} />
                {veInformation.preferredFormats.map((format, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.preferredFormats.length}
                        swapCallback={swapPreferredFormats}
                        deleteCallback={deleteFromPreferredFormats}
                    >
                        <input
                            className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                            type="text"
                            placeholder={
                                'In welchen Formaten möchtest du VEs abhalten? z.B. synchron/asynchron/hybrid'
                            }
                            value={format}
                            onChange={(e) => modifyPreferredFormats(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addPreferredFormatsInputField} />
            </EditProfileVerticalSpacer>
        </form>
    );
}
