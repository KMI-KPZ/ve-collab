import { MouseEvent, useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';

const USER_CONSENT_COOKIE_KEY = 'cookie-consent';

export default function Disclaimer() {
    const [cookies, setCookie] = useCookies([USER_CONSENT_COOKIE_KEY]);

    const [cookieConsent, setCookieConsent] = useState(false);

    useEffect(() => {
        const consentIsTrue = cookies[USER_CONSENT_COOKIE_KEY] === true;
        setCookieConsent(consentIsTrue);
    }, [cookies]);

    const onClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

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
                    <div className="flex items-center flex-grow">
                        <p className="text-sm font-medium">
                            Diese Plattform ist ein Prototyp und wird fortlaufend weiterentwickelt,
                            Datenverlust ist daher aktuell trotz größter Bemühungen nicht
                            ausgeschlossen. Wir verwenden nur notwendige Cookies, um die
                            Funktionalität der Seite zu gewährleisten.
                        </p>
                    </div>
                    <div className="flex items-center">
                        <button
                            className="py-2 pr-6 pl-5 bg-ve-collab-orange rounded-lg text-white"
                            onClick={onClick}
                        >
                            Akzeptieren
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
