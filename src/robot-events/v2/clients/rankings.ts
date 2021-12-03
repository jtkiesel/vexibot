import {Ranking} from '.';
import {Client} from '../client';
import {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Rankings extends Client {
  public findAllByEventDivision(
    eventDivisionRankingsRequest: EventDivisionRankingsRequest
  ): Cursor<Ranking> {
    return this.getAll(
      `/events/${eventDivisionRankingsRequest.eventId}/divisions/${eventDivisionRankingsRequest.divisionId}/rankings`,
      eventDivisionRankingsRequest.params()
    );
  }

  public findAllByTeam(
    teamRankingsRequest: TeamRankingsRequest
  ): Cursor<Ranking> {
    return this.getAll(
      `/teams/${teamRankingsRequest.teamId}/rankings`,
      teamRankingsRequest.params()
    );
  }

  public findAllFinalistsByEventDivision(
    eventDivisionRankingsRequest: EventDivisionRankingsRequest
  ): Cursor<Ranking> {
    return this.getAll(
      `/events/${eventDivisionRankingsRequest.eventId}/divisions/${eventDivisionRankingsRequest.divisionId}/finalistRankings`,
      eventDivisionRankingsRequest.params()
    );
  }
}

export class EventDivisionRankingsRequestBuilder extends PageableRequestBuilder {
  #eventId?: number;
  #divisionId?: number;
  #teamIds?: number[];
  #ranks?: number[];

  public eventId(value: number): EventDivisionRankingsRequestBuilder {
    this.#eventId = value;
    return this;
  }

  public divisionId(value: number): EventDivisionRankingsRequestBuilder {
    this.#divisionId = value;
    return this;
  }

  public teamIds(...value: number[]): EventDivisionRankingsRequestBuilder {
    this.#teamIds = value;
    return this;
  }

  public ranks(...value: number[]): EventDivisionRankingsRequestBuilder {
    this.#ranks = value;
    return this;
  }

  public build(): EventDivisionRankingsRequest {
    return new EventDivisionRankingsRequestBuilder.EventDivisionRankingsRequest(
      this
    );
  }

  static EventDivisionRankingsRequest = class EventDivisionRankingsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly eventId: number;
    public readonly divisionId: number;
    public readonly teamIds?: number[];
    public readonly ranks?: number[];

    constructor(builder: EventDivisionRankingsRequestBuilder) {
      super(builder);
      if (builder.#eventId === undefined) {
        throw new Error(
          'Missing required property EventDivisionRankingsRequest.eventId'
        );
      }
      if (builder.#divisionId === undefined) {
        throw new Error(
          'Missing required property EventDivisionRankingsRequest.divisionId'
        );
      }
      this.eventId = builder.#eventId;
      this.divisionId = builder.#divisionId;
      this.teamIds = builder.#teamIds;
      this.ranks = builder.#ranks;
    }

    public params(): EventDivisionRankingsParams {
      return {...super.params(), team: this.teamIds, rank: this.ranks};
    }
  };
}

export type EventDivisionRankingsRequest =
  typeof EventDivisionRankingsRequestBuilder.EventDivisionRankingsRequest.prototype;

interface EventDivisionRankingsParams extends PageableParams {
  team?: number[];
  rank?: number[];
}

export class TeamRankingsRequestBuilder extends PageableRequestBuilder {
  #teamId?: number;
  #eventIds?: number[];
  #ranks?: number[];
  #seasonIds?: number[];

  public teamId(value: number): TeamRankingsRequestBuilder {
    this.#teamId = value;
    return this;
  }

  public eventIds(...value: number[]): TeamRankingsRequestBuilder {
    this.#eventIds = value;
    return this;
  }

  public ranks(...value: number[]): TeamRankingsRequestBuilder {
    this.#ranks = value;
    return this;
  }

  public seasonIds(...value: number[]): TeamRankingsRequestBuilder {
    this.#seasonIds = value;
    return this;
  }

  public build(): TeamRankingsRequest {
    return new TeamRankingsRequestBuilder.TeamRankingsRequest(this);
  }

  static TeamRankingsRequest = class TeamRankingsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly teamId: number;
    public readonly eventIds?: number[];
    public readonly ranks?: number[];
    public readonly seasonIds?: number[];

    constructor(builder: TeamRankingsRequestBuilder) {
      super(builder);
      if (builder.#teamId === undefined) {
        throw new Error('Missing required property TeamRankingsRequest.teamId');
      }
      this.teamId = builder.#teamId;
      this.eventIds = builder.#eventIds;
      this.ranks = builder.#ranks;
      this.seasonIds = builder.#seasonIds;
    }

    public params(): TeamRankingsParams {
      return {
        ...super.params(),
        event: this.eventIds,
        rank: this.ranks,
        season: this.seasonIds,
      };
    }
  };
}

export type TeamRankingsRequest =
  typeof TeamRankingsRequestBuilder.TeamRankingsRequest.prototype;

interface TeamRankingsParams extends PageableParams {
  event?: number[];
  rank?: number[];
  season?: number[];
}
