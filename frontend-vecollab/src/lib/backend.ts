import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { signIn } from 'next-auth/react';
import useSWR, { KeyedMutator} from 'swr';

if (!process.env.NEXT_PUBLIC_BACKEND_BASE_URL) {
    throw new Error(`
      Please provide a valid NEXT_PUBLIC_BACKEND_BASE_URL in .env.local .
    `);
}
let BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

export const GETfetcher = (relativeUrl: string, accessToken?: string) =>
    fetch(BACKEND_BASE_URL + relativeUrl, {
        headers: { Authorization: 'Bearer ' + accessToken },
    }).then((res) => res.json());

export function useGetAvailablePlans(accessToken: string): {
    plans: PlanPreview[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/planner/get_available', accessToken],
        ([url, token]) => GETfetcher(url, token)
    );

    return {
        plans: isLoading || error ? [] : data.plans,
        isLoading,
        error,
        mutate, 
    };
}

export async function fetchGET(relativeUrl: string, accessToken?: string) {
    const headers: { Authorization?: string } = {};

    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            headers: headers,
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function fetchPOST(
    relativeUrl: string,
    payload?: Record<string, any>,
    accessToken?: string
) {
    const headers: { Authorization?: string } = {};

    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return await backendResponse.json();
    } catch (e) {
        console.log(e);
        return {};
    }
}

export async function fetchDELETE(
    relativeUrl: string,
    payload?: Record<string, any>,
    accessToken?: string
) {
    const headers: { Authorization?: string } = {};

    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify(payload),
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function fetchImage(relativeUrl: string, accessToken?: string): Promise<Blob> {
    const headers: { Authorization?: string } = {};

    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            headers: headers,
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return backendResponse.blob();
    } catch (e) {
        console.log('network error, probably backend down');
        return new Blob();
    }
}
