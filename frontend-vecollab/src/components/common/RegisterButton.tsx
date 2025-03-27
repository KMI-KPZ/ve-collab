import { signIn } from 'next-auth/react';
import Image from 'next/image';

import vecollabNotebook from '@/images/frontpage/VeCollabNotebook.png';
import { useTranslation } from 'next-i18next';

export default function RegisterButton() {
    const { t } = useTranslation('common');

    return (
        <div
            onClick={() => {
                signIn('keycloak');
            }}
            className="w-fit mx-auto my-8 px-6 flex items-center justify-center border shadow rounded-full cursor-pointer transition ease-in-out hover:scale-105 text-ve-collab-blue  hover:text-ve-collab-orange"
        >
            <Image
                src={vecollabNotebook}
                alt={t('about-ve-designer.image_alt')}
                className="w-[150px] my-6 ml-6"
            />
            <div className="pl-6 text-center font-bold text-xl">
                {/* <div className="text-2xl mb-6">
                                    <span className="text-ve-collab-orange">VE</span>{' '}
                                    <span className="text-ve-collab-blue">Collab</span>
                                </div> */}
                {t('join_now')}
            </div>
        </div>
    );
}
