import BoxHeadline from '@/components/common/BoxHeadline';
import WhiteBox from '@/components/common/WhiteBox';
import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { MdCheckCircle, MdOutlineChat, MdRadioButtonUnchecked } from 'react-icons/md';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import UserProfileImage from './UserProfileImage';

interface Props {
    group: BackendGroup;
    memberSnippets: UserSnippet[];
    // opens the chat window with the room of exactly these users (including oneself)
    openOrCreateChatWith: (users: string[]) => void;
}

export default function GroupMembers({ group, memberSnippets, openOrCreateChatWith }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);
    const router = useRouter();

    const [selecting, setSelecting] = useState<boolean>(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [search, setSearch] = useState<string>('');

    const username = session?.user.preferred_username as string;
    const admins = group.admins;
    const members = group.members.filter((member) => !group.admins.includes(member));
    // oneself is always part of the chat, so only the others can be selected
    const selectableAdmins = admins.filter((user) => user !== username);
    const selectable = [...selectableAdmins, ...members.filter((user) => user !== username)];

    // snippet of a member, with a fallback so a missing profile never crashes the view
    const snippetOf = (user: string): UserSnippet =>
        memberSnippets.find((snippet) => snippet.preferredUsername === user) ?? {
            name: user,
            profilePicUrl: '',
            institution: '',
            preferredUsername: user,
        };

    const query = search.trim().toLowerCase();
    const matchesSearch = (user: string) =>
        !selecting ||
        !query ||
        snippetOf(user).name.toLowerCase().includes(query) ||
        user.toLowerCase().includes(query);
    const visibleAdmins = admins.filter(matchesSearch);
    const visibleMembers = members.filter(matchesSearch);

    const toggle = (user: string) =>
        setSelected((prev) =>
            prev.includes(user) ? prev.filter((other) => other !== user) : [...prev, user]
        );

    const stopSelecting = () => {
        setSelecting(false);
        setSelected([]);
        setSearch('');
    };

    const openChat = () => {
        if (!selected.length) return;
        openOrCreateChatWith([username, ...selected]);
        stopSelecting();
    };

    const tile = (user: string) => {
        const snippet = snippetOf(user);
        const image = (
            <UserProfileImage
                profile_pic={snippet.profilePicUrl}
                chosen_achievement={snippet.chosen_achievement}
                width={100}
                height={100}
            />
        );

        if (!selecting) {
            return (
                <div
                    key={user}
                    className="mx-6 my-1 cursor-pointer"
                    onClick={() => router.push(`/profile/user/${user}`)}
                >
                    <div className="flex justify-center">{image}</div>
                    <BoxHeadline title={snippet.name} />
                </div>
            );
        }

        const isSelf = user === username;
        const isSelected = selected.includes(user);
        return (
            <button
                key={user}
                type="button"
                className={`mx-6 my-1 ${isSelf ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                onClick={() => toggle(user)}
                disabled={isSelf}
                aria-pressed={isSelected}
                title={isSelf ? t('chat_always_includes_you') : undefined}
            >
                <span className="flex justify-center">
                    <span className="relative">
                        {image}
                        {!isSelf && (
                            // the image keeps a margin on its right
                            <span className="absolute top-0 right-3 rounded-full bg-white">
                                {isSelected ? (
                                    <MdCheckCircle size={28} className="text-ve-collab-blue" />
                                ) : (
                                    <MdRadioButtonUnchecked size={28} className="text-gray-400" />
                                )}
                            </span>
                        )}
                    </span>
                </span>
                <span className="block mx-2 px-1 my-1 font-bold text-slate-900 text-xl">
                    {snippet.name}
                </span>
            </button>
        );
    };

    const quickSelection = (label: string, users: string[]) => (
        <button
            type="button"
            className="px-3 rounded-full border border-gray-300 hover:bg-ve-collab-blue-light cursor-pointer"
            onClick={() => setSelected(users)}
        >
            {label}
        </button>
    );

    return (
        <WhiteBox>
            {selecting && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <p className="grow text-gray-600">{t('start_chat_hint')}</p>
                    <input
                        type="search"
                        className="w-full sm:w-64 border border-[#cccccc] rounded-md px-2 py-1.5"
                        placeholder={t('search_members')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            )}

            {(!selecting || visibleAdmins.length > 0) && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <BoxHeadline title={t('admins')} />
                        {!selecting && selectable.length > 0 && (
                            <ButtonSecondary
                                className="flex items-center"
                                onClick={() => setSelecting(true)}
                            >
                                <MdOutlineChat className="mr-2" />
                                {t('start_chat')}
                            </ButtonSecondary>
                        )}
                    </div>
                    <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                    <div className="mb-8 flex flex-wrap max-h-72 overflow-y-auto content-scrollbar">
                        {visibleAdmins.map(tile)}
                    </div>
                </>
            )}
            {(!selecting || visibleMembers.length > 0) && (
                <>
                    <BoxHeadline title={t('members')} />
                    <hr className="h-px mt-2 mb-6 bg-gray-200 border-0" />
                    <div className="flex flex-wrap max-h-72 overflow-y-auto content-scrollbar">
                        {visibleMembers.map(tile)}
                    </div>
                </>
            )}
            {selecting && !visibleAdmins.length && !visibleMembers.length && (
                <p className="my-4 text-gray-600">{t('no_members_found')}</p>
            )}

            {selecting && (
                <div className="sticky bottom-0 mt-4 pt-3 pb-1 border-t border-gray-200 bg-white flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="font-bold">
                        {t('selected_count', { count: selected.length })}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {quickSelection(t('select_all'), selectable)}
                        {selectableAdmins.length > 0 &&
                            quickSelection(t('select_admins'), selectableAdmins)}
                        {quickSelection(t('select_none'), [])}
                    </div>
                    <div className="ml-auto flex gap-2">
                        <ButtonSecondary onClick={stopSelecting} label={t('common:cancel')} />
                        <ButtonPrimary
                            onClick={openChat}
                            disabled={!selected.length}
                            label={t('open_chat')}
                        />
                    </div>
                </div>
            )}
        </WhiteBox>
    );
}
