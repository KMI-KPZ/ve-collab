import { Dispatch, FormEvent, SetStateAction, useState, ChangeEvent } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';
import { PersonalInformation } from '@/interfaces/profile/profileInterfaces';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import Dialog from './Dialog';
import AvatarEditor from './AvatarEditor';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { BACKEND_URL } from '@/constants';
import ProfileImage from './ProfileImage';

interface Props {
    personalInformation: PersonalInformation;
    setPersonalInformation: Dispatch<SetStateAction<PersonalInformation>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    keyCodeDelimiters: number[];
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditPersonalInformation({
    personalInformation,
    setPersonalInformation,
    updateProfileData,
    keyCodeDelimiters,
    orcid,
    importOrcidProfile,
}: Props) {
    const { data: session } = useSession();

    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState('');
    const handleOpenDialog = () => {
        setIsOpen(true);
    };
    const handleCloseDialog = () => {
        setIsOpen(false);
    };

    const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            // on load the reader.result is always an image
            reader.addEventListener('load', () => {
                setFile(reader.result as string);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleDeleteLanguage = (i: number) => {
        setPersonalInformation({
            ...personalInformation,
            languageTags: personalInformation.languageTags.filter((tag, index) => index !== i),
        });
    };

    const handleAdditionLanguage = (tag: { id: string; text: string }) => {
        setPersonalInformation({
            ...personalInformation,
            languageTags: [...personalInformation.languageTags, tag],
        });
    };

    const handleDragLanguage = (
        tag: { id: string; text: string },
        currPos: number,
        newPos: number
    ) => {
        const newTags = personalInformation.languageTags.slice();

        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);

        // re-render
        setPersonalInformation({
            ...personalInformation,
            languageTags: newTags,
        });
    };

    const handleTagClickLanguage = (index: number) => {
        console.log('The tag at index ' + index + ' was clicked');
    };

    const uploadProfileImage = (blob: Blob) => {
        console.log(blob);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function () {
            var base64dataUri = reader.result as string;
            const profilePicPayload = base64dataUri.replace(/^data:image\/[a-z]+;base64,/, '');
            console.log(profilePicPayload);
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
                console.log(data);
                setPersonalInformation({
                    ...personalInformation,
                    profilePicId: data.profile_pic_id,
                });
            });
        };
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Name'} />
                <div className={'flex justify-between'}>
                    {/* TODO validation: treat first name and last name as required information*/}
                    <input
                        className={'border border-gray-500 rounded-lg px-2 py-1'}
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
                        className={'border border-gray-500 rounded-lg px-2 py-1'}
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
                <EditProfileHeadline name={'Institution'} />
                <input
                    className={'border border-gray-500 rounded-lg px-2 py-1 w-1/2'}
                    type="text"
                    placeholder={'Name deiner aktuellen Institution'}
                    value={personalInformation.institution}
                    onChange={(e) =>
                        setPersonalInformation({
                            ...personalInformation,
                            institution: e.target.value,
                        })
                    }
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Bio'} />
                <textarea
                    className={'w-full border border-gray-500 rounded-lg px-2 py-1'}
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
                <input
                    className={'border border-gray-500 rounded-lg px-2 py-1 w-1/2'}
                    type="text"
                    placeholder={'Worin liegt deine Expertise?'}
                    value={personalInformation.expertise}
                    onChange={(e) =>
                        setPersonalInformation({
                            ...personalInformation,
                            expertise: e.target.value,
                        })
                    }
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Geburtstag'} />
                <input
                    className={'border border-gray-500 rounded-lg px-2 py-1'}
                    type="date"
                    value={personalInformation.birthday}
                    onChange={(e) =>
                        setPersonalInformation({ ...personalInformation, birthday: e.target.value })
                    }
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Sprachen'} />
                <ReactTags
                    tags={personalInformation.languageTags}
                    delimiters={keyCodeDelimiters}
                    handleDelete={handleDeleteLanguage}
                    handleAddition={handleAdditionLanguage}
                    handleDrag={handleDragLanguage}
                    handleTagClick={handleTagClickLanguage}
                    inputFieldPosition="bottom"
                    placeholder="Enter, um neue Sprache hinzuzufügen"
                    classNames={{
                        tag: 'mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg',
                        tagInputField: 'w-3/4 border border-gray-500 rounded-lg my-4 px-2 py-1',
                        remove: 'ml-1',
                    }}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Profilbild'} />
                <div>
                    <div className="w-fit">
                        <div className="my-2 rounded-full overflow-hidden w-fit border-black border">
                            <ProfileImage profilePicId={personalInformation.profilePicId} />
                        </div>
                        <div className="flex justify-center">
                            <button
                                className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleOpenDialog();
                                }}
                            >
                                ändern
                            </button>
                        </div>
                    </div>

                    <Dialog
                        isOpen={isOpen}
                        title="Profilbild hochladen"
                        onClose={handleCloseDialog}
                    >
                        <div className="my-2 mx-2">
                            Wähle ein neues Profilbild aus und schneide es zurecht
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="my-2"
                            onChange={onSelectFile}
                            onClick={(e) => {
                                e.currentTarget.value = '';
                            }}
                        />
                        {file !== '' ? (
                            <div className="w-[90vw] max-w-[450px] max-h-[85vh]">
                                <AvatarEditor
                                    sourceImg={file}
                                    onFinishUpload={(blob) => {
                                        uploadProfileImage(blob);
                                        handleCloseDialog();
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
