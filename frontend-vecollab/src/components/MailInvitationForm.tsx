import { Trans, useTranslation } from 'next-i18next';
import ButtonPrimary from './common/buttons/ButtonPrimary';
import { useState } from 'react';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import ButtonSecondary from './common/buttons/ButtonSecondary';

import { z } from 'zod';

// const FormSchema = z.string().email();
const FormSchema = z.object({
    name: z.string().min(3),
    mail: z.string().email(),
});

export default function MailInvitationForm({
    handleFinish,
    planId,
}: {
    handleFinish?: () => void;
    planId?: string;
}): JSX.Element {
    const { t } = useTranslation(['common', 'community']);
    const { data: session, status } = useSession();

    // const [success, setSuccess] = useState<AlertState>({ open: false });
    const [sending, setSending] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [sendingError, setSendingError] = useState<boolean>(false);

    const [name, setName] = useState<string>('');
    const [isValidName, setIsValidName] = useState<boolean>(true);
    const [mail, setMail] = useState<string>('');
    const [isValidMail, setIsValidMail] = useState<boolean>(true);
    const [message, setMessage] = useState<string>('');

    const validate = (name: string, mail: string) => {
        const valid = FormSchema.safeParse({ name, mail });

        let validName = true;
        let validMail = true;

        if (valid.error !== undefined) {
            validName = !Object.hasOwn(valid.error?.formErrors.fieldErrors, 'name');
            validMail = !Object.hasOwn(valid.error?.formErrors.fieldErrors, 'mail');
        }
        setIsValidName(validName);
        setIsValidMail(validMail);

        return validMail || validName;
    };

    const handleSend = () => {
        if (!validate(name, mail)) return;

        setSending(true);
        fetchPOST(
            '/mail_invitation/send',
            {
                recipient_mail: mail,
                recipient_name: name,
                message: message,
                plan_id: planId,
            },
            session?.accessToken
        )
            .catch((e) => {
                setSendingError(true);
            })
            .then((res) => {
                if (res.success) {
                    setSuccess(true);
                } else {
                    setSendingError(true);
                }
            })
            .finally(() => {});
    };

    if (sendingError) {
        return (
            <div>
                <p className="mb-4">{t('mail_invitation_form.send_error')}</p>
                <ButtonSecondary onClick={handleFinish}>{t('close')}</ButtonSecondary>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            {success ? (
                <>
                    <p className="mb-4">{t('mail_invitation_form.send_ok')}</p>
                    <ButtonSecondary onClick={handleFinish}>{t('close')}</ButtonSecondary>
                </>
            ) : (
                <>
                    <p className="mb-4">{t('mail_invitation_form.intro')}</p>
                    {planId && <p className="mb-4">{t('mail_invitation_form.intro_attention')}</p>}
                    <div>
                        <div className="mb-4">
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-md px-2 py-1"
                                placeholder={t('mail_invitation_form.name_placeholder')}
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    validate(e.target.value, mail);
                                }}
                            />
                            {name.length > 0 && !isValidName && (
                                <p className="m-2 text-red-500">
                                    {t('mail_invitation_form.no_valid_name')}
                                </p>
                            )}
                        </div>

                        <div className="mb-4">
                            <input
                                type="email"
                                className="w-full border border-gray-500 rounded-md px-2 py-1 invalid:border-red-500!"
                                placeholder={t('mail_invitation_form.mail_placeholder')}
                                value={mail}
                                onChange={(e) => {
                                    setMail(e.target.value);
                                    validate(name, e.target.value);
                                }}
                            />
                            {mail.length > 0 && !isValidMail && (
                                <p className="m-2 text-red-500">
                                    {t('mail_invitation_form.no_valid_mail')}
                                </p>
                            )}
                        </div>

                        <div className="mb-4">
                            <textarea
                                rows={5}
                                className="w-full border border-gray-500 rounded-md px-2 py-1 my-1"
                                placeholder={t('mail_invitation_form.message_placeholder')}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                    </div>
                    <ButtonPrimary
                        disabled={
                            sending || name == '' || mail == '' || !isValidName || !isValidMail
                        }
                        onClick={handleSend}
                        className="ml-auto block"
                    >
                        {t('send')} {sending && <>...</>}
                    </ButtonPrimary>
                </>
            )}
        </div>
    );
}
