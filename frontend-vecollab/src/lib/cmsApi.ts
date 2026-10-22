import { Method } from '@/interfaces/method/methodInterfaces';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3030';

interface PayloadListResponse<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export async function fetchCMS<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const searchParams = new URLSearchParams(params);
    const url = `${CMS_URL}/api/${endpoint}?${searchParams.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`CMS fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function getAllMethods(): Promise<Method[]> {
    const data = await fetchCMS<PayloadListResponse<Method>>('methods', {
        limit: '0',
        sort: 'title',
    });
    return data.docs;
}

/** only id and title of all methods, e.g. to suggest some of them without loading their content */
export async function getMethodTitles(): Promise<Pick<Method, 'id' | 'title'>[]> {
    const data = await fetchCMS<PayloadListResponse<Pick<Method, 'id' | 'title'>>>('methods', {
        limit: '0',
        'select[title]': 'true',
    });
    return data.docs;
}

export async function getMethodById(id: string): Promise<Method | null> {
    try {
        return await fetchCMS<Method>(`methods/${id}`);
    } catch {
        return null;
    }
}
