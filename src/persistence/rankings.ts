import { Collection } from 'mongodb';

import { ReApiV2Client, Ranking as ReApiV2Ranking } from '../robotevents/re-api-v2';
import Cache from './cache';
import { EventKey } from './events';
import { Builder, Cursor, Persistence, Value } from './persistence';
import Teams, { TeamKey } from './teams';

export default class Rankings extends Persistence<RankingKey, Ranking> {
  protected readonly client: ReApiV2Client;
  protected readonly teams: Teams;

  constructor(cache: Cache<Ranking>, collection: Collection<Ranking>, client: ReApiV2Client, teams: Teams) {
    super(cache, collection, RankingBuilder);
    this.client = client;
    this.teams = teams;

    this.collection.createIndex({
      id: 1
    }, {
      unique: true
    });
    this.collection.createIndex({
      event: 1,
      division: 1,
      rank: 1,
    }, {
      unique: true
    });
  }

  protected static transform(ranking: ReApiV2Ranking, team: TeamKey): Ranking {
    return new RankingBuilder()
      .fetchedAt(ranking.fetchedAt)
      .id(ranking.id)
      .event(ranking.event && {
        id: ranking.event.id
      })
      .division(ranking.division?.id)
      .rank(ranking.rank)
      .team(team)
      .wins(ranking.wins)
      .losses(ranking.losses)
      .ties(ranking.ties)
      .wp(ranking.wp)
      .ap(ranking.ap)
      .sp(ranking.sp)
      .highScore(ranking.high_score)
      .build();
  }

  protected fetchAll(): Cursor<Ranking> {
    return this.teams.getAll()
      .flatMap(team => this.client.getTeamRankings(team.id)
        .map(ranking => Rankings.transform(ranking, team.getKey())));
  }

  protected async fetch(keys: RankingKey[]): Promise<Ranking[]> {
    const teamGroups = new Map<string, { event: EventKey, division: number }[]>();
    keys.forEach(({ event, division, team }) =>
      teamGroups.get(JSON.stringify(team))?.push({ event, division })
        || teamGroups.set(JSON.stringify(team), [{ event, division }]));
    const teams = await this.teams.get(keys.map(key => key.team));
    const teamIdByKey = teams.reduce((map, team) =>
      map.set(JSON.stringify(team.getKey()), team.id), new Map<string, number>());
    const rankingsByTeam = await Promise.all(Array.from(teamGroups)
      .map(([teamKey, eventDivisions]) =>
        this.client.getTeamRankings(teamIdByKey.get(teamKey), {
          'event[]': eventDivisions.map(({ event: { id } }) => id)
        }).map(ranking => Rankings.transform(ranking, JSON.parse(teamKey)))
          .toArray()));
    return rankingsByTeam.flat();
  }

  protected async fetchOne(key: RankingKey): Promise<Ranking> {
    const { id } = await this.teams.getOne(key.team);
    return Rankings.transform(await this.client.getEventRankings(key.event.id,
      key.division, {
        'team[]': [id]
      }).next(), key.team);
  }
}

export class RankingBuilder implements Builder<Ranking> {
  #fetchedAt: Date;
  #id: number;
  #event: EventKey;
  #division: number;
  #rank: number;
  #team: TeamKey;
  #wins: number;
  #losses: number;
  #ties: number;
  #wp: number;
  #ap: number;
  #sp: number;
  #highScore?: number;

  public fetchedAt(fetchedAt: Date): RankingBuilder {
    this.#fetchedAt = fetchedAt;
    return this;
  }

  public id(id: number): RankingBuilder {
    this.#id = id;
    return this;
  }

  public event(event: EventKey): RankingBuilder {
    this.#event = event;
    return this;
  }

  public division(division: number): RankingBuilder {
    this.#division = division;
    return this;
  }

  public rank(rank: number): RankingBuilder {
    this.#rank = rank;
    return this;
  }

  public team(team: TeamKey): RankingBuilder {
    this.#team = team;
    return this;
  }

  public wins(wins: number): RankingBuilder {
    this.#wins = wins;
    return this;
  }

  public losses(losses: number): RankingBuilder {
    this.#losses = losses;
    return this;
  }

  public ties(ties: number): RankingBuilder {
    this.#ties = ties;
    return this;
  }

  public wp(wp: number): RankingBuilder {
    this.#wp = wp;
    return this;
  }

  public ap(ap: number): RankingBuilder {
    this.#ap = ap;
    return this;
  }

  public sp(sp: number): RankingBuilder {
    this.#sp = sp;
    return this;
  }

  public highScore(highScore: number): RankingBuilder {
    this.#highScore = highScore;
    return this;
  }

  public build(): Ranking {
    return new RankingBuilder.Ranking(this);
  }

  public static Ranking = class Ranking implements Value<RankingKey> {
    public readonly fetchedAt: Date;
    public readonly id: number;
    public readonly event: EventKey;
    public readonly division: number;
    public readonly rank: number;
    public readonly team: TeamKey;
    public readonly wins: number;
    public readonly losses: number;
    public readonly ties: number;
    public readonly wp: number;
    public readonly ap: number;
    public readonly sp: number;
    public readonly highScore?: number;

    constructor(builder: RankingBuilder) {
      this.fetchedAt = builder.#fetchedAt;
      this.id = builder.#id;
      this.event = builder.#event;
      this.division = builder.#division;
      this.rank = builder.#rank;
      this.team = builder.#team;
      this.wins = builder.#wins;
      this.losses = builder.#losses;
      this.ties = builder.#ties;
      this.wp = builder.#wp;
      this.ap = builder.#ap;
      this.sp = builder.#sp;
      if (builder.#highScore !== undefined) {
        this.highScore = builder.#highScore;
      }
    }

    public getKey(): RankingKey {
      return {
        event: this.event,
        division: this.division,
        team: this.team
      };
    }

    public hasKey(key: RankingKey): boolean {
      return this.event === key.event
        && this.division === key.division
        && this.team === key.team;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Ranking = typeof RankingBuilder.Ranking.prototype;

export type RankingKey = {
  event: EventKey;
  division: number;
  team: TeamKey;
};
