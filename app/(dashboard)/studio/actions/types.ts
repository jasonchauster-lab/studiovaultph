export interface ServerActionResponse<T = any> {
    success: boolean
    error?: string
    data?: T
}
