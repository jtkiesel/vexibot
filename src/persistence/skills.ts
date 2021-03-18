import { Collection } from 'mongodb';

import { ReApiV2Client, Skill as ReApiV2Skill } from '../robotevents/re-api-v2';
import Cache from './cache';
import { EventKey } from './events';
import { Builder, Cursor, Persistence, Value } from './persistence';
import { SeasonKey } from './seasons';
import Teams, { TeamKey } from './teams';

export default class Skills extends Persistence<SkillKey, Skill> {
  protected readonly client: ReApiV2Client;
  protected readonly teams: Teams;

  constructor(cache: Cache<Skill>, collection: Collection<Skill>, client: ReApiV2Client, teams: Teams) {
    super(cache, collection, SkillBuilder);
    this.client = client;
    this.teams = teams;

    this.collection.createIndex({
      id: 1
    }, {
      unique: true
    });
    this.collection.createIndex({
      event: 1,
      team: 1,
      type: 1
    }, {
      unique: true
    });
  }

  protected static transform(skill: ReApiV2Skill, team: TeamKey): Skill {
    return new SkillBuilder()
      .fetchedAt(skill.fetchedAt)
      .id(skill.id)
      .event({
        id: skill.event.id
      })
      .team(team)
      .type(skill.type)
      .season({
        id: skill.season.id
      })
      .rank(skill.rank)
      .score(skill.score)
      .attempts(skill.attempts)
      .build();
  }

  protected fetchAll(): Cursor<Skill> {
    return this.teams.getAll()
      .flatMap(team => this.client.getTeamSkills(team.id)
        .map(skill => Skills.transform(skill, team)));
  }

  protected async fetch(keys: SkillKey[]): Promise<Skill[]> {
    const teamGroups = new Map<string, EventKey[]>();
    keys.forEach(({ event, team, type }) => {
      teamGroups.get(JSON.stringify({ team, type }))?.push(event)
        || teamGroups.set(JSON.stringify({ team, type }), [event]);
    });
    const teams = await this.teams.get(keys.map(key => key.team));
    const teamIdByKey = teams.reduce((map, team) =>
      map.set(JSON.stringify(team.getKey()), team.id), new Map<string, number>());
    const skillsByTeam = await Promise.all(Array.from(teamGroups)
      .map(([teamAndType, events]) => {
        const { team, type } = JSON.parse(teamAndType) as { team: TeamKey, type: SkillType };
        return this.client.getTeamSkills(teamIdByKey.get(JSON.stringify(team)), {
          'event[]': events.map(({ id }) => id),
          'type[]': [type]
        }).map(skill => Skills.transform(skill, team))
          .toArray();
      }));
    return skillsByTeam.flat();
  }

  protected async fetchOne(key: SkillKey): Promise<Skill> {
    const { id } = await this.teams.getOne(key.team);
    return Skills.transform(await this.client.getEventSkills(key.event.id, {
      'team[]': [id],
      'type[]': [key.type]
    }).next(), key.team);
  }
}

export class SkillBuilder implements Builder<Skill> {
  #fetchedAt: Date;
  #id: number;
  #event: EventKey;
  #team: TeamKey;
  #type: SkillType;
  #season: SeasonKey;
  #rank: number;
  #score: number;
  #attempts: number;

  public fetchedAt(fetchedAt: Date): SkillBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): SkillBuilder {
    this.#id = id;
    return this;
  }

  public event(event: EventKey): SkillBuilder {
    this.#event = event;
    return this;
  }

  public team(team: TeamKey): SkillBuilder {
    this.#team = team;
    return this;
  }

  public type(type: SkillType): SkillBuilder {
    this.#type = type;
    return this;
  }

  public season(season: SeasonKey): SkillBuilder {
    this.#season = season;
    return this;
  }

  public rank(rank: number): SkillBuilder {
    this.#rank = rank;
    return this;
  }

  public score(score: number): SkillBuilder {
    this.#score = score;
    return this;
  }

  public attempts(attempts: number): SkillBuilder {
    this.#attempts = attempts;
    return this;
  }

  public build(): Skill {
    return new SkillBuilder.Skill(this);
  }

  static Skill = class Skill implements Value<SkillKey> {
    public readonly fetchedAt: Date;
    public readonly id: number;
    public readonly event: EventKey;
    public readonly team: TeamKey;
    public readonly type: SkillType;
    public readonly season: SeasonKey;
    public readonly rank: number;
    public readonly score: number;
    public readonly attempts: number;

    constructor(builder: SkillBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      this.id = builder.#id;
      this.event = builder.#event;
      this.team = builder.#team;
      this.type = builder.#type;
      this.season = builder.#season;
      this.rank = builder.#rank;
      this.score = builder.#score;
      this.attempts = builder.#attempts;
    }

    public getKey(): SkillKey {
      return {
        event: this.event,
        team: this.team,
        type: this.type
      };
    }

    public hasKey(key: SkillKey): boolean {
      return this.event === key.event
        && this.team === key.team
        && this.type === key.type;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Skill = typeof SkillBuilder.Skill.prototype;

export type SkillKey = {
  event: EventKey;
  team: TeamKey;
  type: SkillType;
};

export enum SkillType {
  DRIVER = 'Driver',
  PROGRAMMING = 'Programming'
}
