import { Dispatch, FormEvent, SetStateAction, useState, ChangeEvent } from 'react';
import { Institution, PersonalInformation } from '@/interfaces/profile/profileInterfaces';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import Dialog from './Dialog';
import AvatarEditor from './AvatarEditor';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import Swapper from './Swapper';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import CreatableSelect from 'react-select/creatable';
import { DropdownList } from '@/interfaces/dropdowns';
import { set } from 'date-fns';
import LoadingAnimation from '../LoadingAnimation';
import { RxTrash } from 'react-icons/rx';
import { IoIosHelp } from 'react-icons/io';
import { Tooltip } from '../Tooltip';

interface Props {
    personalInformation: PersonalInformation;
    setPersonalInformation: Dispatch<SetStateAction<PersonalInformation>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
    dropdowns: DropdownList;
}

export default function EditPersonalInformation({
    personalInformation,
    setPersonalInformation,
    updateProfileData,
    orcid,
    importOrcidProfile,
    dropdowns,
}: Props) {
    const { data: session } = useSession();

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

    const modifyLanguages = (index: number, value: string) => {
        let newLanguageTags = [...personalInformation.languages];
        newLanguageTags[index] = value;
        setPersonalInformation({ ...personalInformation, languages: newLanguageTags });
    };

    const swapLanguages = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        // swap indices
        [personalInformation.languages[firstIndex], personalInformation.languages[secondIndex]] = [
            personalInformation.languages[secondIndex],
            personalInformation.languages[firstIndex],
        ];
        setPersonalInformation({
            ...personalInformation,
            languages: personalInformation.languages,
        });
    };

    const deleteFromLanguages = (e: FormEvent, index: number) => {
        e.preventDefault();
        personalInformation.languages.splice(index, 1);
        setPersonalInformation({
            ...personalInformation,
            languages: personalInformation.languages,
        });
    };

    const addLanguagesInputField = (e: FormEvent) => {
        e.preventDefault();
        setPersonalInformation({
            ...personalInformation,
            languages: [...personalInformation.languages, ''],
        });
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

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Name'} />
                <div className={'flex justify-between'}>
                    {/* TODO validation: treat first name and last name as required information*/}
                    <input
                        className={'border border-[#cccccc] rounded-md px-2 py-[6px]'}
                        type="text"
                        placeholder={'Vorname'}
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
                        placeholder={'Nachname'}
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
                        <EditProfileHeadline name={'Institutionen'} />
                        <div className="absolute top-0 left-full">
                            <div className="group relative inline-block">
                                <div className="inline-flex rounded bg-primary px-[2px] text-base font-semibold">
                                    <IoIosHelp size={30} color="#00748f" />
                                </div>
                                <div className="absolute bottom-full left-1/2 w-[20rem] z-20 mb-1 -translate-x-1/2 rounded bg-gray-200 border border-gray-200 shadow-2xl px-4 py-[6px] text-sm font-semibold hidden group-hover:block">
                                    <span className="absolute bottom-[-3px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-gray-200"></span>
                                    Das Anlegen der Institution im Profil gewährt dir einige
                                    Automatisierungen, z.B. kannst du im VE-Designer deine
                                    Institution direkt importieren
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
                                            ? 'aktuelle Institution'
                                            : 'Klicke, um diese als deine aktuelle Institution zu wählen'
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
                                            deleteInstitution(index);
                                            e.stopPropagation();
                                        }}
                                    >
                                        <RxTrash />
                                    </button>
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
                    title={'neue Institution anlegen'}
                    onClose={handleCloseNewInstitutionDialog}
                >
                    <div className="h-[19rem] relative">
                        <div className="mt-4 flex">
                            <div className="w-1/3 flex items-center">
                                <label htmlFor="name" className="px-2 py-2">
                                    Name
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
                                    Fachbereich
                                </label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    placeholder="z.B. Fakultät, Abteilung, etc."
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
                                    Bildungseinrichtung
                                </label>
                            </div>
                            <div className="w-2/3">
                                <select
                                    placeholder="Bildungseinrichtung eingeben"
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
                                    Land
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
                                <span>Abbrechen</span>
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
                                <span>Erstellen</span>
                            </button>
                        </div>
                    </div>
                </Dialog>
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Bio'} />
                <textarea
                    className={'w-full border border-[#cccccc] rounded-md px-2 py-[6px]'}
                    rows={5}
                    placeholder={'Erzähle kurz etwas über dich'}
                    value={personalInformation.bio}
                    onChange={(e) =>
                        setPersonalInformation({ ...personalInformation, bio: e.target.value })
                    }
                ></textarea>
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Fachgebiet'} />
                <CreatableSelect
                    className="w-full mb-1"
                    options={dropdowns.expertise}
                    onChange={(e) =>
                        setPersonalInformation({ ...personalInformation, expertise: e!.value })
                    }
                    // if value is not null, placeholder wont show, even though value inside the object is ''
                    value={
                        personalInformation.expertise !== ''
                            ? {
                                  label: personalInformation.expertise,
                                  value: personalInformation.expertise,
                              }
                            : null
                    }
                    placeholder={
                        'Fachgebiet auswählen oder neues Fachgebiet durch Tippen hinzufügen'
                    }
                    formatCreateLabel={(inputValue) => (
                        <span>
                            Nichts passendes dabei? <b>{inputValue}</b> verwenden
                        </span>
                    )}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Geburtstag'} />
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
                <EditProfileHeadline name={'Sprachen'} />
                {personalInformation.languages.map((language, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={personalInformation.languages.length}
                        swapCallback={swapLanguages}
                        deleteCallback={deleteFromLanguages}
                    >
                        <input
                            className={
                                'border border-[#cccccc] rounded-md px-2 py-[6px] mb-1 w-full'
                            }
                            type="text"
                            placeholder="Verwende pro Sprache ein Feld"
                            value={language}
                            onChange={(e) => modifyLanguages(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addLanguagesInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Profilbild'} />
                <div>
                    <div className="w-fit">
                        <div className="my-2 rounded-full overflow-hidden w-fit border-black border">
                            <AuthenticatedImage
                                imageId={personalInformation.profilePicId as string}
                                alt={'Profilbild'}
                                width={180}
                                height={180}
                            />
                        </div>
                        <div className="flex justify-center">
                            <button
                                className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleOpenProfilePicDialog();
                                }}
                            >
                                ändern
                            </button>
                        </div>
                    </div>
                    <Dialog
                        isOpen={isProfilePicDialogOpen}
                        title="Profilbild hochladen"
                        onClose={handleCloseProfilePicDialog}
                    >
                        <div className="my-2 mx-2">
                            Wähle ein neues Profilbild aus und schneide es zurecht
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
            </EditProfileVerticalSpacer>
        </form>
    );
}
