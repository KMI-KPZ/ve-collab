import React from 'react';
import { useRouter } from 'next/router';

interface IValidationReturnProps {
    validateAndRoute(
        routePath: string,
        plannerId: string | string[] | undefined,
        handleValidation: () => void,
        isValid: boolean
    ): void;
}

export const useValidation = (): IValidationReturnProps => {
    const router = useRouter();
    const validateAndRoute = (
        routePath: string,
        plannerId: string | string[] | undefined,
        handleValidation: () => void,
        isValid: boolean
    ): void => {
        console.log(isValid);
        handleValidation();
        if (isValid) {
            router.push({
                pathname: routePath,
                query: { plannerId: plannerId },
            });
        }
    };
    return { validateAndRoute };
};
