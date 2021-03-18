import {Match} from '.';
import {Client} from '../client';
import {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Matches extends Client {
  public findAllByEventDivision(
    eventDivisionMatchesRequest: EventDivisionMatchesRequest
  ): Cursor<Match> {
    return this.getAll(
      `/events/${eventDivisionMatchesRequest.eventId}/divisions/${eventDivisionMatchesRequest.divisionId}/matches`,
      eventDivisionMatchesRequest.params()
    );
  }

  public findAllByTeam(teamMatchesRequest: TeamMatchesRequest): Cursor<Match> {
    return this.getAll(
      `/teams/${teamMatchesRequest.teamId}/matches`,
      teamMatchesRequest.params()
    );
  }
}

export class EventDivisionMatchesRequestBuilder extends PageableRequestBuilder {
  #eventId?: number;
  #divisionId?: number;
  #teamIds?: number[];
  #rounds?: number[];
  #instances?: number[];
  #numbers?: number[];

  public eventId(value: number): EventDivisionMatchesRequestBuilder {
    this.#eventId = value;
    return this;
  }

  public divisionId(value: number): EventDivisionMatchesRequestBuilder {
    this.#divisionId = value;
    return this;
  }

  public teamIds(...value: number[]): EventDivisionMatchesRequestBuilder {
    this.#teamIds = value;
    return this;
  }

  public rounds(...value: number[]): EventDivisionMatchesRequestBuilder {
    this.#rounds = value;
    return this;
  }

  public instances(...value: number[]): EventDivisionMatchesRequestBuilder {
    this.#instances = value;
    return this;
  }

  public numbers(...value: number[]): EventDivisionMatchesRequestBuilder {
    this.#numbers = value;
    return this;
  }

  public build(): EventDivisionMatchesRequest {
    return new EventDivisionMatchesRequestBuilder.EventDivisionMatchesRequest(
      this
    );
  }

  static EventDivisionMatchesRequest = class EventDivisionMatchesRequest extends PageableRequestBuilder.PageableRequest {
    public readonly eventId: number;
    public readonly divisionId: number;
    public readonly teamIds?: number[];
    public readonly rounds?: number[];
    public readonly instances?: number[];
    public readonly numbers?: number[];

    constructor(builder: EventDivisionMatchesRequestBuilder) {
      super(builder);
      if (builder.#eventId === undefined) {
        throw new Error(
          'Missing required property EventDivisionMatchesRequest.eventId'
        );
      }
      if (builder.#divisionId === undefined) {
        throw new Error(
          'Missing required property EventDivisionMatchesRequest.divisionId'
        );
      }
      this.eventId = builder.#eventId;
      this.divisionId = builder.#divisionId;
      this.teamIds = builder.#teamIds;
      this.rounds = builder.#rounds;
      this.instances = builder.#instances;
      this.numbers = builder.#numbers;
    }

    public params(): EventDivisionMatchesParams {
      return {
        ...super.params(),
        team: this.teamIds,
        round: this.rounds,
        instance: this.instances,
        matchnum: this.numbers,
      };
    }
  };
}

export type EventDivisionMatchesRequest =
  typeof EventDivisionMatchesRequestBuilder.EventDivisionMatchesRequest.prototype;

interface EventDivisionMatchesParams extends PageableParams {
  team?: number[];
  round?: number[];
  instance?: number[];
  matchnum?: number[];
}

export class TeamMatchesRequestBuilder extends PageableRequestBuilder {
  #teamId?: number;
  #eventIds?: number[];
  #seasonIds?: number[];
  #rounds?: number[];
  #instances?: number[];
  #numbers?: number[];

  public teamId(value: number): TeamMatchesRequestBuilder {
    this.#teamId = value;
    return this;
  }

  public eventIds(...value: number[]): TeamMatchesRequestBuilder {
    this.#eventIds = value;
    return this;
  }

  public seasonIds(...value: number[]): TeamMatchesRequestBuilder {
    this.#seasonIds = value;
    return this;
  }

  public rounds(...value: number[]): TeamMatchesRequestBuilder {
    this.#rounds = value;
    return this;
  }

  public instances(...value: number[]): TeamMatchesRequestBuilder {
    this.#instances = value;
    return this;
  }

  public numbers(...value: number[]): TeamMatchesRequestBuilder {
    this.#numbers = value;
    return this;
  }

  public build(): TeamMatchesRequest {
    return new TeamMatchesRequestBuilder.TeamMatchesRequest(this);
  }

  static TeamMatchesRequest = class TeamMatchesRequest extends PageableRequestBuilder.PageableRequest {
    public readonly teamId: number;
    public readonly eventIds?: number[];
    public readonly seasonIds?: number[];
    public readonly rounds?: number[];
    public readonly instances?: number[];
    public readonly numbers?: number[];

    constructor(builder: TeamMatchesRequestBuilder) {
      super(builder);
      if (builder.#teamId === undefined) {
        throw new Error('Missing required property TeamMatchesRequest.teamId');
      }
      this.teamId = builder.#teamId;
      this.eventIds = builder.#eventIds;
      this.seasonIds = builder.#seasonIds;
      this.rounds = builder.#rounds;
      this.instances = builder.#instances;
      this.numbers = builder.#numbers;
    }

    public params(): TeamMatchesParams {
      return {
        ...super.params(),
        event: this.eventIds,
        season: this.seasonIds,
        round: this.rounds,
        instance: this.instances,
        matchnum: this.numbers,
      };
    }
  };
}

export type TeamMatchesRequest =
  typeof TeamMatchesRequestBuilder.TeamMatchesRequest.prototype;

interface TeamMatchesParams extends PageableParams {
  event?: number[];
  season?: number[];
  round?: number[];
  instance?: number[];
  matchnum?: number[];
}
