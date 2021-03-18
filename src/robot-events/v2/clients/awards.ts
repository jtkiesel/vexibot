import {Award} from '.';
import {Client} from '../client';
import {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Awards extends Client {
  public findAllByEvent(eventAwardsRequest: EventAwardsRequest): Cursor<Award> {
    return this.getAll(
      `/events/${eventAwardsRequest.eventId}/awards`,
      eventAwardsRequest.params()
    );
  }

  public findAllByTeam(teamAwardsRequest: TeamAwardsRequest): Cursor<Award> {
    return this.getAll(
      `/teams/${teamAwardsRequest.teamId}/awards`,
      teamAwardsRequest.params()
    );
  }
}

export class EventAwardsRequestBuilder extends PageableRequestBuilder {
  #eventId?: number;
  #teamIds?: number[];
  #individuals?: string[];

  public eventId(value: number): EventAwardsRequestBuilder {
    this.#eventId = value;
    return this;
  }

  public teamIds(...value: number[]): EventAwardsRequestBuilder {
    this.#teamIds = value;
    return this;
  }

  public individuals(...value: string[]): EventAwardsRequestBuilder {
    this.#individuals = value;
    return this;
  }

  public build(): EventAwardsRequest {
    return new EventAwardsRequestBuilder.EventAwardsRequest(this);
  }

  static EventAwardsRequest = class EventAwardsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly eventId: number;
    public readonly teamIds?: number[];
    public readonly individuals?: string[];

    constructor(builder: EventAwardsRequestBuilder) {
      super(builder);
      if (builder.#eventId === undefined) {
        throw new Error('Missing required property EventAwardsRequest.eventId');
      }
      this.eventId = builder.#eventId;
      this.teamIds = builder.#teamIds;
      this.individuals = builder.#individuals;
    }

    public params(): EventAwardsParams {
      return {...super.params(), team: this.teamIds, winner: this.individuals};
    }
  };
}

export type EventAwardsRequest =
  typeof EventAwardsRequestBuilder.EventAwardsRequest.prototype;

interface EventAwardsParams extends PageableParams {
  team?: number[];
  winner?: string[];
}

export class TeamAwardsRequestBuilder extends PageableRequestBuilder {
  #teamId?: number;
  #eventIds?: number[];
  #seasonIds?: number[];

  public teamId(value: number): TeamAwardsRequestBuilder {
    this.#teamId = value;
    return this;
  }

  public eventIds(...value: number[]): TeamAwardsRequestBuilder {
    this.#eventIds = value;
    return this;
  }

  public seasonIds(...value: number[]): TeamAwardsRequestBuilder {
    this.#seasonIds = value;
    return this;
  }

  public build(): TeamAwardsRequest {
    return new TeamAwardsRequestBuilder.TeamAwardsRequest(this);
  }

  static TeamAwardsRequest = class TeamAwardsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly teamId: number;
    public readonly eventIds?: number[];
    public readonly seasonIds?: number[];

    constructor(builder: TeamAwardsRequestBuilder) {
      super(builder);
      if (builder.#teamId === undefined) {
        throw new Error('Missing required property TeamAwardsRequest.teamId');
      }
      this.teamId = builder.#teamId;
      this.eventIds = builder.#eventIds;
      this.seasonIds = builder.#seasonIds;
    }

    public params(): TeamAwardsParams {
      return {...super.params(), event: this.eventIds, season: this.seasonIds};
    }
  };
}

export type TeamAwardsRequest =
  typeof TeamAwardsRequestBuilder.TeamAwardsRequest.prototype;

interface TeamAwardsParams extends PageableParams {
  event?: number[];
  season?: number[];
}
