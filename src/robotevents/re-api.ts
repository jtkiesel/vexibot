import axios, { AxiosError } from 'axios';
import cheerio from 'cheerio';
import log from 'loglevel';
import { URL } from 'url';

import { sleep } from '..';
log.enableAll();

export class ReApiClient {
  private readonly baseUrl: URL;
  private headers: HttpHeaders;

  constructor(baseUrl: URL) {
    this.baseUrl = baseUrl;
  }

  public async getEvents(): Promise<Event[]> {
    const {
      data
    } = await this.get<WrappedData<Event[]>>('/events');
    return data;
  }

  public async getPrograms(): Promise<Program[]> {
    const {
      data
    } = await this.get<WrappedData<Program[]>>('/programs');
    return data;
  }

  public async getLatLngGroups(query?: Query): Promise<LatLngGrp[]> {
    return await this.post('/teams/latLngGrp', query);
  }

  public async getTeams(query?: Query): Promise<Team[]> {
    return await this.post('/teams/getTeamsForLatLng', query);
  }

  protected async get<T extends WrappedData<Event[] | Program[]>>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const config = {
      headers: await this.getHeaders()
    };
    while (true) {
      try {
        const {
          data
        } = await axios.get<T>(url, config);
        return data;
      } catch (error) {
        await ReApiClient.axiosError(error, `GET '${url}'`);
      }
    }
  }

  protected async post<Q extends Query, R extends LatLngGrp[] | Team[]>(path: string, query?: Q): Promise<R> {
    const url = `${this.baseUrl}${path}`;
    const config = {
      headers: await this.getHeaders()
    };
    while (true) {
      try {
        const {
          data
        } = await axios.post<R>(url, query, config);
        return data;
      } catch (error) {
        await ReApiClient.axiosError(error, `POST '${url}' with data '${JSON.stringify(query)}'`);
      }
    }
  }

  private static async axiosError(error: AxiosError<Error>, requestName: string): Promise<void> {
    const {
      message,
      request,
      response
    } = error;
    if (response) {
      const {
        response: {
          data,
          headers,
          status
        }
      } = error as AxiosError<Error>;
      if (status === 429) {
        const seconds = headers['retry-after'] as number;
        log.info(`${requestName} rate limited by Robot Events, retrying after ${seconds} seconds`);
        await sleep(seconds * 1000);
        return;
      }
      throw new Error(`${requestName} failed with status code ${status}: ${data.message}`);
    } else if (request) {
      throw new Error(`${requestName} didn't receive a response: ${JSON.stringify(request)}`);
    }
    throw new Error(`Failed to setup ${requestName}: ${message}`);
  }

  private static parseCookie(setCookie: string): string {
    return setCookie.slice(0, setCookie.indexOf(';') + 1);
  }

  private async getHeaders(): Promise<HttpHeaders> {
    if (!this.headers) {
      const response = await axios.get(this.baseUrl.origin);
      const $ = cheerio.load(response.data);
      this.headers = {
        cookie: response.headers['set-cookie']
          .map(ReApiClient.parseCookie)
          .join(' '),
        origin: this.baseUrl.origin,
        'x-csrf-token': $('meta[name="csrf-token"]').attr('content')
      };
    }
    return this.headers;
  }
}

export interface Event extends Fetchable {
  id: number;
  lat: number;
  lng: number;
  date: string;
  sku: string;
  address: string;
  name: string;
  phone: string;
  email: string;
  program_name: string;
  program_id: number;
  program_slug: string;
  season_id: number;
  webcast_link: string;
  event_entity_id: number;
}

export interface LatLngGrp {
  position: {
    lat: number;
    lng: number;
  };
  city: string;
  count: number;
}

export interface Team extends Fetchable {
  team: string;
  city: string;
  name: string;
  team_name: string;
  robot_name: string;
  program_name: string;
  program_abbr: string;
  link: string;
}

export interface Program extends Fetchable {
  id: number;
  name: string;
  abbr: string;
  seasons: Season[];
}

export interface Season {
  id: number;
  name: string;
  start_year: string;
  end_year: string;
}

export interface Query {
  programs?: number[];
  when?: When;
  what?: What;
  season_id?: number;
  city?: string;
  lat?: number;
  lng?: number;
  country?: string;
  region?: string;
}

export enum When {
  PAST = 'past',
  FUTURE = 'future'
}

export enum What {
  EVENT = 'event',
  TEAM = 'team'
}

interface WrappedData<T> {
  data: T;
}

interface HttpHeaders {
  [key: string]: string;
}

interface Fetchable {
  fetchedAt: Date;
}
