import { VEInformation } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import Swapper from './Swapper';

interface Props {
    veInformation: VEInformation;
    setVeInformation: Dispatch<SetStateAction<VEInformation>>;
    veReady: boolean;
    setVeReady: Dispatch<SetStateAction<boolean>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditVEInfo({
    veInformation,
    setVeInformation,
    veReady,
    setVeReady,
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

    const modifyVeContents = (index: number, value: string) => {
        let newContents = [...veInformation.veContents];
        newContents[index] = value;
        setVeInformation({ ...veInformation, veContents: newContents });
    };

    const swapVeContents = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        // swap indices
        [veInformation.veContents[firstIndex], veInformation.veContents[secondIndex]] = [
            veInformation.veContents[secondIndex],
            veInformation.veContents[firstIndex],
        ];
        setVeInformation({ ...veInformation, veContents: veInformation.veContents });
    };

    const deleteFromVeContents = (e: FormEvent, index: number) => {
        e.preventDefault();
        veInformation.veContents.splice(index, 1);
        setVeInformation({ ...veInformation, veContents: veInformation.veContents });
    };

    const addVeContentsInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({ ...veInformation, veContents: [...veInformation.veContents, ''] });
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

    const modifyInterdisciplinaryExchange = (value: boolean) => {
        setVeInformation({ ...veInformation, interdisciplinaryExchange: value });
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

    const modifyPreferredFormat = (value: string) => {
        setVeInformation({ ...veInformation, preferredFormat: value });
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'aktuelle Verfügbarkeit für VE'} />
                <div className="mb-2 text-sm">Bist du aktuell für einen VE verfügbar?</div>
                <select
                    value={veReady === true ? 'true' : 'false'}
                    onChange={(e) =>
                        e.target.value === 'true' ? setVeReady(true) : setVeReady(false)
                    }
                    className="border border-gray-500 rounded-lg p-2 bg-white"
                >
                    <option value="true">Ja</option>
                    <option value="false">Nein</option>
                </select>
                <div className="min-h-[20px]" /> {/* spacer to match "+" button spacing */}
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Themen'} />
                <div className="mb-2 text-sm">
                    Welche Themen rund um VE interessieren dich besonders?
                </div>
                {veInformation.veInterests.map((interest, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.veInterests.length}
                        swapCallback={swapVeInterests}
                        deleteCallback={deleteFromVeInterests}
                    >
                        <input
                            className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                            type="text"
                            value={interest}
                            onChange={(e) => modifyVeInterests(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeInterestInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Inhalte'} />
                <div className="mb-2 text-sm">
                    Zu welchen (fachlichen, sprachlichen, kulturellen) Inhalten würdest du gern
                    einen VE planen?
                </div>
                {veInformation.veContents.map((content, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.veContents.length}
                        swapCallback={swapVeContents}
                        deleteCallback={deleteFromVeContents}
                    >
                        <input
                            className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                            type="text"
                            value={content}
                            onChange={(e) => modifyVeContents(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeContentsInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Zielsetzung'} />
                <div className="mb-2 text-sm">
                    Welche Ziele möchtest du mit deinem VE erreichen?
                </div>
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
                            value={goal}
                            onChange={(e) => modifyVeGoals(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeGoalsInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'interdisziplinärer Austausch'} />
                <div className="mb-2 text-sm">
                    Bist du an einem interdisziplinären Austausch interessiert?
                </div>
                <select
                    value={veInformation.interdisciplinaryExchange === true ? 'true' : 'false'}
                    onChange={(e) =>
                        e.target.value === 'true'
                            ? modifyInterdisciplinaryExchange(true)
                            : modifyInterdisciplinaryExchange(false)
                    }
                    className="border border-gray-500 rounded-lg p-2 bg-white"
                >
                    <option value="true">Ja</option>
                    <option value="false">Nein</option>
                </select>
                <div className="min-h-[20px]" /> {/* spacer to match "+" button spacing */}
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Erfahrungen'} />
                <div className="mb-2 text-sm">
                    Welche VE-Erfahrungen konntest du bereits sammeln?
                </div>
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
                            value={exp}
                            onChange={(e) => modifyExperience(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addExperienceInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'präferierte Formate'} />
                <div className="mb-2 text-sm">In welchen Formaten möchtest du den VE abhalten?</div>
                <select
                    value={veInformation.preferredFormat}
                    onChange={(e) => modifyPreferredFormat(e.target.value)}
                    className="border border-gray-500 rounded-lg p-2 bg-white"
                >
                    <option value="synchron">synchron</option>
                    <option value="asynchron">asynchron</option>
                    <option value="synchron und asynchron">synchron und asynchron</option>
                </select>
            </EditProfileVerticalSpacer>
        </form>
    );
}
