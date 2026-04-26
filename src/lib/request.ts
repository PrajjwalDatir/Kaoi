import axios, { AxiosRequestConfig } from 'axios'

const request = {
    json: async <T>(url: string): Promise<T> => (await axios.get<T>(url, { timeout: 15_000 })).data,
    buffer: async (url: string): Promise<Buffer> =>
        (await axios.get<Buffer>(url, { responseType: 'arraybuffer', timeout: 15_000 })).data
}

/** Try a list of endpoints in order, returning the first successful result. */
export const firstOk = async <T>(
    fns: Array<() => Promise<T>>
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> => {
    let lastError: unknown
    for (const fn of fns) {
        try {
            return { ok: true, value: await fn() }
        } catch (err) {
            lastError = err
        }
    }
    return { ok: false, error: lastError }
}

export const post = async <T>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    data: any,
    config?: AxiosRequestConfig
): Promise<T extends null ? { [key: string]: string | number | boolean } : T> =>
    await axios.post(url, data, { timeout: 15_000, ...(config || {}) })

export default request
