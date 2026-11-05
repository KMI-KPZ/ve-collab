import BoxHeadline from '@/components/common/BoxHeadline';
import WhiteBox from '@/components/common/WhiteBox';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

export type GroupSection = 'timeline' | 'members' | 'files';

interface Props {
    groupId: string;
    active: GroupSection;
    description?: string | null;
    /**
     * the group page switches between timeline and members locally and passes
     * this callback; without it (file share page) the buttons link back to the
     * group page instead
     */
    onSelectSection?: (section: 'timeline' | 'members') => void;
}

const BUTTON_CLASSES =
    'block w-full h-12 mb-2 border border-gray-200 py-3 px-6 rounded-lg shadow-sm text-center';
const ACTIVE_CLASSES = 'bg-ve-collab-blue text-white';
const INACTIVE_CLASSES =
    'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue';

/**
 * the right column of a group: the section navigation (dashboard, members,
 * file share) and the description.
 */
export default function GroupSidebar({ groupId, active, description, onSelectSection }: Props) {
    const { t } = useTranslation('community');

    const sections: { id: GroupSection; label: string; href: string }[] = [
        { id: 'timeline', label: t('dashboard'), href: `/group/${groupId}` },
        { id: 'members', label: t('members'), href: `/group/${groupId}?tab=members` },
        { id: 'files', label: t('fileshare'), href: `/group/${groupId}/files` },
    ];

    return (
        <div className={'w-full md:w-1/4 lg:pl-4'}>
            {sections.map((section) => {
                const classes = `${BUTTON_CLASSES} ${
                    active === section.id ? ACTIVE_CLASSES : INACTIVE_CLASSES
                }`;

                // timeline and members are switched locally on the group page
                if (section.id !== 'files' && onSelectSection) {
                    return (
                        <button
                            key={section.id}
                            type="button"
                            className={`${classes} cursor-pointer`}
                            onClick={() => onSelectSection(section.id as 'timeline' | 'members')}
                        >
                            <span>{section.label}</span>
                        </button>
                    );
                }

                return (
                    <Link key={section.id} href={section.href} className={classes}>
                        <span>{section.label}</span>
                    </Link>
                );
            })}
            <WhiteBox>
                <BoxHeadline title={t('description')} />
                <div className="min-h-[20vh] mx-2 my-4 px-1">
                    <div className={'text-gray-500'}>
                        {description ? description : t('no_description_available')}
                    </div>
                </div>
            </WhiteBox>
        </div>
    );
}
