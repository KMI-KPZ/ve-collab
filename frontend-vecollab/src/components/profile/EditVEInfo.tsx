import { VEInformation } from '@/interfaces/profile/profileInterfaces';
import Link from 'next/link';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';

interface Props {
    veInformation: VEInformation;
    setVeInformation: Dispatch<SetStateAction<VEInformation>>;
    updateProfileData(evt: FormEvent): Promise<void>;
}

export default function EditVEInfo({ veInformation, setVeInformation, updateProfileData }: Props) {
    const modifyVeInterests = (index: number, value: string) => {
        let newInterests = [...veInformation.veInterests];
        newInterests[index] = value;
        setVeInformation({ ...veInformation, veInterests: newInterests });
    };

    const addVeInterestInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({ ...veInformation, veInterests: [...veInformation.veInterests, ''] });
    };

    const removeVeInterestInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veInformation.veInterests]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeInformation({ ...veInformation, veInterests: copy });
    };

    const modifyVeGoals = (index: number, value: string) => {
        let newGoals = [...veInformation.veGoals];
        newGoals[index] = value;
        setVeInformation({ ...veInformation, veGoals: newGoals });
    };

    const addVeGoalsInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({ ...veInformation, veGoals: [...veInformation.veGoals, ''] });
    };

    const removeVeGoalsInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veInformation.veGoals]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeInformation({ ...veInformation, veGoals: copy });
    };

    const modifyExperience = (index: number, value: string) => {
        let newExperience = [...veInformation.experience];
        newExperience[index] = value;
        setVeInformation({ ...veInformation, experience: newExperience });
    };

    const addExperienceInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({ ...veInformation, experience: [...veInformation.experience, ''] });
    };

    const removeExperienceInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veInformation.experience]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeInformation({ ...veInformation, experience: copy });
    };

    const modifyPreferredFormats = (index: number, value: string) => {
        let newFormats = [...veInformation.preferredFormats];
        newFormats[index] = value;
        setVeInformation({ ...veInformation, preferredFormats: newFormats });
    };

    const addPreferredFormatsInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInformation({
            ...veInformation,
            preferredFormats: [...veInformation.preferredFormats, ''],
        });
    };

    const removePreferredFormatsInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veInformation.preferredFormats]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeInformation({...veInformation, preferredFormats: copy})
    };
    return (
        <form onSubmit={updateProfileData}>
            <div className={'flex justify-end'}>
                <Link href={'/profile'}>
                    <button className={'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'}>
                        Abbrechen
                    </button>
                </Link>
                <button
                    type="submit"
                    className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                >
                    Speichern
                </button>
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>VE-Themeninteressen</div>
                {veInformation.veInterests.map((interest, index) => (
                    <input
                        key={index}
                        className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                        type="text"
                        placeholder={'In welchen Themengebieten willst du dich mit VE bewegen?'}
                        value={interest}
                        onChange={(e) => modifyVeInterests(index, e.target.value)}
                    />
                ))}
                <div className={'w-full mt-1 flex justify-end'}>
                    <button onClick={removeVeInterestInputField}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={addVeInterestInputField}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>VE-Zielsetzungen</div>
                {veInformation.veGoals.map((goal, index) => (
                    <input
                        key={index}
                        className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                        type="text"
                        placeholder={'Welche Ziele willst du mit VE erreichen?'}
                        value={goal}
                        onChange={(e) => modifyVeGoals(index, e.target.value)}
                    />
                ))}
                <div className={'w-full mt-1 flex justify-end'}>
                    <button onClick={removeVeGoalsInputField}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={addVeGoalsInputField}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Erfahrungen</div>
                {veInformation.experience.map((exp, index) => (
                    <input
                        key={index}
                        className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                        type="text"
                        placeholder={'Welche Erfahrungen konntest du bereits sammeln?'}
                        value={exp}
                        onChange={(e) => modifyExperience(index, e.target.value)}
                    />
                ))}
                <div className={'w-full mt-1 flex justify-end'}>
                    <button onClick={removeExperienceInputField}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={addExperienceInputField}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>präferierte Formate</div>
                {veInformation.preferredFormats.map((format, index) => (
                    <input
                        key={index}
                        className={'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'}
                        type="text"
                        placeholder={
                            'In welchen Formaten möchtest du VEs abhalten? z.B. synchron/asynchron/hybrid'
                        }
                        value={format}
                        onChange={(e) => modifyPreferredFormats(index, e.target.value)}
                    />
                ))}
                <div className={'w-full mt-1 flex justify-end'}>
                    <button onClick={removePreferredFormatsInputField}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={addPreferredFormatsInputField}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </form>
    );
}
