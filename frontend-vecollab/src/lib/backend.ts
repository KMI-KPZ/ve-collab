import {
    BackendChatMessage,
    BackendChatroomSnippet,
    BackendUserSnippet,
} from '@/interfaces/api/apiInterfaces';
import { Notification } from '@/interfaces/socketio';
import { IPlan, PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { signIn, useSession } from 'next-auth/react';
import useSWR, { KeyedMutator } from 'swr';
import { VEPlanSnippet } from '@/interfaces/profile/profileInterfaces';
import { IMaterialNode, INode } from '@/interfaces/material/materialInterfaces';

if (!process.env.NEXT_PUBLIC_BACKEND_BASE_URL) {
    throw new Error(`
      Please provide a valid NEXT_PUBLIC_BACKEND_BASE_URL in .env.local .
    `);
}
let BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

// SWR fetcher for get requests
const GETfetcher = (relativeUrl: string, accessToken?: string) =>
    fetch(BACKEND_BASE_URL + relativeUrl, {
        headers: { Authorization: 'Bearer ' + accessToken },
    }).then((res) => {
        if (res.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return res.json();
    });

export function useGetAvailablePlans(accessToken: string): {
    data: PlanPreview[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/planner/get_available', accessToken],
        ([url, token]) => GETfetcher(url, token)
    );

    return {
        data: isLoading || error ? [] : data.plans,
        isLoading,
        error,
        mutate,
    };
}

export function useGetPlanById(planId: string): {
    data: IPlan;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data: session } = useSession();
    const { data, error, isLoading, mutate } = useSWR(
        [`/planner/get?_id=${planId}`, session?.accessToken],
        ([url, token]) => GETfetcher(url, token)
    );

    return {
        data: isLoading || error ? {} : data.plan,
        isLoading,
        error,
        mutate,
    };
}

export function useGetPublicPlansOfCurrentUser(
    accessToken: string,
    username: string
): {
    data: VEPlanSnippet[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        [`/planner/get_public_of_user?username=${username}`, accessToken],
        ([url, token]) => GETfetcher(url, token)
    );

    return {
        data:
            isLoading || error
                ? []
                : data.plans.map((plan: any) => ({
                      _id: plan._id,
                      name: plan.name,
                  })),
        isLoading,
        error,
        mutate,
    };
}

export function useGetMatching(
    shouldFetch: boolean,
    accessToken: string
): {
    data: BackendUserSnippet[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch ? ['/matching', accessToken] : null,
        ([url, token]) => GETfetcher(url, token)
    );

    return {
        data: !shouldFetch
            ? []
            : isLoading || error
            ? []
            : data.matching_hits.sort((a: any, b: any) => b.score - a.score),
        isLoading,
        error,
        mutate,
    };
}

export function useGetExcludedFromMatching(accessToken?: string): {
    data: boolean;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        accessToken ? ['/matching_exclusion_info', accessToken] : null,
        ([url, token]) => GETfetcher(url, token)
    );
    return {
        data: !accessToken ? false : isLoading || error ? [] : data.excluded_from_matching,
        isLoading,
        error,
        mutate,
    };
}

export function useGetNotifications(accessToken: string): {
    data: Notification[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/notifications', accessToken],
        ([url, token]) => GETfetcher(url, token)
    );
    return {
        data:
            isLoading || error
                ? []
                : data.notifications.sort((a: Notification, b: Notification) => {
                      return a.creation_timestamp < b.creation_timestamp ? 1 : -1;
                  }),
        isLoading,
        error,
        mutate,
    };
}

export function useGetChatrooms(accessToken: string): {
    data: BackendChatroomSnippet[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/chatroom/get_mine', accessToken],
        ([url, token]) => GETfetcher(url, token)
    );
    return {
        data: isLoading || error ? [] : data.rooms,
        isLoading,
        error,
        mutate,
    };
}

export function useGetChatroomHistory(
    accessToken: string,
    chatroomId: string
): {
    data: BackendChatMessage[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        [`/chatroom/get_messages?room_id=${chatroomId}`, accessToken],
        ([url, token]) => GETfetcher(url, token)
    );
    return {
        data: isLoading || error ? [] : data.messages,
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

export async function fetchTaxonomy(): Promise<INode[]>{
    const data = await GETfetcher('/material_taxonomy');
    return data.taxonomy;
}

export async function getTopLevelNodes(){
    const taxonomy = await fetchTaxonomy();
    return taxonomy.filter((node: any) => node.parent === 0);
}

export async function getChildrenOfNodeByText(nodeText: string): Promise<INode[]>{
    const taxonomy = await fetchTaxonomy();
    const nodeId = taxonomy.find((node: any) => node.text === nodeText)?.id;
    return taxonomy.filter((node: any) => node.parent === nodeId);
}

export async function getLeafNodeByParentText(parentText: string): Promise<IMaterialNode>{
    const taxonomy = await fetchTaxonomy();
    const parentId = taxonomy.find((node: any) => node.text === parentText)?.id;
    return taxonomy.find((node: any) => node.parent === parentId)! as IMaterialNode;
}
