'use client';

import { LoadingOverlay, useTranslation } from '@payloadcms/ui';
import { useEffect } from 'react';

export default function KeycloakLogoutView() {
    const { t } = useTranslation();

    useEffect(() => {
        window.location.replace('/api/keycloak/logout');
    }, []);

    return <LoadingOverlay animationDuration="0ms" loadingText={t('authentication:loggingOut')} />;
}
