import { Collection } from 'mongodb';

import { ReApiV2Client, Match as ReApiV2Match } from '../robotevents/re-api-v2';
import Cache from './cache';
import Events, { EventKey } from './events';
import { ArrayCursor, Builder, Cursor, Persistence, Value } from './persistence';
import { ProgramKey } from './programs';
import { SeasonKey } from './seasons';
import { TeamKey } from './teams';

export default class Matches extends Persistence<MatchKey, Match> {
  protected readonly client: ReApiV2Client;
  protected readonly events: Events;

  constructor(cache: Cache<Match>, collection: Collection<Match>, client: ReApiV2Client, events: Events) {
    super(cache, collection, MatchBuilder);
    this.client = client;
    this.events = events;

    this.collection.createIndex({
      id: 1
    }, {
      unique: true
    });
    this.collection.createIndex({
      event: 1,
      division: 1,
      round: 1,
      instance: 1,
      number: 1
    }, {
      unique: true
    });
  }

  protected static transform(match: ReApiV2Match, season: SeasonKey, program: ProgramKey): Match {
    return new MatchBuilder()
      .fetchedAt(match.fetchedAt)
      .id(match.id)
      .event({
        id: match.event.id
      })
      .division(match.division.id)
      .round(match.round)
      .instance(match.instance)
      .number(match.matchnum)
      .scheduled(match.scheduled && ReApiV2Client.parseReDate(match.scheduled))
      .started(match.started && ReApiV2Client.parseReDate(match.started))
      .field(match.field)
      .scored(match.scored)
      .name(match.name)
      .alliances(match.alliances.map(alliance => new AllianceBuilder()
        .color(alliance.color)
        .score(alliance.score)
        .teams(alliance.teams.map(team => new AllianceTeamBuilder()
          .team(team.team && {
            number: team.team.code,
            season,
            program
          })
          .sitting(team.sitting)
          .build()))
        .build()))
      .build();
  }

  protected fetchAll(): Cursor<Match> {
    return this.events.getAll()
      .flatMap(event => new ArrayCursor(event.divisions)
        .flatMap(division => this.client.getEventMatches(event.id, division.id))
        .map(match => Matches.transform(match, event.season, event.program)));
  }

  protected async fetch(keys: MatchKey[]): Promise<Match[]> {
    return Promise.all(keys.map(this.fetchOne));
  }

  protected async fetchOne(key: MatchKey): Promise<Match> {
    const {
      season,
      program
    } = await this.events.getOne(key.event);
    return Matches.transform(await this.client.getEventMatches(key.event.id,
      key.division, {
        'round[]': [key.round],
        'instance[]': [key.instance],
        'matchnum[]': [key.number]
      },).next(), season, program);
  }
}

export class MatchBuilder implements Builder<Match> {
  #fetchedAt: Date;
  #id: number;
  #event: EventKey;
  #division: number;
  #round: number;
  #instance: number;
  #number: number;
  #scheduled?: Date;
  #started?: Date;
  #field?: string;
  #scored: boolean;
  #name: string;
  #alliances: Alliance[];

  public fetchedAt(fetchedAt: Date): MatchBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): MatchBuilder {
    this.#id = id;
    return this;
  }

  public event(event: EventKey): MatchBuilder {
    this.#event = event;
    return this;
  }

  public division(division: number): MatchBuilder {
    this.#division = division;
    return this;
  }

  public round(round: number): MatchBuilder {
    this.#round = round;
    return this;
  }

  public instance(instance: number): MatchBuilder {
    this.#instance = instance;
    return this;
  }

  public number(number: number): MatchBuilder {
    this.#number = number;
    return this;
  }

  public scheduled(scheduled: Date): MatchBuilder {
    this.#scheduled = scheduled;
    return this;
  }

  public started(started: Date): MatchBuilder {
    this.#started = started;
    return this;
  }

  public field(field: string): MatchBuilder {
    this.#field = field;
    return this;
  }

  public scored(scored: boolean): MatchBuilder {
    this.#scored = scored;
    return this;
  }

  public name(name: string): MatchBuilder {
    this.#name = name;
    return this;
  }

  public alliances(alliances: Alliance[]): MatchBuilder {
    this.#alliances = alliances;
    return this;
  }

  public build(): Match {
    return new MatchBuilder.Match(this);
  }

  static Match = class Match implements Value<MatchKey> {
    public readonly fetchedAt: Date;
    public readonly id: number;
    public readonly event: EventKey;
    public readonly division: number;
    public readonly round: number;
    public readonly instance: number;
    public readonly number: number;
    public readonly scheduled?: Date;
    public readonly started?: Date;
    public readonly field?: string;
    public readonly scored: boolean;
    public readonly name: string;
    public readonly alliances: Alliance[];

    constructor(builder: MatchBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      this.id = builder.#id;
      this.event = builder.#event;
      this.division = builder.#division;
      this.round = builder.#round;
      this.instance = builder.#instance;
      this.number = builder.#number;
      if (builder.#scheduled !== undefined) {
        this.scheduled = builder.#scheduled;
      }
      if (builder.#started !== undefined) {
        this.started = builder.#started;
      }
      if (builder.#field !== undefined) {
        this.field = builder.#field;
      }
      this.scored = builder.#scored;
      this.name = builder.#name;
      this.alliances = builder.#alliances;
    }

    public getKey(): MatchKey {
      return {
        event: this.event,
        division: this.division,
        round: this.round,
        instance: this.instance,
        number: this.number
      };
    }

    public hasKey(key: MatchKey): boolean {
      return this.event === key.event
        && this.division === key.division
        && this.round === key.round
        && this.instance === key.instance
        && this.number === key.number;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export class AllianceBuilder {
  #color: AllianceColor;
  #score: number;
  #teams: AllianceTeam[];

  public color(color: AllianceColor): AllianceBuilder {
    this.#color = color;
    return this;
  }

  public score(score: number): AllianceBuilder {
    this.#score = score;
    return this;
  }

  public teams(teams: AllianceTeam[]): AllianceBuilder {
    this.#teams = teams;
    return this;
  }

  public build(): Alliance {
    return new AllianceBuilder.Alliance(this);
  }

  static Alliance = class Alliance {
    public readonly color: AllianceColor;
    public readonly score: number;
    public readonly teams: AllianceTeam[];

    constructor(builder: AllianceBuilder) {
      this.color = builder.#color;
      this.score = builder.#score;
      this.teams = builder.#teams;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export class AllianceTeamBuilder {
  #team?: TeamKey;
  #sitting?: boolean;

  public team(team: TeamKey): AllianceTeamBuilder {
    this.#team = team;
    return this;
  }

  public sitting(sitting: boolean): AllianceTeamBuilder {
    this.#sitting = sitting;
    return this;
  }

  public build(): AllianceTeam {
    return new AllianceTeamBuilder.AllianceTeam(this);
  }

  static AllianceTeam = class AllianceTeam {
    public readonly team?: TeamKey;
    public readonly sitting?: boolean;

    constructor(builder: AllianceTeamBuilder) {
      if (builder.#team !== undefined) {
        this.team = builder.#team;
      }
      if (builder.#sitting !== undefined) {
        this.sitting = builder.#sitting;
      }
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Match = typeof MatchBuilder.Match.prototype;

export type Alliance = typeof AllianceBuilder.Alliance.prototype;

export type AllianceTeam = typeof AllianceTeamBuilder.AllianceTeam.prototype;

export type MatchKey = {
  event: EventKey;
  division: number;
  round: number;
  instance: number;
  number: number;
};

export enum AllianceColor {
  RED = 'Red',
  BLUE = 'Blue'
}
