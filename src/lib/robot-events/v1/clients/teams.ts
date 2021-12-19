import type {Team} from '.';
import {Client} from '../client';

export class Teams extends Client {
  public async findAllByTeamGroup(
    teamGroupTeamsRequest: TeamGroupTeamsRequest
  ): Promise<Team[]> {
    return this.post('/teams/getTeamsForLatLng', teamGroupTeamsRequest.data());
  }
}

export class TeamGroupTeamsRequestBuilder {
  #latitude?: number;
  #longitude?: number;
  #programIds?: number[];
  #seasonId?: number;

  public latitude(value: number): TeamGroupTeamsRequestBuilder {
    this.#latitude = value;
    return this;
  }

  public longitude(value: number): TeamGroupTeamsRequestBuilder {
    this.#longitude = value;
    return this;
  }

  public programIds(...value: number[]): TeamGroupTeamsRequestBuilder {
    this.#programIds = value;
    return this;
  }

  public seasonId(value: number): TeamGroupTeamsRequestBuilder {
    this.#seasonId = value;
    return this;
  }

  public build(): TeamGroupTeamsRequest {
    return new TeamGroupTeamsRequestBuilder.TeamGroupTeamsRequest(this);
  }

  static TeamGroupTeamsRequest = class TeamGroupTeamsRequest {
    public readonly latitude: number;
    public readonly longitude: number;
    public readonly programIds?: number[];
    public readonly seasonId?: number;

    constructor(builder: TeamGroupTeamsRequestBuilder) {
      if (builder.#latitude === undefined) {
        throw new Error(
          'Missing required property TeamGroupTeamsRequest.latitude'
        );
      }
      if (builder.#longitude === undefined) {
        throw new Error(
          'Missing required property TeamGroupTeamsRequest.longitude'
        );
      }
      this.latitude = builder.#latitude;
      this.longitude = builder.#longitude;
      this.programIds = builder.#programIds;
      this.seasonId = builder.#seasonId;
    }

    public data(): TeamGroupTeamsData {
      return {
        lat: this.latitude,
        lng: this.longitude,
        programs: this.programIds,
        season_id: this.seasonId,
        when: this.seasonId !== undefined ? When.PAST : undefined,
      };
    }
  };
}

export type TeamGroupTeamsRequest =
  typeof TeamGroupTeamsRequestBuilder.TeamGroupTeamsRequest.prototype;

interface TeamGroupTeamsData {
  lat: number;
  lng: number;
  programs?: number[];
  season_id?: number;
  when?: When;
}

enum When {
  FUTURE = 'future',
  PAST = 'past',
}
