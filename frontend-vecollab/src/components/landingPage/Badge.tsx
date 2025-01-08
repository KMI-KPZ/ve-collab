import { useTranslation } from 'react-i18next';
import React from 'react';
import { Achievements } from '@/interfaces/api/apiInterfaces';
import Image from 'next/image';

export const badgeOutlineColors = [
    '#d57839',
    '#66a8b8',
    '#f5a900',
    'linear-gradient(123deg, #f400ff, #07a1dd)',
];

const levelStrings = ['bronze', 'silver', 'gold', 'platinum'];
// enum levelStrings2 {
//     'bronze' = 1,
//     'silver' = 2,
//     'gold' = 3,
//     'platinum' = 4,
// }

interface iBadgeElem {
    type: 'social' | 've';
    level: number;
    badge: JSX.Element;
}

export const Badge = ({ type, level }: { type: 'social' | 've'; level: number }): JSX.Element => {
    const { t } = useTranslation(['community']);
    if (level > levelStrings.length) {
        return <></>;
    }
    const title: string = t(`${type}_badge_${level}`);
    return (
        <Image
            src={`/images/badges/${type}_${levelStrings[level - 1]}.png`}
            alt={'badge images'}
            title={title}
            className="w-[72px] rounded-full"
            width={72}
            height={50}
        />
    );
};

export const getBadges = ({ achievements }: { achievements?: Achievements }): iBadgeElem[] => {
    if (!achievements) return [];

    const getBadgesOfType = (type: 'social' | 've'): iBadgeElem[] => {
        let badges: iBadgeElem[] = [];

        if (!Object.hasOwn(achievements, type)) return [];

        if (achievements[type].level == 0) return [];
        for (let i = 0; i < achievements[type].level; i++) {
            if (i >= levelStrings.length) {
                continue;
            }

            badges.push({
                type: type,
                level: i + 1,
                badge: (
                    <span key={`${type}-${i}`}>
                        <Badge type={type} level={i + 1} />
                    </span>
                ),
            });
        }

        return badges;
    };

    return [...getBadgesOfType('social'), ...getBadgesOfType('ve')];
};

export function hasAnyAchievement(achievements?: Achievements) {
    if (!achievements) return false;
    return achievements.social.level > 0 || achievements.ve.level > 0;
}
