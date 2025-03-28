import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Dialog from './Dialog';
import Alert from '../common/dialogs/Alert';
import { useTranslation } from 'next-i18next';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import PlansSelector from './PlansSelector';

interface Props {
    userid: string;
    username: string;
    isOpen: boolean;
    callbackDone: () => void;
}

VEInvitationDialog.auth = true;
export default function VEInvitationDialog({ userid, username, isOpen, callbackDone }: Props) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [successPopupOpen, setSuccessPopupOpen] = useState(false);

    const handleCloseInvitationDialog = () => {
        callbackDone();
    };

    const [appendPlanCheckboxChecked, setAppendPlanCheckboxChecked] = useState(false);
    const [chosenPlanId, setChosenPlanId] = useState<string>();
    const [veInvitationMessage, setVeInvitationMessage] = useState('');

    const sendVeInvitation = () => {
        const payload = {
            message: veInvitationMessage,
            plan_id: chosenPlanId,
            username: userid,
        };

        fetchPOST('/ve_invitation/send', payload, session?.accessToken).then((response) => {
            setSuccessPopupOpen(true);
        });
    };

    return (
        <>
            <Dialog
                isOpen={isOpen}
                title={t('invite_to_ve', { name: username })}
                onClose={handleCloseInvitationDialog}
            >
                <div className="w-[30rem] h-[26rem] overflow-y-auto content-scrollbar relative">
                    <div>{t('ve_invitation_message')}</div>
                    <textarea
                        className={'w-full border border-gray-500 rounded-lg px-2 py-1 my-1'}
                        rows={5}
                        placeholder={t('ve_invitation_message_placeholder')}
                        value={veInvitationMessage}
                        onChange={(e) => setVeInvitationMessage(e.target.value)}
                    ></textarea>
                    <div className="flex mb-2 mt-4">
                        <input
                            type="checkbox"
                            id="appendPlanCheckboxChecked"
                            className="mr-2 cursor-pointer"
                            checked={appendPlanCheckboxChecked}
                            onChange={(e) =>
                                setAppendPlanCheckboxChecked(!appendPlanCheckboxChecked)
                            }
                        />
                        <label htmlFor="appendPlanCheckboxChecked" className="cursor-pointer">
                            {t('append_existing_plan')}
                        </label>
                    </div>
                    {appendPlanCheckboxChecked && (
                        <>
                            <PlansSelector
                                chosenPlanId={chosenPlanId}
                                setChosenPlanId={setChosenPlanId}
                            />
                            <p className="my-2 text-gray-400">{t('append_plan_disclaimer')}</p>
                        </>
                    )}

                    <div className="flex absolute bottom-0 w-full flex justify-between">
                        <ButtonSecondary onClick={handleCloseInvitationDialog}>
                            {t('common:cancel')}
                        </ButtonSecondary>
                        <ButtonPrimary
                            onClick={() => {
                                sendVeInvitation();
                                handleCloseInvitationDialog();
                            }}
                        >
                            {t('common:send')}
                        </ButtonPrimary>
                    </div>
                </div>
            </Dialog>

            {successPopupOpen && (
                <Alert
                    message={t('alert_ve_invitation_sent')}
                    autoclose={2000}
                    onClose={() => setSuccessPopupOpen(false)}
                />
            )}
        </>
    );
}
