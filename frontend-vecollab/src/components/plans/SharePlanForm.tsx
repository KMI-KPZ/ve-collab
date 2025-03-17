import { BackendSearchResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useState } from 'react';
import { AlertState } from '../common/dialogs/Alert';
import { useTranslation } from 'next-i18next';
import AsyncSelect from 'react-select/async';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import ButtonPrimary from '../common/buttons/ButtonPrimary';

interface Props {
    closeDialogCallback: () => void;
    plan: PlanPreview;
    setAlert: Dispatch<SetStateAction<AlertState>>;
}

export default function SharePlanForm({ closeDialogCallback, plan, setAlert }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    const [shareUsername, setShareUsername] = useState('');
    const [shareAccessRight, setShareAccessRight] = useState('write');
    const [searchResultProfileSnippets, setSearchResultProfileSnippets] = useState<
        BackendUserSnippet[]
    >([]);

    const sharePlan = async () => {
        if (!shareUsername) return;

        const payload = {
            plan_id: plan._id,
            username: shareUsername,
            read: shareAccessRight === 'read' || shareAccessRight === 'write',
            write: shareAccessRight === 'write',
        };

        await fetchPOST('/planner/grant_access', payload, session?.accessToken).then((data) => {
            setAlert({
                message: t('plans_share_dialog_alert_set'),
                autoclose: 2000,
                onClose: () => setAlert({ open: false }),
            });
        });
    };

    const loadOptions = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    callback(
                        data.users
                            .filter(
                                (user) =>
                                    !plan.read_access.includes(user.username) &&
                                    !plan.write_access.includes(user.username)
                            )
                            .filter((user) => user.username !== session!.user.preferred_username)
                            .map((user) => ({
                                label:
                                    user.first_name + ' ' + user.last_name + ' - ' + user.username,
                                value: user.username,
                            }))
                    );
                    setSearchResultProfileSnippets(data.users);
                }
            );
        }
    };

    return (
        <>
            <p className="my-2">{t('plans_share_dialog_text')}</p>
            <AsyncSelect
                className="grow max-w-full"
                loadOptions={loadOptions}
                onChange={(e) => setShareUsername(e!.value)}
                value={
                    shareUsername
                        ? {
                              label: searchResultProfileSnippets.find(
                                  (user) => user.username === shareUsername
                              )
                                  ? `${
                                        searchResultProfileSnippets.find(
                                            (user) => user.username === shareUsername
                                        )?.first_name
                                    } ${
                                        searchResultProfileSnippets.find(
                                            (user) => user.username === shareUsername
                                        )?.last_name
                                    } - ${shareUsername}`
                                  : `${shareUsername}`,
                              value: shareUsername,
                          }
                        : null
                }
                placeholder={t('plans_share_dialog_select_placeholder')}
                getOptionLabel={(option) => option.label}
                loadingMessage={() => t('loading')}
                noOptionsMessage={() => t('nothing_found')}
                openMenuOnFocus={false}
                openMenuOnClick={false}
                components={{
                    DropdownIndicator: null,
                }}
            />
            <div className="flex justify-between my-8 mx-6">
                <div>
                    <label className="mx-2">
                        <input
                            className="mx-2"
                            type="radio"
                            name="access"
                            id="readInput"
                            value="read"
                            defaultChecked={shareAccessRight === 'read'}
                            onChange={(e) => setShareAccessRight(e.target.value)}
                        />
                        {t('plans_share_dialog_radio_btn_read')}
                    </label>
                </div>
                <div>
                    <label className="mx-2">
                        <input
                            className="mx-2"
                            type="radio"
                            name="access"
                            id="writeInput"
                            value={'write'}
                            defaultChecked={shareAccessRight === 'write'}
                            onChange={(e) => setShareAccessRight(e.target.value)}
                        />
                        {t('plans_share_dialog_radio_btn_read_and_write')}
                    </label>
                </div>
            </div>
            <div className="flex absolute bottom-0 w-full flex justify-between">
                <ButtonSecondary onClick={closeDialogCallback}>
                    {t('plans_share_dialog_btn_cancel')}
                </ButtonSecondary>
                <ButtonPrimary
                    onClick={() => {
                        sharePlan();
                        closeDialogCallback();
                    }}
                >
                    {t('plans_share_dialog_btn_confirm')}
                </ButtonPrimary>
            </div>
        </>
    );
}
