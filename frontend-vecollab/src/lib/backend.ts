import { BACKEND_URL } from "@/constants"


export async function fetchGET(relativeUrl: string, accessToken?: string){
    const headers: {Authorization?: string} = {}

    if (accessToken) {
        headers["Authorization"] = "Bearer " + accessToken
    }

    try {
        let backendResponse = await fetch(BACKEND_URL + relativeUrl, {
            headers: headers
        })
        return await backendResponse.json()
    }
    catch (e) {
        console.log("network error, probably backend down")
        return {}
    }
}

export async function fetchPOST(relativeUrl: string, payload?: Record<string, any>, accessToken?: string){
    const headers: {Authorization?: string} = {}

    if (accessToken) {
        headers["Authorization"] = "Bearer " + accessToken
    }

    try {
        let backendResponse = await fetch(BACKEND_URL + relativeUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        })
        return await backendResponse.json()
    }
    catch (e) {
        console.log("network error, probably backend down")
        return {}
    }
}

export async function fetchDELETE(relativeUrl: string, payload?: Record<string, any>, accessToken?: string){
    const headers: {Authorization?: string} = {}

    if (accessToken) {
        headers["Authorization"] = "Bearer " + accessToken
    }

    try {
        let backendResponse = await fetch(BACKEND_URL + relativeUrl, {
            method: "DELETE",
            headers: headers,
            body: JSON.stringify(payload)
        })
        return await backendResponse.json()
    }
    catch (e) {
        console.log("network error, probably backend down")
        return {}
    }
}