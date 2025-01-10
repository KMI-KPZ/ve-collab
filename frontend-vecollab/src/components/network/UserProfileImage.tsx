import { ChosenAchievement } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { useTranslation } from 'react-i18next';
import { CSSProperties, useState } from 'react';
import { Badge, badgeOutlineColors } from '../landingPage/Badge';

interface Props {
    type?: 'small' | 'big';
    profile_pic?: string;
    chosen_achievement?: null | ChosenAchievement;
    width?: number;
    height?: number;
    className?: string;
}

export default function UserProfileImage({
    type = 'small',
    profile_pic = 'default_profile_pic.jpg',
    chosen_achievement,
    width = 40,
    height = 40,
    className = '',
}: Props) {
    const { t } = useTranslation(['community', 'common']);
    const [loadedImage, setLoadedImage] = useState<boolean>(false); // used only for big image

    const style: CSSProperties = chosen_achievement?.level
        ? { background: badgeOutlineColors[chosen_achievement.level - 1] }
        : {};

    if (type == 'big') {
        return (
            <div className="relative">
                {chosen_achievement?.type && (
                    <span className="absolute -left-[15px] -top-[15px]">
                        <Badge type={chosen_achievement.type} level={chosen_achievement.level} />
                    </span>
                )}
                <div
                    className={`bg-transparent rounded-full overflow-hidden shadow ${
                        chosen_achievement?.type ? 'p-[4px] -m-[4px]' : ''
                    }`}
                    style={loadedImage ? style : {}}
                >
                    <AuthenticatedImage
                        imageId={profile_pic}
                        alt={t('profile_pic')}
                        width={width}
                        height={height}
                        className={`rounded-full ${
                            chosen_achievement?.type ? 'border-4 border-white' : ''
                        } ${className}`}
                        onLoad={() => {
                            setLoadedImage(true);
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <span className="inline-block rounded-full p-[2px] -m-[2px] mr-3" style={style}>
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
