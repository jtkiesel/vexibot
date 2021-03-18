import { Collection } from 'mongodb';

import { ReApiV2Client, Season as ReApiV2Season } from '../robotevents/re-api-v2';
import Cache from './cache';
import { ArrayCursor, Builder, Cursor, Persistence, Value } from './persistence';
import { ProgramKey } from './programs';

export default class Seasons extends Persistence<SeasonKey, Season> {
  protected readonly client: ReApiV2Client;

  constructor(cache: Cache<Season>, collection: Collection<Season>, client: ReApiV2Client) {
    super(cache, collection, SeasonBuilder);
    this.client = client;

    this.collection.createIndex({
      id: 1
    }, {
      unique: true
    });
  }

  public getAll(): Cursor<Season> {
    return new ArrayCursor(this.cache.values());
  }

  protected static transform(season: ReApiV2Season): Season {
    return new SeasonBuilder()
      .fetchedAt(season.fetchedAt)
      .id(season.id)
      .name(season.name)
      .program(season.program && {
        id: season.program.id
      })
      .start(season.start && ReApiV2Client.parseReDate(season.start))
      .end(season.end && ReApiV2Client.parseReDate(season.end))
      .build();
  }

  protected fetchAll(): Cursor<Season> {
    return this.client.getSeasons()
      .map(Seasons.transform);
  }

  protected async fetch(keys: SeasonKey[]): Promise<Season[]> {
    return this.client.getSeasons({
      'id[]': keys.map(key => key.id)
    }).map(Seasons.transform)
      .toArray();
  }

  protected async fetchOne(key: SeasonKey): Promise<Season> {
    return Seasons.transform(await this.client.getSeason(key.id));
  }
}

export class SeasonBuilder implements Builder<Season> {
  #fetchedAt: Date;
  #id: number;
  #name: string;
  #program: ProgramKey;
  #start: Date;
  #end: Date;

  public fetchedAt(fetchedAt: Date): SeasonBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): SeasonBuilder {
    this.#id = id;
    return this;
  }

  public name(name: string): SeasonBuilder {
    this.#name = name;
    return this;
  }

  public program(program: ProgramKey): SeasonBuilder {
    this.#program = program;
    return this;
  }

  public start(start: Date): SeasonBuilder {
    this.#start = start;
    return this;
  }

  public end(end: Date): SeasonBuilder {
    this.#end = end;
    return this;
  }

  public build(): Season {
    return new SeasonBuilder.Season(this);
  }

  static Season = class Season implements Value<SeasonKey> {
    public readonly fetchedAt: Date;
    public readonly id: number;
    public readonly name: string;
    public readonly program: ProgramKey;
    public readonly start: Date;
    public readonly end: Date;

    constructor(builder: SeasonBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      this.id = builder.#id;
      this.name = builder.#name;
      this.program = builder.#program;
      this.start = builder.#start;
      this.end = builder.#end;
    }

    public getKey(): SeasonKey {
      return {
        id: this.id
      };
    }

    public hasKey(key: SeasonKey): boolean {
      return this.id === key.id;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Season = typeof SeasonBuilder.Season.prototype;

export type SeasonKey = {
  id: number
};
