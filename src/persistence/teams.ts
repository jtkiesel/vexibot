import { Collection } from 'mongodb';

import { LatLngGrp, ReApiClient, Team as ReApiTeam, What, When } from '../robotevents/re-api';
import { ReApiV2Client } from '../robotevents/re-api-v2';
import Cache from './cache';
import { CoordinatesBuilder, Location, LocationBuilder } from './location';
import { Persistence, Cursor, Value, Builder } from './persistence';
import { ProgramKey } from './programs';
import Seasons, { SeasonKey } from './seasons';

export default class Teams extends Persistence<TeamKey, Team> {
  private readonly v2Client: ReApiV2Client;
  private readonly client: ReApiClient;
  private readonly seasons: Seasons;

  constructor(cache: Cache<Team>, collection: Collection<Team>, client: ReApiClient, v2Client: ReApiV2Client, seasons: Seasons) {
    super(cache, collection, TeamBuilder);
    this.v2Client = v2Client;
    this.client = client;
    this.seasons = seasons;

    this.collection.createIndex({
      number: 1,
      season: 1
    }, {
      unique: true
    });
    this.collection.createIndex({
      id: 1,
      season: 1
    }, {
      unique: true,
      partialFilterExpression: { id: { $exists: true } }
    });
    this.collection.createIndex({
      number: 'text'
    });
  }

  protected fetchAll(): Cursor<Team> {
    return this.seasons.getAll()
      .flatMap(season => new TeamCursor(season.getKey(), season.program, this.client, this.v2Client));
  }

  protected async fetch(): Promise<Team[]> {
    return [];
  }

  protected async fetchOne(): Promise<Team> {
    return undefined;
  }
}

export class TeamBuilder implements Builder<Team> {
  #fetchedAt: Date;
  #id?: number;
  #number: string;
  #name: string;
  #robot: string;
  #organization?: string;
  #location: Location;
  #season: SeasonKey;
  #program: ProgramKey;
  #grade?: Grade;

  public fetchedAt(fetchedAt: Date): TeamBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): TeamBuilder {
    this.#id = id;
    return this;
  }

  public number(number: string): TeamBuilder {
    this.#number = number;
    return this;
  }

  public name(name: string): TeamBuilder {
    this.#name = name;
    return this;
  }

  public robot(robot: string): TeamBuilder {
    this.#robot = robot;
    return this;
  }

  public organization(organization: string): TeamBuilder {
    this.#organization = organization;
    return this;
  }

  public location(location: Location): TeamBuilder {
    this.#location = location;
    return this;
  }

  public season(season: SeasonKey): TeamBuilder {
    this.#season = season;
    return this;
  }

  public program(program: ProgramKey): TeamBuilder {
    this.#program = program;
    return this;
  }

  public grade(grade: Grade): TeamBuilder {
    this.#grade = grade;
    return this;
  }

  public build(): Team {
    return new TeamBuilder.Team(this);
  }

  static Team = class Team implements Value<TeamKey> {
    public readonly fetchedAt: Date;
    public readonly id?: number;
    public readonly number: string;
    public readonly name: string;
    public readonly robot?: string;
    public readonly organization?: string;
    public readonly location: Location;
    public readonly season: SeasonKey;
    public readonly program: ProgramKey;
    public readonly grade?: Grade;

    constructor(builder: TeamBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      if (builder.#id !== undefined) {
        this.id = builder.#id;
      }
      this.number = builder.#number;
      this.name = builder.#name;
      if (builder.#robot !== undefined) {
        this.robot = builder.#robot;
      }
      if (builder.#organization !== undefined) {
        this.organization = builder.#organization;
      }
      this.location = builder.#location;
      this.season = builder.#season;
      this.program = builder.#program;
      if (builder.#grade !== undefined) {
        this.grade = builder.#grade;
      }
    }

    public getKey(): TeamKey {
      return {
        number: this.number,
        season: this.season,
        program: this.program
      };
    }

    public hasKey(key: TeamKey): boolean {
      return this.number === key.number
        && this.season === key.season
        && this.program === key.program;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Team = typeof TeamBuilder.Team.prototype;

export type TeamKey = {
  number: string;
  season: SeasonKey;
  program: ProgramKey;
};

export enum Grade {
  COLLEGE = 'College',
  HIGH_SCHOOL = 'High School',
  MIDDLE_SCHOOL = 'Middle School',
  ELEMENTARY_SCHOOL = 'Elementary School'
}

class TeamCursor extends Cursor<Team> {
  private readonly latLngGroups: LatLngGrp[] = [];
  private readonly teams: Team[] = [];
  private readonly season: SeasonKey;
  private readonly program: ProgramKey;
  private readonly client: ReApiClient;
  private readonly v2Client: ReApiV2Client;
  private isInitialized: boolean;

  constructor(season: SeasonKey, program: ProgramKey, client: ReApiClient, v2Client: ReApiV2Client) {
    super();
    this.season = season;
    this.program = program;
    this.client = client;
    this.v2Client = v2Client;
    this.isInitialized = false;
  }

  public async hasNext(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return (this.teams.length > 0) || (this.latLngGroups.length > 0);
  }

  public async next(): Promise<Team> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.teams.length && this.latLngGroups.length) {
      this.teams.push(...await this.nextPage());
    }
    return this.teams.shift();
  }

  public async nextPage(): Promise<Team[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (this.teams.length) {
      return this.teams.splice(0);
    }
    const programs = [
      this.program.id
    ];
    const {
      position: {
        lat,
        lng
      }
    } = this.latLngGroups.shift();
    const query = {
      programs,
      when: When.PAST,
      what: What.TEAM,
      season_id: this.season.id,
      lat,
      lng
    };
    const teams = await this.client.getTeams(query);
    const fetchedAt = new Date();
    teams.forEach(team => team.fetchedAt = fetchedAt);

    const numberToId = new Map<string, number>();
    await this.v2Client.getTeams({
      'number[]': teams.map(({ team }) => team),
      'program[]': programs
    }).forEach(({ number, id }) => numberToId.set(number, id));

    return teams.map(team =>
      this.transform(team, numberToId.get(team.team), lat, lng));
  }

  private async initialize(): Promise<void> {
    const query = {
      programs: [
        this.program.id
      ],
      when: When.PAST,
      what: What.TEAM,
      season_id: this.season.id
    };
    this.latLngGroups.push(...await this.client.getLatLngGroups(query));
    this.isInitialized = true;
  }

  private transform(team: ReApiTeam, id: number, lat: number, lon: number): Team {
    const builder = new TeamBuilder();
    if (id != null) {
      builder.id(id);
    }
    return builder
      .fetchedAt(team.fetchedAt)
      .number(team.team)
      .name(team.team_name)
      .robot(team.robot_name)
      .location(new LocationBuilder()
        .city(team.city)
        .region(team.name)
        .coordinates(new CoordinatesBuilder()
          .lat(lat)
          .lon(lon)
          .build())
        .build())
      .season(this.season)
      .program(this.program)
      .build();
  }
}
