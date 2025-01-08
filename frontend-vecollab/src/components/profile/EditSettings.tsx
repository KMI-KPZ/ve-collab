import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useState } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import { NotificationSettings } from '@/interfaces/profile/profileInterfaces';
import { useTranslation } from 'next-i18next';

interface Props {
    excludedFromMatching: boolean;
    setExcludedFromMatching: Dispatch<SetStateAction<boolean>>;
    notificationSettings: NotificationSettings;
    setNotificationSettings: Dispatch<SetStateAction<NotificationSettings>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}
export default function EditVisibilitySettings({
    excludedFromMatching,
    setExcludedFromMatching,
    notificationSettings,
    setNotificationSettings,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const { t } = useTranslation(['community', 'common']);

    const updateNotificationSettings = (
        setting: keyof NotificationSettings,
        e: ChangeEvent<HTMLInputElement>
    ) => {
        setNotificationSettings({
            ...notificationSettings,
            [setting]: e.target.value,
        });
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('common:notifications.title')} />
                <div className="my-4 border border-slate-300 rounded-xl overflow-hidden">
                    <table className="table-auto w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-300 bg-slate-100">
                                <th></th>
                                <th className="text-center p-4 font-medium">
                                    {t('email_and_push')}
                                </th>
                                <th className="text-center p-4 font-medium">{t('push_only')}</th>
                                <th className="text-center p-4 font-medium">{t('common:none')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-300">
                                <td className="p-4">{t('new_messages')}</td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="newMessages"
                                        value="email"
                                        checked={notificationSettings.messages === 'email'}
                                        onChange={(e) => updateNotificationSettings('messages', e)}
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="newMessages"
                                        value="push"
                                        checked={notificationSettings.messages === 'push'}
                                        onChange={(e) => updateNotificationSettings('messages', e)}
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input type="radio" name="newMessages" value="none" disabled />
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4">{t('ve_invitation')}</td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="veInvite"
                                        value="email"
                                        checked={notificationSettings.ve_invite === 'email'}
                                        onChange={(e) => updateNotificationSettings('ve_invite', e)}
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="veInvite"
                                        value="push"
                                        checked={notificationSettings.ve_invite === 'push'}
                                        onChange={(e) => updateNotificationSettings('ve_invite', e)}
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="veInvite"
                                        value="none"
                                        checked={notificationSettings.ve_invite === 'none'}
                                        onChange={(e) => updateNotificationSettings('ve_invite', e)}
                                    />
                                </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4">{t('group_invitation')}</td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="groupInvite"
                                        value="email"
                                        checked={notificationSettings.group_invite === 'email'}
                                        onChange={(e) =>
                                            updateNotificationSettings('group_invite', e)
                                        }
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="groupInvite"
                                        value="push"
                                        checked={notificationSettings.group_invite === 'push'}
                                        onChange={(e) =>
                                            updateNotificationSettings('group_invite', e)
                                        }
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="groupInvite"
                                        value="none"
                                        checked={notificationSettings.group_invite === 'none'}
                                        onChange={(e) =>
                                            updateNotificationSettings('group_invite', e)
                                        }
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="p-4">{t('system_notifications')}</td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="systemNotifications"
                                        value="email"
                                        checked={notificationSettings.system === 'email'}
                                        onChange={(e) => updateNotificationSettings('system', e)}
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="systemNotifications"
                                        value="push"
                                        checked={notificationSettings.system === 'push'}
                                        onChange={(e) => updateNotificationSettings('system', e)}
                                    />
                                </td>
                                <td className="text-center p-4">
                                    <input
                                        type="radio"
                                        name="systemNotifications"
                                        value="none"
                                        disabled
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </EditProfileVerticalSpacer>
            {/*
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Info'} />
                <EditVisibilityRadioButtons
                    name={'veInfo'}
                    visibility={visibilities.veInfo}
                    onChange={updateVeInfo}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Lehre'} />
                <EditVisibilityRadioButtons
                    name={'teaching'}
                    visibility={visibilities.teaching}
                    onChange={updateTeaching}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Forschung'} />
                <EditVisibilityRadioButtons
                    name={'research'}
                    visibility={visibilities.research}
                    onChange={updateResearch}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Ausbildung'} />
                <EditVisibilityRadioButtons
                    name={'education'}
                    visibility={visibilities.education}
                    onChange={updateEducation}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Berufserfahrung'} />
                <EditVisibilityRadioButtons
                    name={'workExperience'}
                    visibility={visibilities.workExperience}
                    onChange={updateWorkExperience}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'VE-Schaufenster'} />
                <EditVisibilityRadioButtons
                    name={'veWindow'}
                    visibility={visibilities.veWindow}
                    onChange={updateVeWindow}
                />
            </EditProfileVerticalSpacer>
            */}
            <EditProfileVerticalSpacer>
                <div className="p-2 rounded-xl border border-red-600">
                    <EditProfileHeadline name={t('matching_exclusion')} />
                    <div>
                        <u>{t('attention')}:</u> {t('matching_exclusion_question')}
                    </div>
                    <select
                        value={excludedFromMatching === true ? 'true' : 'false'}
                        onChange={(e) => {
                            e.target.value === 'true'
                                ? setExcludedFromMatching(true)
                                : setExcludedFromMatching(false);
                        }}
                        className={
                            'border border-gray-500 rounded-lg p-2 mt-2 bg-white ' +
                            (excludedFromMatching === true ? 'text-red-500' : 'text-green-500')
                        }
                    >
                        <option value="false" className="text-green-500">
                            {t('attend_matching')}
                        </option>
                        <option value="true" className="text-red-500">
                            {t('exclude_matching')}
                        </option>
                    </select>
                </div>
            </EditProfileVerticalSpacer>
        </form>
    );
}
