import { useRouter } from 'next/router';
import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import BoxHeadline from '@/components/common/BoxHeadline';
import { RxTrash } from 'react-icons/rx';
import { UserAccessSnippet } from '@/interfaces/profile/profileInterfaces';
import { useTranslation } from 'next-i18next';

interface Props {
    snippet: UserAccessSnippet;
    closeDialogCallback: () => void;
    changeAccessCallback: (username: string, access: string) => void;
    revokeAccessCallback: (username: string) => void;
}

export default function EditAccessUserSnippet({
    snippet,
    closeDialogCallback,
    changeAccessCallback,
    revokeAccessCallback,
}: Props) {
    const router = useRouter();
    const { t } = useTranslation('common');

    return (
        <li className="py-2">
            <div
                className="flex cursor-pointer"
                onClick={(e) => {
                    e.preventDefault();
                    router.push(`/profile/user/${snippet.preferredUsername}`);
                    closeDialogCallback();
                }}
            >
                <div>
                    <AuthenticatedImage
                        imageId={snippet.profilePicUrl}
                        alt={t("profil_pic_alt_text")}
                        width={60}
                        height={60}
                        className="rounded-full"
                    ></AuthenticatedImage>
                </div>
                <div>
                    <BoxHeadline title={snippet.name} />
                    <div className="mx-2 px-1 my-1 text-gray-600">{snippet.institution}</div>
                </div>
            </div>
            <div className="flex items-center my-2 mx-2 justify-between">
                <div>
                    <label className="mx-2">
                        <input
                            className="mx-2"
                            type="radio"
                            name={'access' + snippet.preferredUsername}
                            id="readInput"
                            value="read"
                            defaultChecked={snippet.access === 'read'}
                            onChange={(e) =>
                                changeAccessCallback(snippet.preferredUsername, e.target.value)
                            }
                        />
                        {t("plans_share_dialog_radio_btn_read")}
                    </label>
                </div>
                <div>
                    <label className="mx-2">
                        <input
                            className="mx-2"
                            type="radio"
                            name={'access' + snippet.preferredUsername}
                            id="writeInput"
                            value={'write'}
                            defaultChecked={snippet.access === 'write'}
                            onChange={(e) =>
                                changeAccessCallback(snippet.preferredUsername, e.target.value)
                            }
                        />
                        {t("plans_share_dialog_radio_btn_read_and_write")}
                    </label>
                </div>
                <div className="flex items-center">
                    <RxTrash
                        size={20}
                        onClick={(e) => {
                            e.preventDefault();
                            revokeAccessCallback(snippet.preferredUsername);
                        }}
                        className="cursor-pointer"
                    />
                </div>
            </div>
        </li>
    );
}
