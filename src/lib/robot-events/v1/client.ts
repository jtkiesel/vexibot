import type {AxiosInstance, AxiosResponse} from 'axios';

export abstract class Client {
  private readonly axiosInstance;

  public constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  protected async get<T>(path: string, params?: object): Promise<T> {
    const response = await this.axiosInstance.get<T, AxiosResponse<T>>(path, {
      params,
    });
    return response.data;
  }

  protected async post<T>(path: string, data?: object): Promise<T> {
    const response = await this.axiosInstance.post<T, AxiosResponse<T>>(path, {
      data,
    });
    return response.data;
  }
}
