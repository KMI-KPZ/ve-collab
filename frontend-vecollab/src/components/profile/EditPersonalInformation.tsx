import { Dispatch, FormEvent, SetStateAction, useState, ChangeEvent } from 'react';
//import { WithContext as ReactTags } from 'react-tag-input';
import { PersonalInformation } from '@/interfaces/profile/profileInterfaces';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import Dialog from './Dialog';
import AvatarEditor from './AvatarEditor';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import AuthenticatedImage from '@/components/AuthenticatedImage';

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

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [profilePicFile, setProfilePicFile] = useState('');
    const handleOpenDialog = () => {
        setIsDialogOpen(true);
    };
    const handleCloseDialog = () => {
        setIsDialogOpen(false);
    };

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
                <div>Tags are broken because of version mismatch with hierarchy, todo fix</div>
                {/*
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
                */}
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
                                    handleOpenDialog();
                                }}
                            >
                                ändern
                            </button>
                        </div>
                    </div>
                    <Dialog
                        isOpen={isDialogOpen}
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
