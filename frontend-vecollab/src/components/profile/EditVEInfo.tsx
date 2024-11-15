import { VEInformation } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import Swapper from './Swapper';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import { DropdownList } from '@/interfaces/dropdowns';
import { useTranslation } from 'next-i18next';

interface Props {
    veInformation: VEInformation;
    setVeInformation: Dispatch<SetStateAction<VEInformation>>;
    veReady: boolean;
    setVeReady: Dispatch<SetStateAction<boolean>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
    dropdowns: DropdownList;
}

export default function EditVEInfo({
    veInformation,
    setVeInformation,
    veReady,
    setVeReady,
    updateProfileData,
    orcid,
    importOrcidProfile,
    dropdowns,
}: Props) {
    const { t } = useTranslation(['community', 'common']);

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
                <EditProfileHeadline name={t('current_ve_availability')} />
                <div className="mb-2 text-sm">{t('current_ve_availability_question')}</div>
                <Select
                    className="w-1/2 mb-1"
                    options={[
                        { label: t('common:yes'), value: 'true' },
                        { label: t('common:no'), value: 'false' },
                    ]}
                    onChange={(e) => (e!.value === 'true' ? setVeReady(true) : setVeReady(false))}
                    value={
                        veReady === true
                            ? { label: t('common:yes'), value: 'true' }
                            : { label: t('common:no'), value: 'false' }
                    }
                    placeholder={t('common:choose_option')}
                />
                <div className="min-h-[20px]" /> {/* spacer to match "+" button spacing */}
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('ve_topics')} />
                <div className="mb-2 text-sm">{t('ve_topics_question')}</div>
                {veInformation.veInterests.map((interest, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.veInterests.length}
                        swapCallback={swapVeInterests}
                        deleteCallback={deleteFromVeInterests}
                    >
                        <CreatableSelect
                            className="w-full mb-1"
                            options={dropdowns.veInterests}
                            onChange={(e) => modifyVeInterests(index, e!.value)}
                            // if value is not null, placeholder wont show, even though value inside the object is ''
                            value={interest !== '' ? { label: interest, value: interest } : null}
                            placeholder={t('ve_topics_placeholder')}
                            formatCreateLabel={(inputValue) => (
                                <span>
                                    {t('ve_topics_select_no_matching_result1')} <b>{inputValue}</b>{' '}
                                    {t('ve_topics_select_no_matching_result2')}
                                </span>
                            )}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeInterestInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('ve_contents')} />
                <div className="mb-2 text-sm">{t('ve_contents_question')}</div>
                {veInformation.veContents.map((content, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.veContents.length}
                        swapCallback={swapVeContents}
                        deleteCallback={deleteFromVeContents}
                    >
                        <input
                            className={
                                'border border-[#cccccc] rounded-md px-2 py-[6px] mb-1 w-full'
                            }
                            type="text"
                            value={content}
                            onChange={(e) => modifyVeContents(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeContentsInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('ve_goals')} />
                <div className="mb-2 text-sm">{t('ve_goals_question')}</div>
                {veInformation.veGoals.map((goal, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.veGoals.length}
                        swapCallback={swapVeGoals}
                        deleteCallback={deleteFromVeGoals}
                    >
                        <CreatableSelect
                            className="w-full mb-1"
                            options={dropdowns.veGoals}
                            onChange={(e) => modifyVeGoals(index, e!.value)}
                            // if value is not null, placeholder wont show, even though value inside the object is ''
                            value={goal !== '' ? { label: goal, value: goal } : null}
                            placeholder={t('ve_goals_placeholder')}
                            formatCreateLabel={(inputValue) => (
                                <span>
                                    {t('ve_goals_select_no_matching_result1')} <b>{inputValue}</b>{' '}
                                    {t('ve_goals_select_no_matching_result2')}
                                </span>
                            )}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addVeGoalsInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('interdisciplinary_exchange')} />
                <div className="mb-2 text-sm">{t('interdisciplinary_exchange_question')}</div>
                <Select
                    className="w-1/2 mb-1"
                    options={[
                        { label: t('common:yes'), value: 'true' },
                        { label: t('common:no'), value: 'false' },
                    ]}
                    onChange={(e) =>
                        e!.value === 'true'
                            ? modifyInterdisciplinaryExchange(true)
                            : modifyInterdisciplinaryExchange(false)
                    }
                    value={
                        veInformation.interdisciplinaryExchange === true
                            ? { label: t('common:yes'), value: 'true' }
                            : { label: t('common:no'), value: 'false' }
                    }
                    placeholder={t('common:choose_option')}
                />
                <div className="min-h-[20px]" /> {/* vertical spacer to match "+" button spacing */}
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('ve_experience')} />
                <div className="mb-2 text-sm">{t('ve_experience_question')}</div>
                {veInformation.experience.map((exp, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={veInformation.experience.length}
                        swapCallback={swapExperience}
                        deleteCallback={deleteFromExperience}
                    >
                        <input
                            className={
                                'border border-[#cccccc] rounded-md px-2 py-[6px] mb-1 w-full'
                            }
                            type="text"
                            value={exp}
                            onChange={(e) => modifyExperience(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addExperienceInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('preferred_formats')} />
                <div className="mb-2 text-sm">{t('preferred_formats_question')}</div>
                <Select
                    className="w-1/2 mb-1"
                    options={dropdowns.preferredFormat}
                    onChange={(e) => modifyPreferredFormat(e!.value)}
                    // if value is not null, placeholder wont show, even though value inside the object is ''
                    value={
                        veInformation.preferredFormat !== ''
                            ? {
                                  label: veInformation.preferredFormat,
                                  value: veInformation.preferredFormat,
                              }
                            : null
                    }
                    placeholder={t('preferred_formats_placeholder')}
                />
            </EditProfileVerticalSpacer>
        </form>
    );
}
