import type {AxiosInstance, AxiosResponse} from 'axios';
import type {Paginated} from '.';
import {Cursor} from './cursor';

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

  protected getAll<T>(path: string, params?: object): Cursor<T> {
    return new RobotEventsCursor(page =>
      this.get(path, page ? {...params, page} : params)
    );
  }
}

export class RobotEventsCursor<T> extends Cursor<T> {
  private readonly data: T[] = [];
  private readonly findPage: (page: number) => Promise<Paginated<T>>;
  private currentPage = 0;
  private isLastPage = false;

  constructor(findPage: (page: number) => Promise<Paginated<T>>) {
    super();
    this.findPage = findPage;
  }

  public async hasNext(): Promise<boolean> {
    if (this.currentPage === 0) {
      this.data.push(...(await this.nextPage()));
    }
    return this.data.length > 0 || !this.isLastPage;
  }

  public async next(): Promise<T> {
    if (!this.data.length && !this.isLastPage) {
      this.data.push(...(await this.nextPage()));
    }
    const next = this.data.shift();
    if (!next) {
      throw new Error('No elements remaining in cursor');
    }
    return next;
  }

  public async nextPage(): Promise<T[]> {
    if (this.data.length) {
      return this.data.splice(0);
    }
    if (this.isLastPage) {
      throw new Error('No elements remaining in cursor');
    }
    const {
      data,
      meta: {current_page, last_page},
    } = await this.findPage(++this.currentPage);

    this.isLastPage = current_page === last_page;

    return data;
  }
}
