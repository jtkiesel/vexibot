import { Collection } from 'mongodb';

import { ReApiV2Client, Event as ReApiV2Event } from '../robotevents/re-api-v2';
import Cache from './cache';
import { CoordinatesBuilder, Location, LocationBuilder } from './location';
import { Builder, Cursor, Persistence, Value } from './persistence';
import { ProgramKey } from './programs';
import { SeasonKey } from './seasons';

export default class Events extends Persistence<EventKey, Event> {
  protected readonly client: ReApiV2Client;

  constructor(cache: Cache<Event>, collection: Collection<Event>, client: ReApiV2Client) {
    super(cache, collection, EventBuilder);
    this.client = client;

    this.collection.createIndex({
      id: 1
    }, {
      unique: true
    });
  }

  protected static transform(event: ReApiV2Event): Event {
    return new EventBuilder()
      .fetchedAt(event.fetchedAt)
      .id(event.id)
      .sku(event.sku)
      .start(event.start && ReApiV2Client.parseReDate(event.start))
      .end(event.end && ReApiV2Client.parseReDate(event.end))
      .season({
        id: event.season.id
      })
      .program({
        id: event.program.id
      })
      .location(new LocationBuilder()
        .venue(event.location.venue)
        .address1(event.location.address_1)
        .address2(event.location.address_2)
        .city(event.location.city)
        .region(event.location.region)
        .postcode(event.location.postcode)
        .country(event.location.country)
        .coordinates(event.location.coordinates && new CoordinatesBuilder()
          .lat(event.location.coordinates.lat)
          .lon(event.location.coordinates.lon)
          .build())
        .build())
      .divisions(event.divisions?.map(division => new DivisionBuilder()
        .id(division.id)
        .name(division.name)
        .order(division.order)
        .build()))
      .level(event.level)
      .ongoing(event.ongoing)
      .awardsFinalized(event.awards_finalized)
      .eventType(event.event_type)
      .build();
  }

  protected fetchAll(): Cursor<Event> {
    return this.client.getEvents()
      .map(Events.transform);
  }

  protected async fetch(keys: EventKey[]): Promise<Event[]> {
    return this.client.getEvents({
      'id[]': keys.map(key => key.id)
    }).map(Events.transform)
      .toArray();
  }

  protected async fetchOne(key: EventKey): Promise<Event> {
    return Events.transform(await this.client.getEvent(key.id));
  }
}

export class EventBuilder implements Builder<Event> {
  #fetchedAt: Date;
  #id: number;
  #sku: string;
  #start?: Date;
  #end?: Date;
  #season: SeasonKey;
  #program: ProgramKey;
  #location: Location;
  #divisions?: Division[];
  #level?: EventLevel;
  #ongoing?: boolean;
  #awardsFinalized?: boolean;
  #eventType?: EventType;

  public fetchedAt(fetchedAt: Date): EventBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): EventBuilder {
    this.#id = id;
    return this;
  }

  public sku(sku: string): EventBuilder {
    this.#sku = sku;
    return this;
  }

  public start(start: Date): EventBuilder {
    this.#start = start;
    return this;
  }

  public end(end: Date): EventBuilder {
    this.#end = end;
    return this;
  }

  public season(season: SeasonKey): EventBuilder {
    this.#season = season;
    return this;
  }

  public program(program: ProgramKey): EventBuilder {
    this.#program = program;
    return this;
  }

  public location(location: Location): EventBuilder {
    this.#location = location;
    return this;
  }

  public divisions(divisions: Division[]): EventBuilder {
    this.#divisions = divisions;
    return this;
  }

  public level(level: EventLevel): EventBuilder {
    this.#level = level;
    return this;
  }

  public ongoing(ongoing: boolean): EventBuilder {
    this.#ongoing = ongoing;
    return this;
  }

  public awardsFinalized(awardsFinalized: boolean): EventBuilder {
    this.#awardsFinalized = awardsFinalized;
    return this;
  }

  public eventType(eventType: EventType): EventBuilder {
    this.#eventType = eventType;
    return this;
  }

  public build(): Event {
    return new EventBuilder.Event(this);
  }

  static Event = class Event implements Value<EventKey> {
    public readonly fetchedAt: Date;
    public readonly id: number;
    public readonly sku: string;
    public readonly start?: Date;
    public readonly end?: Date;
    public readonly season: SeasonKey;
    public readonly program: ProgramKey;
    public readonly location: Location;
    public readonly divisions?: Division[];
    public readonly level?: EventLevel;
    public readonly ongoing?: boolean;
    public readonly awardsFinalized?: boolean;
    public readonly eventType?: EventType;

    constructor(builder: EventBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      this.id = builder.#id;
      this.sku = builder.#sku;
      if (builder.#start !== undefined) {
        this.start = builder.#start;
      }
      if (builder.#end !== undefined) {
        this.end = builder.#end;
      }
      this.season = builder.#season;
      this.program = builder.#program;
      this.location = builder.#location;
      if (builder.#divisions !== undefined) {
        this.divisions = builder.#divisions;
      }
      if (builder.#level !== undefined) {
        this.level = builder.#level;
      }
      if (builder.#ongoing !== undefined) {
        this.ongoing = builder.#ongoing;
      }
      if (builder.#awardsFinalized !== undefined) {
        this.awardsFinalized = builder.#awardsFinalized;
      }
      if (builder.#eventType !== undefined) {
        this.eventType = builder.#eventType;
      }
    }

    public getKey(): EventKey {
      return {
        id: this.id
      };
    }

    public hasKey(key: EventKey): boolean {
      return this.id === key.id;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export class DivisionBuilder {
  #id?: number;
  #name?: string;
  #order?: number;

  public id(id: number): DivisionBuilder {
    this.#id = id;
    return this;
  }

  public name(name: string): DivisionBuilder {
    this.#name = name;
    return this;
  }

  public order(order: number): DivisionBuilder {
    this.#order = order;
    return this;
  }

  public build(): Division {
    return new DivisionBuilder.Division(this);
  }

  static Division = class Division {
    public readonly id?: number;
    public readonly name?: string;
    public readonly order?: number;

    constructor(builder: DivisionBuilder) {
      if (builder.#id !== undefined) {
        this.id = builder.#id;
      }
      if (builder.#name !== undefined) {
        this.name = builder.#name;
      }
      if (builder.#order !== undefined) {
        this.order = builder.#order;
      }
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Event = typeof EventBuilder.Event.prototype;

export type Division = typeof DivisionBuilder.Division.prototype;

export type EventKey = {
  id: number
};

export enum EventLevel {
  WORLD = 'World',
  NATIONAL = 'National',
  STATE = 'State',
  SIGNATURE = 'Signature',
  OTHER = 'Other'
}

export enum EventType {
  TOURNAMENT = 'Tournament',
  LEAGUE = 'League',
  WORKSHOP = 'Workshop',
  VIRTUAL = 'Virtual'
}
