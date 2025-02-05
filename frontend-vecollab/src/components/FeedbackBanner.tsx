import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { MdMail, MdOutlineFeedback, MdOutlineShare } from 'react-icons/md';
import ButtonPrimary from './common/buttons/ButtonPrimary';
import { useState } from 'react';
import Dialog from './profile/Dialog';
import MailInvitationForm from './MailInvitationForm';
import ButtonSecondary from './common/buttons/ButtonSecondary';

export default function FeedbackBanner(): JSX.Element {
    const { t } = useTranslation('common');
    const [openMailInvitationDialog, setOpenMailInvitationDialog] = useState<boolean>(false);

    return (
        <>
            <div className="hidden sm:flex fixed z-40 -right-80 bottom-20 w-96 h-72 -mr-[6px] text-center rounded-lg bg-ve-collab-blue text-white border-2 border-slate-50 shadow-lg flex flex-row divide-x transition ease-in-out delay-150 hover:-translate-x-80 hover:cursor-pointer">
                <div className="divide-y divide-gray-400 w-full p-1">
                    <div className="flex h-2/5 divide-x-2 divide-gray-400 p-1">
                        <div className="w-12 flex justify-center items-center flex-none nowrap">
                            <div className="-rotate-90 text-nowrap">
                                {t('mail_invitation_form.share')}
                                <MdOutlineShare className="inline ml-2" size={20} />
                            </div>
                        </div>
                        <div className="w-full p-2">
                            <p>{t('mail_invitation_form.intro_short')}</p>
                            <ButtonPrimary
                                onClick={() => setOpenMailInvitationDialog(true)}
                                className="m-1"
                            >
                                {t('mail_invitation_form.open')}
                            </ButtonPrimary>
                        </div>
                    </div>
                    <div className="flex h-3/5 divide-x-2 divide-gray-400 p-1">
                        <div className="w-12 flex justify-center items-center flex-none nowrap">
                            <div className="-rotate-90 text-nowrap">
                                {t('feedback')}
                                <MdOutlineFeedback className="inline ml-2" size={20} />
                            </div>
                        </div>
                        <div className="w-full p-2">
                            <p>{t('leave_feedback')}</p>
                            {typeof process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL == 'string' && (
                                <ButtonPrimary
                                    link={process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL}
                                    className="!p-2 !m-2 !inline-block"
                                >
                                    {t('to_survey')}
                                </ButtonPrimary>
                            )}
                            <p>{t('or_contact_us')}</p>
                            <Link
                                className="m-1 underline decoration-dotted hover:decoration-solid"
                                href="mailto:schlecht@infai.org,elisa.mueller@uni-leipzig.de"
                                target="_blank"
                            >
                                {t('via_email')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <Dialog
                isOpen={openMailInvitationDialog}
                title={t('mail_invitation_form.title')}
                onClose={() => setOpenMailInvitationDialog(false)}
            >
                <div className="w-[20vw]">
                    <MailInvitationForm
                        handleFinish={() => {
                            setOpenMailInvitationDialog(false);
                        }}
                    />
                </div>
            </Dialog>
        </>
    );
}
