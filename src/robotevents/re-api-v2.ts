import axios, { AxiosError } from 'axios';
import log from 'loglevel';
import { URL } from 'url';

import { sleep } from '..';
import { Cursor } from '../persistence/persistence';
log.enableAll();

export class ReApiV2Client {
  private readonly baseUrl: URL;
  private readonly token: string;

  constructor(baseUrl: URL, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  public static parseReDate(date: string): Date {
    return new Date(date?.replace(/Z$/, ''));
  }

  /*
   * Event
   */

  public getEvents(query?: EventsQuery): ReApiV2Cursor<Event> {
    return new ReApiV2Cursor(this, '/events', query);
  }

  public async getEvent(id: number): Promise<Event> {
    return await this.get(`/events/${id}`);
  }

  public getEventTeams(id: number, query?: EventTeamsQuery): ReApiV2Cursor<Team> {
    return new ReApiV2Cursor(this, `/events/${id}/teams`, query);
  }

  public getEventSkills(id: number, query?: EventSkillsQuery): ReApiV2Cursor<Skill> {
    return new ReApiV2Cursor(this, `/events/${id}/skills`, query);
  }

  public getEventAwards(id: number, query?: EventAwardsQuery): ReApiV2Cursor<Award> {
    return new ReApiV2Cursor(this, `/events/${id}/awards`, query);
  }

  public getEventMatches(id: number, div: number, query?: EventMatchesQuery): ReApiV2Cursor<Match> {
    return new ReApiV2Cursor(this, `/events/${id}/divisions/${div}/matches`, query);
  }

  public getEventFinalistRankings(id: number, div: number, query?: EventRankingsQuery): ReApiV2Cursor<Ranking> {
    return new ReApiV2Cursor(this, `/events/${id}/divisions/${div}/finalistRankings`, query);
  }

  public getEventRankings(id: number, div: number, query?: EventRankingsQuery): ReApiV2Cursor<Ranking> {
    return new ReApiV2Cursor(this, `/events/${id}/divisions/${div}/rankings`, query);
  }

  /*
   * Team
   */

  public getTeams(query?: TeamsQuery): ReApiV2Cursor<Team> {
    return new ReApiV2Cursor(this, '/teams', query);
  }

  public async getTeam(id: number): Promise<Team> {
    return await this.get(`/teams/${id}`);
  }

  public getTeamEvents(id: number, query?: TeamEventsQuery): ReApiV2Cursor<Event> {
    return new ReApiV2Cursor(this, `/teams/${id}/events`, query);
  }

  public getTeamMatches(id: number, query?: TeamMatchesQuery): ReApiV2Cursor<Match> {
    return new ReApiV2Cursor(this, `/teams/${id}/matches`, query);
  }

  public getTeamRankings(id: number, query?: TeamRankingsQuery): ReApiV2Cursor<Ranking> {
    return new ReApiV2Cursor(this, `/teams/${id}/rankings`, query);
  }

  public getTeamSkills(id: number, query?: TeamSkillsQuery): ReApiV2Cursor<Skill> {
    return new ReApiV2Cursor(this, `/teams/${id}/skills`, query);
  }

  public getTeamAwards(id: number, query?: TeamAwardsQuery): ReApiV2Cursor<Award> {
    return new ReApiV2Cursor(this, `/teams/${id}/awards`, query);
  }

  /*
   * Program
   */

  public getPrograms(query?: ProgramsQuery): ReApiV2Cursor<Program> {
    return new ReApiV2Cursor(this, '/programs', query);
  }

  public async getProgram(id: number): Promise<Program> {
    return await this.get(`/programs/${id}`);
  }

  /*
   * Season
   */

  public getSeasons(query?: SeasonsQuery): ReApiV2Cursor<Season> {
    return new ReApiV2Cursor(this, '/seasons', query);
  }

  public async getSeason(id: number): Promise<Season> {
    return await this.get(`/seasons/${id}`);
  }

  public getSeasonEvents(id: number, query?: SeasonEventsQuery): ReApiV2Cursor<Event> {
    return new ReApiV2Cursor(this, `/seasons/${id}/events`, query);
  }

  public async get<R extends Value | Paginated<Value>>(path: string, query?: Query): Promise<R> {
    const queryString = Object.entries(query || {})
      .flatMap(([key, value]) => {
        const values = Array.isArray(value) ? value : [value];
        return values.map(v => `${key}=${v}`);
      }).join('&');
    const url = `${this.baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    const config = {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    };
    while (true) {
      try {
        const {
          data
        } = await axios.get<R>(url, config);
        return data;
      } catch (error) {
        await ReApiV2Client.axiosError(error, `GET '${url}'`);
      }
    }
  }

  private static async axiosError(error: AxiosError<ReError>, requestName: string): Promise<void> {
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
      } = error as AxiosError<ReError>;
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
}

interface Fetchable {
  fetchedAt: Date;
}

export interface Event extends Fetchable {
  id: number;
  sku: string;
  name: string;
  start?: string;
  end?: string;
  season: IdInfo;
  program: IdInfo;
  location: Location;
  divisions?: Division[];
  level?: EventLevel;
  ongoing?: boolean;
  awards_finalized?: boolean;
  event_type?: EventType;
}

export enum EventType {
  TOURNAMENT = 'tournament',
  LEAGUE = 'league',
  WORKSHOP = 'workshop',
  VIRTUAL = 'virtual'
}

export interface Program extends Fetchable {
  id: number;
  abbr: string;
  name: string;
}

export enum EventLevel {
  WORLD = 'World',
  NATIONAL = 'National',
  STATE = 'State',
  SIGNATURE = 'Signature',
  OTHER = 'Other'
}

export interface Location {
  venue?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  coordinates: Coordinates;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Division {
  id: number;
  name: string;
  order: number;
}

export enum Grade {
  COLLEGE = 'College',
  HIGH_SCHOOL = 'High School',
  MIDDLE_SCHOOL = 'Middle School',
  ELEMENTARY_SCHOOL = 'Elementary School'
}

export interface Team extends Fetchable {
  id?: number;
  number: string;
  team_name: string;
  robot_name: string;
  organization?: string;
  location: Location;
  registered?: boolean;
  program: IdInfo;
  grade?: Grade;
}

export interface IdInfo {
  id: number;
  name: string;
  code?: string;
}

export interface Match extends Fetchable {
  id: number;
  event: IdInfo;
  division: IdInfo;
  round: number;
  instance: number;
  matchnum: number;
  scheduled?: string;
  started?: string;
  field?: string;
  scored: boolean;
  name: string;
  alliances: Alliance[];
}

export interface Alliance {
  color: AllianceColor;
  score: number;
  teams: AllianceTeam[];
}

export enum AllianceColor {
  RED = 'red',
  BLUE = 'blue'
}

export interface AllianceTeam {
  team: IdInfo;
  sitting: boolean;
}

export interface Ranking extends Fetchable {
  id: number;
  event: IdInfo;
  division: IdInfo;
  rank: number;
  team: IdInfo;
  wins: number;
  losses: number;
  ties: number;
  wp: number;
  ap: number;
  sp: number;
  high_score?: number;
}

export interface Skill extends Fetchable {
  id: number;
  event: IdInfo;
  team: IdInfo;
  type: SkillType;
  season: IdInfo;
  rank: number;
  score: number;
  attempts: number;
}

export enum SkillType {
  DRIVER = 'driver',
  PROGRAMMING = 'programming'
}

export interface Award extends Fetchable {
  id: number;
  event: IdInfo;
  order: number;
  title: string;
  qualifications?: string[];
  teamWinners?: { [key: number]: TeamAwardWinner };
  individualWinners?: string[];
}

export interface TeamAwardWinner {
  division: IdInfo;
  team: IdInfo;
}

export interface Season extends Fetchable {
  id: number;
  name: string;
  program: IdInfo;
  start: string;
  end: string;
  years_start?: number;
  years_end?: number;
}

interface ReError {
  code: number;
  message: string;
}

type Value = Event | Team | Match | Ranking | Skill | Award | Program | Season;

interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  from: number;
  to: number;
  total: number;
  first_page_url: string;
  last_page_url: string;
  prev_page_url: string;
  next_page_url: string;
  path: string;
}

interface Paginated<T extends Value> {
  meta: PageMeta;
  data: T[];
}

interface PageableQuery {
  page?: number;
  per_page?: number;
}

interface EventsQuery extends PageableQuery {
  'id[]'?: number[];
  'sku[]'?: string[];
  'team[]'?: number[];
  'season[]'?: number[];
  start?: string;
  end?: string;
  'level[]'?: EventLevel[];
}

interface EventTeamsQuery extends PageableQuery {
  'number[]'?: string[];
  registered?: boolean;
  'grade[]'?: Grade[];
  'country[]'?: string[];
}

interface EventSkillsQuery extends PageableQuery {
  'team[]'?: number[];
  'type[]'?: SkillType[];
}

interface EventAwardsQuery extends PageableQuery {
  'team[]'?: number[];
  'winner[]'?: string[];
}

interface EventMatchesQuery extends PageableQuery {
  'team[]'?: number[];
  'round[]'?: number[];
  'instance[]'?: number[];
  'matchnum[]'?: number[];
}

interface EventRankingsQuery extends PageableQuery {
  'team[]'?: number[];
  'rank[]'?: number[];
}

interface TeamsQuery extends PageableQuery {
  'id[]'?: number[];
  'number[]'?: string[];
  'event[]'?: number[];
  registered?: boolean;
  'program[]'?: number[];
  'grade[]'?: Grade[];
  'country[]'?: string[];
}

interface TeamEventsQuery extends PageableQuery {
  'sku[]'?: string[];
  'season[]'?: number[];
  start?: string;
  end?: string;
  'level[]'?: EventLevel[];
}

interface TeamMatchesQuery extends PageableQuery {
  'event[]'?: number[];
  'season[]'?: number[];
  'round[]'?: number[];
  'instance[]'?: number[];
  'matchnum[]'?: number[];
}

interface TeamRankingsQuery extends PageableQuery {
  'event[]'?: number[];
  'rank[]'?: number[];
  'season[]'?: number[];
}

interface TeamSkillsQuery extends PageableQuery {
  'event[]'?: number[];
  'type[]'?: SkillType[];
  'season[]'?: number[];
}

interface TeamAwardsQuery extends PageableQuery {
  'event[]'?: number[];
  'season[]'?: number[];
}

interface ProgramsQuery extends PageableQuery {
  'id[]'?: number[];
}

interface SeasonsQuery extends PageableQuery {
  'id[]'?: number[];
  'program[]'?: number[];
  'team[]'?: number[];
  start?: string;
  end?: string;
  active?: boolean;
}

interface SeasonEventsQuery extends PageableQuery {
  'sku[]'?: string[];
  'team[]'?: number[];
  start?: string;
  end?: string;
  'level[]'?: EventLevel[];
}

type Query = EventsQuery | EventTeamsQuery | EventSkillsQuery | EventAwardsQuery
| EventMatchesQuery | EventRankingsQuery | TeamsQuery | TeamEventsQuery
| TeamMatchesQuery | TeamRankingsQuery | TeamSkillsQuery | TeamAwardsQuery
| ProgramsQuery | SeasonsQuery | SeasonEventsQuery;

class ReApiV2Cursor<T extends Value> extends Cursor<T> {
  private readonly client: ReApiV2Client;
  private readonly path: string;
  private readonly nextQuery: Query;
  private readonly data: T[] = [];
  private isInitialized: boolean;
  private isLastPage: boolean;

  constructor(client: ReApiV2Client, path: string, query: Query) {
    super();
    this.client = client;
    this.path = path;
    this.nextQuery = query || {};
  }

  public async hasNext(): Promise<boolean> {
    if (!this.isInitialized) {
      this.data.push(...await this.nextPage());
      this.isInitialized = true;
    }
    return (this.data.length > 0) || !this.isLastPage;
  }

  public async next(): Promise<T> {
    if (!this.data.length && !this.isLastPage) {
      this.data.push(...await this.nextPage());
    }
    return this.data.shift();
  }

  public async nextPage(): Promise<T[]> {
    if (this.isLastPage) {
      return this.data.splice(0);
    }
    const {
      data,
      meta: {
        current_page,
        last_page,
        per_page
      }
    } = await this.client.get<Paginated<T>>(this.path, this.nextQuery);

    const fetchedAt = new Date();
    data.forEach(value => value.fetchedAt = fetchedAt);

    this.nextQuery.page = current_page + 1;
    this.data.push(...data);
    this.isLastPage = current_page >= last_page;

    return this.data.splice(0, per_page);
  }
}
