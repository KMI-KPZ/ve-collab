import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import ButtonPrimary from './common/buttons/ButtonPrimary';

const USER_CONSENT_COOKIE_KEY = 'cookie-consent';

export default function Disclaimer() {
    const { t } = useTranslation('common');

    const [cookies, setCookie] = useCookies([USER_CONSENT_COOKIE_KEY]);
    const [cookieConsent, setCookieConsent] = useState(false);

    useEffect(() => {
        const consentIsTrue = cookies[USER_CONSENT_COOKIE_KEY] === true;
        setCookieConsent(consentIsTrue);
    }, [cookies]);

    const onClick = () => {
        // determine tomorrows Date for cookie expires attribute
        const expiryTomorrow = new Date();
        expiryTomorrow.setDate(expiryTomorrow.getDate() + 1);

        if (!cookieConsent) {
            setCookie(USER_CONSENT_COOKIE_KEY, 'true', { expires: expiryTomorrow });
            setCookieConsent(true);
        }
    };

    if (cookieConsent) {
        return null;
    } else {
        return (
            <div className="fixed bottom-0 left-0 w-full z-40">
                <div className="flex flex-col items-start px-5 py-3 bg-gray-300 md:flex-row md:space-y-0 md:items-stretch md:space-x-2">
                    <div className="flex items-center grow">
                        <p className="text-sm font-medium text-black">{t('cookie_banner')}</p>
                    </div>
                    <div className="flex items-center">
                        <ButtonPrimary onClick={onClick}>{t('accept')}</ButtonPrimary>
                    </div>
                </div>
            </div>
        );
    }
}
