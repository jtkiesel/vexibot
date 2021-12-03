import {TeamGroup} from '.';
import {Client} from '../client';

export class TeamGroups extends Client {
  public async findAll(
    teamGroupsRequest?: TeamGroupsRequest
  ): Promise<TeamGroup[]> {
    return this.post('/teams/latLngGrp', teamGroupsRequest?.data());
  }
}

export class TeamGroupsRequestBuilder {
  #programIds?: number[];
  #seasonId?: number;
  #country?: string;
  #region?: string;

  public programIds(...value: number[]): TeamGroupsRequestBuilder {
    this.#programIds = value;
    return this;
  }

  public seasonId(value: number): TeamGroupsRequestBuilder {
    this.#seasonId = value;
    return this;
  }

  public location(country: string, region?: string): TeamGroupsRequestBuilder {
    this.#country = country;
    this.#region = region;
    return this;
  }

  public build(): TeamGroupsRequest {
    return new TeamGroupsRequestBuilder.TeamGroupsRequest(this);
  }

  static TeamGroupsRequest = class TeamGroupsRequest {
    public readonly programIds?: number[];
    public readonly seasonId?: number;
    public readonly country?: string;
    public readonly region?: string;

    constructor(builder: TeamGroupsRequestBuilder) {
      this.programIds = builder.#programIds;
      this.seasonId = builder.#seasonId;
      this.country = builder.#country;
      this.region = builder.#region;
    }

    public data(): TeamGroupsData {
      return {
        programs: this.programIds,
        season_id: this.seasonId,
        country: this.country,
        region: this.region,
        when: this.seasonId !== undefined ? When.PAST : undefined,
      };
    }
  };
}

export type TeamGroupsRequest =
  typeof TeamGroupsRequestBuilder.TeamGroupsRequest.prototype;

interface TeamGroupsData {
  programs?: number[];
  season_id?: number;
  country?: string;
  region?: string;
  when?: When;
}

enum When {
  FUTURE = 'future',
  PAST = 'past',
}
