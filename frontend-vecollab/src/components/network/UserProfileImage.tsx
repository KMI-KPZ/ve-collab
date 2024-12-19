import { BackendPostAuthor, ChosenAchievement } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';
import Link from 'next/link';
import Timestamp from '@/components/common/Timestamp';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

interface Props {
    profile_pic?: string;
    chosen_achievement?: null | ChosenAchievement;
    width?: number;
    height?: number;
    className?: string;
}

export const profileImgBadgeOutlineColors = ['#d6773b', '#5bb0b9', '#ea921a', '#8f8f8f'];

export default function UserProfileImage({
    profile_pic = 'default_profile_pic.jpg',
    chosen_achievement,
    width = 40,
    height = 40,
    className = '',
}: Props) {
    const { t } = useTranslation(['community', 'common']);

    const achievementOutlineCss = `outline outline-2 outline-[${
        profileImgBadgeOutlineColors[chosen_achievement?.level ? chosen_achievement?.level - 1 : 0]
    }] outline-offset-2`;

    return (
        <AuthenticatedImage
            imageId={profile_pic}
            alt={t('profile_picture')}
            width={width}
            height={height}
            className={`rounded-full mr-3 ${
                chosen_achievement?.type && achievementOutlineCss
            } ${className}`}
        ></AuthenticatedImage>
    );
}
