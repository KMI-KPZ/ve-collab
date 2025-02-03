import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useRouter } from 'next/router';
import { RxTrash } from 'react-icons/rx';
import LoadingAnimation from '../common/LoadingAnimation';
import BoxHeadline from '@/components/common/BoxHeadline';
import { useTranslation } from 'next-i18next';
import UserProfileImage from '../network/UserProfileImage';

interface Props {
    loading: boolean;
    userSnippets: UserSnippet[];
    closeCallback: () => void;
    trashOption: boolean;
    foreignUser?: boolean;
    trashCallback?: (username: string) => void;
}

export default function DialogUserList({
    loading,
    userSnippets,
    closeCallback,
    trashOption,
    foreignUser,
    trashCallback,
}: Props) {
    const { t } = useTranslation(['community', 'common']);

    const router = useRouter();
    return (
        <div className="w-[30rem] min-h-[15rem] overflow-y-auto content-scrollbar">
            {loading ? (
                <div className="flex w-full h-full justify-center items-center">
                    <LoadingAnimation />
                </div>
            ) : (
                <ul className="px-1 divide-y">
                    {userSnippets.map((snippet, index) => (
                        <li key={index} className="flex py-2">
                            <div
                                className="flex cursor-pointer items-center"
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.push(`/profile/user/${snippet.preferredUsername}`);
                                    closeCallback();
                                }}
                            >
                                <div>
                                    <UserProfileImage
                                        profile_pic={snippet.profilePicUrl}
                                        chosen_achievement={snippet.chosen_achievement}
                                        width={60}
                                        height={60}
                                    />
                                </div>
                                <div>
                                    <BoxHeadline title={snippet.name} />
                                    <div className="mx-2 px-1 my-1 text-gray-600">
                                        {snippet.institution}
                                    </div>
                                </div>
                            </div>
                            {trashOption && (
                                <>
                                    {!foreignUser && (
                                        <div className="ml-auto flex items-center">
                                            <RxTrash
                                                size={20}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    trashCallback !== undefined
                                                        ? trashCallback(snippet.preferredUsername)
                                                        : {};
                                                }}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
