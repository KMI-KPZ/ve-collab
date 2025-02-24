import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { MdMail, MdOutlineFeedback, MdOutlineShare } from 'react-icons/md';
import ButtonPrimary from './common/buttons/ButtonPrimary';
import { useState } from 'react';
import Dialog from './profile/Dialog';
import MailInvitationForm from './MailInvitationForm';
import ButtonSecondary from './common/buttons/ButtonSecondary';
import { useSession } from 'next-auth/react';

export default function FeedbackBanner(): JSX.Element {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const [openMailInvitationDialog, setOpenMailInvitationDialog] = useState<boolean>(false);

    if (!session) return <></>;

    return (
        <>
            <div
                className={`
                    fixed z-40 rotate-90 sm:rotate-0
                    right-[80px] sm:-right-80 -bottom-[280px] sm:bottom-20
                    w-72 h-96 sm:w-96 sm:h-72
                    flex flex-row
                    -mr-[6px] text-center rounded-lg bg-ve-collab-blue text-white border-2 border-slate-50 shadow-lg divide-x
                    hover:-translate-y-[210px] sm:hover:-translate-y-0 hover:-translate-x-0 sm:hover:-translate-x-80 hover:cursor-pointer
                    transition ease-in-out delay-150
              `}
            >
                <div className="flex sm:flex-none flex-col divide-y divide-gray-400 w-full p-1">
                    <div className="flex h-1/2 sm:h-2/5 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-gray-400 p-1">
                        <div className="w-12 flex justify-center items-center flex-none nowrap">
                            <div className="-rotate-90 text-nowrap">
                                {t('mail_invitation_form.share')}
                                <MdOutlineShare className="inline ml-2" size={20} />
                            </div>
                        </div>
                        <div className="w-2/3 sm:w-full p-2 -rotate-90 sm:rotate-0">
                            <p>{t('mail_invitation_form.intro_short')}</p>
                            <ButtonPrimary
                                onClick={() => setOpenMailInvitationDialog(true)}
                                className="m-1"
                            >
                                {t('mail_invitation_form.open')}
                            </ButtonPrimary>
                        </div>
                    </div>
                    <div className="flex h-1/2 sm:h-3/5 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-gray-400 p-1 sm:w-auto">
                        <div className="w-12 flex justify-center items-center flex-none nowrap">
                            <div className="-rotate-90 text-nowrap">
                                {t('feedback')}
                                <MdOutlineFeedback className="inline ml-2" size={20} />
                            </div>
                        </div>
                        <div className="w-2/3 sm:w-full p-2 -rotate-90 sm:rotate-0">
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
                <MailInvitationForm
                    handleFinish={() => {
                        setOpenMailInvitationDialog(false);
                    }}
                />
            </Dialog>
        </>
    );
}
