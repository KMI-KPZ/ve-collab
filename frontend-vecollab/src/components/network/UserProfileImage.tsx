import { ChosenAchievement } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { useTranslation } from 'react-i18next';
import { CSSProperties } from 'react';
import { badgeOutlineColors } from '../landingPage/Badge';

interface Props {
    profile_pic?: string;
    chosen_achievement?: null | ChosenAchievement;
    width?: number;
    height?: number;
    className?: string;
}

export default function UserProfileImage({
    profile_pic = 'default_profile_pic.jpg',
    chosen_achievement,
    width = 40,
    height = 40,
    className = '',
}: Props) {
    const { t } = useTranslation(['community', 'common']);

    const style: CSSProperties = chosen_achievement?.level
        ? { background: badgeOutlineColors[chosen_achievement.level - 1] }
        : {};

    return (
        <span className="rounded-full p-[2px] -m-[2px] mr-3" style={style}>
            <AuthenticatedImage
                imageId={profile_pic}
                alt={t('profile_picture')}
                width={width}
                height={height}
                className={`rounded-full border-2 border-white ${className}`}
            ></AuthenticatedImage>
        </span>
    );
}
