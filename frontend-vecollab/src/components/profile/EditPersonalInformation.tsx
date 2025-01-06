import { Dispatch, FormEvent, SetStateAction, useState, ChangeEvent, CSSProperties } from 'react';
import {
    Institution,
    OptionLists,
    PersonalInformation,
} from '@/interfaces/profile/profileInterfaces';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import Dialog from './Dialog';
import AvatarEditor from './AvatarEditor';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import CreatableSelect from 'react-select/creatable';
import LoadingAnimation from '../common/LoadingAnimation';
import { RxTrash } from 'react-icons/rx';
import { IoIosHelp } from 'react-icons/io';
import ConfirmDialog from '../common/dialogs/Confirm';
import { useTranslation } from 'next-i18next';
import Button from '../common/buttons/Button';
import { MdCheck } from 'react-icons/md';
import ButtonLight from '../common/buttons/ButtongLight';
import { Badge, badgeOutlineColors, getBadges, hasAnyAchievement } from '../landingPage/Badge';

interface Props {
    personalInformation: PersonalInformation;
    setPersonalInformation: Dispatch<SetStateAction<PersonalInformation>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
    optionLists: OptionLists;
}

export default function EditPersonalInformation({
    personalInformation,
    setPersonalInformation,
    updateProfileData,
    orcid,
    importOrcidProfile,
    optionLists,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const achievementStyle: CSSProperties = personalInformation.chosen_achievement?.level
        ? {
              background: badgeOutlineColors[personalInformation.chosen_achievement.level - 1],
          }
        : {};

    const [isProfilePicDialogOpen, setIsProfilePicDialogOpen] = useState(false);
    const [profilePicFile, setProfilePicFile] = useState('');
    const handleOpenProfilePicDialog = () => {
        setIsProfilePicDialogOpen(true);
    };
    const handleCloseProfilePicDialog = () => {
        setIsProfilePicDialogOpen(false);
    };

    const [institutionsLoading, setInstitutionsLoading] = useState(false);
    const [isNewInstitutionDialogOpen, setIsNewInstitutionDialogOpen] = useState(false);
    const handleOpenNewInstitutionDialog = () => {
        setIsNewInstitutionDialogOpen(true);
    };
    const handleCloseNewInstitutionDialog = () => {
        setIsNewInstitutionDialogOpen(false);
        setNewInstitution({
            _id: '',
            name: '',
            school_type: '',
            department: '',
            country: '',
        });
    };
    const [newInstitution, setNewInstitution] = useState<Institution>({
        _id: '',
        name: '',
        school_type: '',
        department: '',
        country: '',
    });

    const [askDeletion, setAskDeletion] = useState<boolean>(false);

    /*
    callback that is triggered when the user selects a new profile pic in
    the input element. transforms the image to a base64 data uri and sets it
    as profilePicFile
    */
    const onSelectProfilePicFile = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            // on load the reader.result is always an image
            reader.addEventListener('load', () => {
                setProfilePicFile(reader.result as string);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    /*
    upload the newly selected and cropped profile picture
    to the backend. This is done separately from the rest of
    the profile information to reduce state shares across components.
    */
    const uploadProfileImage = (blob: Blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function () {
            // transform base64 payload via base64 data uri and stripping the
            // pre-information
            var base64dataUri = reader.result as string;
            const profilePicPayload = base64dataUri.replace(/^data:image\/[a-z]+;base64,/, '');

            // send to backend and update state with returned _id to be able
            // to retrieve image from uploads endpoint
            fetchPOST(
                '/profileinformation',
                {
                    profile_pic: {
                        type: blob.type,
                        payload: profilePicPayload,
                    },
                },
                session?.accessToken
            ).then((data) => {
                setPersonalInformation({
                    ...personalInformation,
                    profilePicId: data.profile_pic_id,
                });
            });
        };
    };

    const uploadNewInstitution = () => {
        setInstitutionsLoading(true);
        fetchPOST(
            '/profileinformation',
            {
                institutions: [...personalInformation.institutions, newInstitution],
            },
            session?.accessToken
        ).then((data) => {
            fetchGET('/profileinformation', session?.accessToken).then((data) => {
                setPersonalInformation({
                    ...personalInformation,
                    institutions: data.profile.institutions,
                });
                setInstitutionsLoading(false);
            });
        });
    };

    const deleteInstitution = (index: number) => {
        let newInstitutions = [...personalInformation.institutions];
        newInstitutions.splice(index, 1);

        // if the deleted institution was the chosen one, set the chosen_institution_id to ''
        let newChosenInstitutionId = personalInformation.chosen_institution_id;
        if (newChosenInstitutionId === personalInformation.institutions[index]._id) {
            newChosenInstitutionId = '';
        }
        setPersonalInformation({
            ...personalInformation,
            institutions: newInstitutions,
            chosen_institution_id: newChosenInstitutionId,
        });
    };

    // const Achievements = <Badges achievements={personalInformation.achievements} />;

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('common:name')} />
                <div className={'flex justify-between'}>
                    {/* TODO validation: treat first name and last name as required information*/}
                    <input
                        className={'border border-[#cccccc] rounded-md px-2 py-[6px]'}
                        type="text"
                        placeholder={t('common:first_name')}
                        value={personalInformation.firstName}
                        onChange={(e) =>
                            setPersonalInformation({
                                ...personalInformation,
                                firstName: e.target.value,
                            })
                        }
                    />
                    <input
                        className={'border border-[#cccccc] rounded-md px-2 py-[6px]'}
                        type="text"
                        placeholder={t('common:last_name')}
                        value={personalInformation.lastName}
                        onChange={(e) =>
                            setPersonalInformation({
                                ...personalInformation,
                                lastName: e.target.value,
                            })
                        }
                    />
                </div>
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <div className="flex justify-between">
                    <div className="relative">
                        <EditProfileHeadline name={t('institutions')} />
                        <div className="absolute top-0 left-full">
                            <div className="group relative inline-block">
                                <div className="inline-flex rounded bg-primary px-[2px] text-base font-semibold">
                                    <IoIosHelp size={30} color="#00748f" />
                                </div>
                                <div className="absolute bottom-full left-1/2 w-[20rem] z-20 mb-1 -translate-x-1/2 rounded bg-gray-200 border border-gray-200 shadow-2xl px-4 py-[6px] text-sm font-semibold hidden group-hover:block">
                                    <span className="absolute bottom-[-3px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-gray-200"></span>
                                    {t('institutions_tooltip')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <EditProfilePlusMinusButtons
                        plusCallback={(e) => {
                            e.preventDefault();
                            handleOpenNewInstitutionDialog();
                        }}
                    />
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                    {institutionsLoading ? (
                        <LoadingAnimation />
                    ) : (
                        <>
                            {personalInformation.institutions.map((institution, index) => (
                                <div
                                    key={index}
                                    className={
                                        'rounded-xl border p-2 relative ' +
                                        (personalInformation.chosen_institution_id ===
                                        institution._id
                                            ? 'border-slate-900 cursor-default'
                                            : 'border-[#cccccc] cursor-pointer')
                                    }
                                    title={
                                        personalInformation.chosen_institution_id ===
                                        institution._id
                                            ? t('current_institution')
                                            : t('choose_as_current_institution')
                                    }
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPersonalInformation({
                                            ...personalInformation,
                                            chosen_institution_id: institution._id,
                                        });
                                    }}
                                >
                                    <button
                                        className="absolute top-2 right-2"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setAskDeletion(true);
                                            e.stopPropagation();
                                        }}
                                    >
                                        <RxTrash />
                                    </button>
                                    {askDeletion && (
                                        <ConfirmDialog
                                            message={t('confirm_delete_institution')}
                                            callback={(proceed) => {
                                                if (proceed) deleteInstitution(index);
                                                setAskDeletion(false);
                                            }}
                                        />
                                    )}
                                    <div className="font-bold">{institution.name}</div>
                                    <div>{institution.department}</div>
                                    <div className="text-gray-600">{institution.school_type}</div>
                                    <div className="text-gray-600">{institution.country}</div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
                <Dialog
                    isOpen={isNewInstitutionDialogOpen}
                    title={t('create_new_institution')}
                    onClose={handleCloseNewInstitutionDialog}
                >
                    <div className="h-[19rem] relative">
                        <div className="mt-4 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="name" className="px-2 py-2">
                                    {t('common:name')}
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    className="border border-gray-400 rounded-lg w-full p-2"
                                    value={newInstitution.name}
                                    onChange={(e) =>
                                        setNewInstitution({
                                            ...newInstitution,
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="department" className="px-2 py-2">
                                    {t('department')}
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    placeholder={t('department_placeholder')}
                                    className="border border-gray-400 rounded-lg w-full p-2"
                                    value={newInstitution.department}
                                    onChange={(e) =>
                                        setNewInstitution({
                                            ...newInstitution,
                                            department: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="schoolType" className="px-2 py-2">
                                    {t('school_type')}
                                </label>
                            </div>
                            <div className="w-2/3">
                                <select
                                    placeholder={t('school_type_placeholder')}
                                    className="border border-gray-400 rounded-lg w-full px-1 py-2"
                                    value={newInstitution.school_type}
                                    onChange={(e) =>
                                        setNewInstitution({
                                            ...newInstitution,
                                            school_type: e.target.value,
                                        })
                                    }
                                >
                                    <option value="Hochschule/Universität/College">
                                        Hochschule/Universität/College
                                    </option>
                                    <option value="Fachhochschule/University of Applied Sciences">
                                        Fachhochschule/University of Applied Sciences
                                    </option>
                                    <option value="Berufsschule">Berufsschule</option>
                                    <option value="Schule – Primärbereich">
                                        Schule – Primärbereich
                                    </option>
                                    <option value="Schule – Sekundarbereich">
                                        Schule – Sekundarbereich
                                    </option>

                                    <option value="Sonstige">Sonstige</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="country" className="px-2 py-2">
                                    {t('country')}
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    className="border border-gray-400 rounded-lg w-full p-2"
                                    value={newInstitution.country}
                                    onChange={(e) =>
                                        setNewInstitution({
                                            ...newInstitution,
                                            country: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex absolute bottom-0 w-full">
                            <button
                                className={
                                    'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                                }
                                onClick={handleCloseNewInstitutionDialog}
                            >
                                <span>{t('common:cancel')}</span>
                            </button>
                            <button
                                className={
                                    'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                                }
                                onClick={(e) => {
                                    e.preventDefault();
                                    uploadNewInstitution();
                                    handleCloseNewInstitutionDialog();
                                }}
                            >
                                <span>{t('common:create')}</span>
                            </button>
                        </div>
                    </div>
                </Dialog>
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('bio')} />
                <textarea
                    className={'w-full border border-[#cccccc] rounded-md px-2 py-[6px]'}
                    rows={5}
                    placeholder={t('bio_placeholder')}
                    value={personalInformation.bio}
                    onChange={(e) =>
                        setPersonalInformation({ ...personalInformation, bio: e.target.value })
                    }
                ></textarea>
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('expertise')} />
                <CreatableSelect
                    className="w-full mb-1"
                    options={optionLists.expertiseKeys.map((expertise) => ({
                        label: t('expertise_options.' + expertise, { defaultValue: expertise }),
                        value: expertise,
                    }))}
                    onChange={(e) =>
                        setPersonalInformation({ ...personalInformation, expertise: e!.value })
                    }
                    // if value is not null, placeholder wont show, even though value inside the object is ''
                    value={
                        personalInformation.expertise !== ''
                            ? {
                                  label: t('expertise_options.' + personalInformation.expertise, {
                                      defaultValue: personalInformation.expertise,
                                  }),
                                  value: personalInformation.expertise,
                              }
                            : null
                    }
                    placeholder={t('expertise_placeholder')}
                    formatCreateLabel={(inputValue) => (
                        <span>
                            {t('expertise_select_no_matching_result1')} <b>{inputValue}</b>{' '}
                            {t('expertise_select_no_matching_result2')}
                        </span>
                    )}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('birthday')} />
                <input
                    className={'border border-[#cccccc] rounded-md px-2 py-[6px]'}
                    type="date"
                    value={personalInformation.birthday}
                    onChange={(e) =>
                        setPersonalInformation({ ...personalInformation, birthday: e.target.value })
                    }
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('languages')} />
                <CreatableSelect
                    className="w-full mb-1"
                    options={optionLists.languageKeys.map((language) => ({
                        label: t('common:languages.' + language, { defaultValue: language }),
                        value: language,
                    }))}
                    onChange={(e) =>
                        setPersonalInformation({
                            ...personalInformation,
                            languages: e!.map((option) => option.value),
                        })
                    }
                    // if value is not null, placeholder wont show, even though value inside the object is ''
                    value={
                        personalInformation.languages
                            ? personalInformation.languages.map((language) => ({
                                  label: t('common:languages.' + language, {
                                      defaultValue: language,
                                  }),
                                  value: language,
                              }))
                            : []
                    }
                    placeholder={t('languages_placeholder')}
                    isMulti
                    isClearable={true}
                    closeMenuOnSelect={false}
                    formatCreateLabel={(inputValue) => (
                        <span>
                            {t('languages_no_matching_result1')}
                            <b>{inputValue}</b> {t('languages_no_matching_result2')}
                        </span>
                    )}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <div className="flex space-x-4">
                    <div>
                        <EditProfileHeadline name={t('profile_picture')} />
                        <div className="w-fit">
                            <div
                                className={`my-4 rounded-full overflow-hidden w-fit p-[3px] -m-[3px] mt-[20px] ml-[10px]`}
                                style={achievementStyle}
                            >
                                {personalInformation.chosen_achievement?.type && (
                                    <span className="absolute -ml-[15px] -mt-[15px]">
                                        <Badge
                                            type={personalInformation.chosen_achievement?.type}
                                            level={personalInformation.chosen_achievement?.level}
                                        />
                                    </span>
                                )}
                                <AuthenticatedImage
                                    imageId={personalInformation.profilePicId as string}
                                    alt={t('profile_picture')}
                                    width={180}
                                    height={180}
                                    className="rounded-full border-2 border-white"
                                />
                            </div>
                            <div className="flex justify-center">
                                <button
                                    className={
                                        'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                    }
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleOpenProfilePicDialog();
                                    }}
                                >
                                    {t('common:edit')}
                                </button>
                            </div>
                        </div>

                        <Dialog
                            isOpen={isProfilePicDialogOpen}
                            title={t('upload_profile_picture')}
                            onClose={handleCloseProfilePicDialog}
                        >
                            <div className="my-2 mx-2">
                                {t('upload_profile_picture_description')}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="my-2"
                                onChange={onSelectProfilePicFile}
                                onClick={(e) => {
                                    e.currentTarget.value = '';
                                }}
                            />
                            {profilePicFile !== '' ? (
                                <div className="w-[90vw] max-w-[450px] max-h-[85vh]">
                                    <AvatarEditor
                                        sourceImg={profilePicFile}
                                        onFinishUpload={(blob) => {
                                            uploadProfileImage(blob);
                                            handleCloseProfilePicDialog();
                                        }}
                                    />
                                </div>
                            ) : (
                                <></>
                            )}
                        </Dialog>
                    </div>
                    {hasAnyAchievement(personalInformation.achievements) && (
                        <div>
                            <EditProfileHeadline name={t('decoration_badge')} />
                            <p>{t('decoration_badge_descr')}</p>
                            <ul className="flex flex-wrap gap-4 items-center">
                                {getBadges({ achievements: personalInformation.achievements }).map(
                                    (item, index) => {
                                        return (
                                            <li key={index}>
                                                <Button
                                                    className={`flex items-center justify-center relative`}
                                                    onClick={() => {
                                                        setPersonalInformation({
                                                            ...personalInformation,
                                                            chosen_achievement: {
                                                                type: item.type,
                                                                level: item.level,
                                                            },
                                                        });
                                                    }}
                                                >
                                                    {item.badge}
                                                    {personalInformation.chosen_achievement?.type ==
                                                        item.type &&
                                                        personalInformation.chosen_achievement
                                                            ?.level == item.level && (
                                                            <MdCheck
                                                                size={26}
                                                                className="text-green-600 m-2 bg-white/75 rounded-full absolute"
                                                            />
                                                        )}
                                                </Button>
                                            </li>
                                        );
                                    }
                                )}
                                <li>
                                    <ButtonLight
                                        className="!rounded-full flex gap-2 items-center ml-4"
                                        onClick={() => {
                                            setPersonalInformation({
                                                ...personalInformation,
                                                chosen_achievement: { type: '', level: 0 },
                                            });
                                        }}
                                    >
                                        Keines
                                        {(personalInformation.chosen_achievement == null ||
                                            personalInformation.chosen_achievement.type == '') && (
                                            <MdCheck size={22} className="text-green-600 mx-2" />
                                        )}
                                    </ButtonLight>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </EditProfileVerticalSpacer>
        </form>
    );
}
