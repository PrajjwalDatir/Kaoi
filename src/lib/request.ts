import axios, { AxiosRequestConfig } from 'axios'

const request = {
    json: async <T>(url: string): Promise<T> => (await axios.get<T>(url)).data,
    buffer: async (url: string): Promise<Buffer> => (await axios.get<Buffer>(url, { responseType: 'arraybuffer' })).data
}

export const post = async <T>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    data: any,
    config?: AxiosRequestConfig
): Promise<T extends null ? { [key: string]: string | number | boolean } : T> => await axios.post(url, data, config)

export default request
