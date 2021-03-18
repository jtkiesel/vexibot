import { Collection } from 'mongodb';

import { ReApiV2Client, Award as ReApiV2Award } from '../robotevents/re-api-v2';
import Cache from './cache';
import Events, { Event, EventKey } from './events';
import { Builder, Cursor, Persistence, Value } from './persistence';
import { ProgramKey } from './programs';
import { SeasonKey } from './seasons';
import { TeamKey } from './teams';

export default class Awards extends Persistence<AwardKey, Award> {
  protected readonly client: ReApiV2Client;
  protected readonly events: Events;

  constructor(cache: Cache<Award>, collection: Collection<Award>, client: ReApiV2Client, events: Events) {
    super(cache, collection, AwardBuilder);
    this.client = client;
    this.events = events;

    this.collection.createIndex({
      id: 1
    }, {
      unique: true
    });
    this.collection.createIndex({
      event: 1,
      order: 1
    }, {
      unique: true
    });
  }

  protected static transform(award: ReApiV2Award, season: SeasonKey, program: ProgramKey): Award {
    return new AwardBuilder()
      .fetchedAt(award.fetchedAt)
      .id(award.id)
      .event(award.event && {
        id: award.event.id
      })
      .order(award.order)
      .title(award.title)
      .qualifications(Array.from(new Set(award.qualifications)))
      .teamWinners(award.teamWinners && Object.values(award.teamWinners)
        .map(teamWinner => new TeamAwardWinnerBuilder()
          .division(teamWinner.division?.id)
          .team(teamWinner.team && {
            number: teamWinner.team.code,
            season,
            program
          })
          .build()))
      .individualWinners(award.individualWinners)
      .build();
  }

  protected fetchAll(): Cursor<Award> {
    return this.events.getAll()
      .flatMap(event => this.client.getEventAwards(event.id)
        .map(award => Awards.transform(award, event.season, event.program)));
  }

  protected async fetch(keys: AwardKey[]): Promise<Award[]> {
    const eventGroups = new Map<number, string[]>();
    keys.forEach(({ event, title }) =>
      eventGroups.get(event.id)?.push(title) || eventGroups.set(event.id, [title]));
    const events = await this.events.get(Array.from(eventGroups.keys())
      .map(id => ({ id })));
    const awardsByEvent = await Promise.all(events
      .map(event => [event, eventGroups.get(event.id)] as [Event, string[]])
      .map(async ([event, titles]) => {
        const eventAwards = await this.client.getEventAwards(event.id)
          .map(award => Awards.transform(award, event.season, event.program))
          .toArray();
        return eventAwards.filter(({ title }) => titles.includes(title));
      }));
    return awardsByEvent.flat();
  }

  protected async fetchOne(key: AwardKey): Promise<Award> {
    const {
      season,
      program
    } = await this.events.getOne(key.event);
    const awards = await this.client.getEventAwards(key.event.id)
      .map(award => Awards.transform(award, season, program))
      .toArray();
    return awards.find(({ title }) => title === key.title);
  }
}

export class AwardBuilder implements Builder<Award> {
  #fetchedAt: Date;
  #id: number;
  #event: EventKey;
  #order: number;
  #title: string;
  #qualifications?: string[];
  #teamWinners?: TeamAwardWinner[];
  #individualWinners?: string[];

  public fetchedAt(fetchedAt: Date): AwardBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): AwardBuilder {
    this.#id = id;
    return this;
  }

  public event(event: EventKey): AwardBuilder {
    this.#event = event;
    return this;
  }

  public order(order: number): AwardBuilder {
    this.#order = order;
    return this;
  }

  public title(title: string): AwardBuilder {
    this.#title = title;
    return this;
  }

  public qualifications(qualifications: string[]): AwardBuilder {
    this.#qualifications = qualifications;
    return this;
  }

  public teamWinners(teamWinners: TeamAwardWinner[]): AwardBuilder {
    this.#teamWinners = teamWinners;
    return this;
  }

  public individualWinners(individualWinners: string[]): AwardBuilder {
    this.#individualWinners = individualWinners;
    return this;
  }

  public build(): Award {
    return new AwardBuilder.Award(this);
  }

  static Award = class Award implements Value<AwardKey> {
    public readonly fetchedAt: Date;
    public readonly id: number;
    public readonly event: EventKey;
    public readonly order: number;
    public readonly title: string;
    public readonly qualifications?: string[];
    public readonly teamWinners?: TeamAwardWinner[];
    public readonly individualWinners?: string[];

    constructor(builder: AwardBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      this.id = builder.#id;
      this.event = builder.#event;
      this.order = builder.#order;
      this.title = builder.#title;
      if (builder.#qualifications !== undefined) {
        this.qualifications = builder.#qualifications;
      }
      if (builder.#teamWinners !== undefined) {
        this.teamWinners = builder.#teamWinners;
      }
      if (builder.#individualWinners !== undefined) {
        this.individualWinners = builder.#individualWinners;
      }
    }

    public getKey(): AwardKey {
      return {
        event: this.event,
        title: this.title
      };
    }

    public hasKey(key: AwardKey): boolean {
      return this.event === key.event
        && this.title === key.title;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export class TeamAwardWinnerBuilder {
  #division: number;
  #team: TeamKey;

  public division(division: number): TeamAwardWinnerBuilder {
    this.#division = division;
    return this;
  }

  public team(team: TeamKey): TeamAwardWinnerBuilder {
    this.#team = team;
    return this;
  }

  public build(): TeamAwardWinner {
    return new TeamAwardWinnerBuilder.TeamAwardWinner(this);
  }

  static TeamAwardWinner = class TeamAwardWinner {
    public readonly division: number;
    public readonly team: TeamKey;

    constructor(builder: TeamAwardWinnerBuilder) {
      this.division = builder.#division;
      this.team = builder.#team;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Award = typeof AwardBuilder.Award.prototype;

export type TeamAwardWinner = typeof TeamAwardWinnerBuilder.TeamAwardWinner.prototype;

export type AwardKey = {
  event: EventKey;
  title: string;
};
