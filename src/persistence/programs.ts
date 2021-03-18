import { Collection } from 'mongodb';

import { ReApiV2Client, Program as ReApiV2Program } from '../robotevents/re-api-v2';
import Cache from './cache';
import { ArrayCursor, Builder, Cursor, Persistence, Value } from './persistence';

export default class Programs extends Persistence<ProgramKey, Program> {
  protected readonly client: ReApiV2Client;

  constructor(cache: Cache<Program>, collection: Collection<Program>, client: ReApiV2Client) {
    super(cache, collection, ProgramBuilder);
    this.client = client;

    this.collection.createIndex({
      id: 1
    }, {
      unique: true
    });
  }

  public getAll(): Cursor<Program> {
    return new ArrayCursor(this.cache.values());
  }

  public async findOneByAbbr(abbr: string): Promise<Program> {
    return this.collection.findOne({ abbr });
  }

  protected static transform(program: ReApiV2Program): Program {
    return new ProgramBuilder()
      .fetchedAt(program.fetchedAt)
      .id(program.id)
      .abbr(program.abbr)
      .name(program.name)
      .build();
  }

  protected fetchAll(): Cursor<Program> {
    return this.client.getPrograms()
      .map(Programs.transform);
  }

  protected async fetch(keys: ProgramKey[]): Promise<Program[]> {
    return this.client.getPrograms({
      'id[]': keys.map(key => key.id)
    }).map(Programs.transform)
      .toArray();
  }

  protected async fetchOne(key: ProgramKey): Promise<Program> {
    return Programs.transform(await this.client.getProgram(key.id));
  }
}

export class ProgramBuilder implements Builder<Program> {
  #fetchedAt: Date;
  #id: number;
  #abbr: string;
  #name: string;

  public fetchedAt(fetchedAt: Date): ProgramBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): ProgramBuilder {
    this.#id = id;
    return this;
  }

  public abbr(abbr: string): ProgramBuilder {
    this.#abbr = abbr;
    return this;
  }

  public name(name: string): ProgramBuilder {
    this.#name = name;
    return this;
  }

  public build(): Program {
    return new ProgramBuilder.Program(this);
  }

  static Program = class Program implements Value<ProgramKey> {
    public readonly fetchedAt: Date;
    public readonly id: number;
    public readonly abbr: string;
    public readonly name: string;

    constructor(builder: ProgramBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      this.id = builder.#id;
      this.abbr = builder.#abbr;
      this.name = builder.#name;
    }

    public getKey(): ProgramKey {
      return {
        id: this.id
      };
    }

    public hasKey(key: ProgramKey): boolean {
      return this.id === key.id;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Program = typeof ProgramBuilder.Program.prototype;

export type ProgramKey = {
  id: number
};
