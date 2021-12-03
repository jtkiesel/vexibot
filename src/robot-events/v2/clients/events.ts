import {Event, EventLevel, EventType} from '.';
import {Client} from '../client';
import {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Events extends Client {
  public findAll(eventsRequest?: EventsRequest): Cursor<Event> {
    return this.getAll('/events', eventsRequest?.params());
  }

  public findAllBySeason(
    seasonEventsRequest: SeasonEventsRequest
  ): Cursor<Event> {
    return this.getAll(
      `/seasons/${seasonEventsRequest.seasonId}/events`,
      seasonEventsRequest.params()
    );
  }

  public findAllByTeam(teamEventsRequest: TeamEventsRequest): Cursor<Event> {
    return this.getAll(
      `/teams/${teamEventsRequest.teamId}/events`,
      teamEventsRequest.params()
    );
  }

  public async findById(id: number): Promise<Event> {
    return this.get(`/events/${id}`);
  }
}

export class EventsRequestBuilder extends PageableRequestBuilder {
  #ids?: number[];
  #skus?: string[];
  #teamIds?: number[];
  #seasonIds?: number[];
  #start?: Date;
  #end?: Date;
  #levels?: EventLevel[];
  #mine?: boolean;
  #types?: EventType[];

  public ids(...value: number[]): EventsRequestBuilder {
    this.#ids = value;
    return this;
  }

  public skus(...value: string[]): EventsRequestBuilder {
    this.#skus = value;
    return this;
  }

  public teamIds(...value: number[]): EventsRequestBuilder {
    this.#teamIds = value;
    return this;
  }

  public seasonIds(...value: number[]): EventsRequestBuilder {
    this.#seasonIds = value;
    return this;
  }

  public start(value: Date): EventsRequestBuilder {
    this.#start = value;
    return this;
  }

  public end(value: Date): EventsRequestBuilder {
    this.#end = value;
    return this;
  }

  public levels(...value: EventLevel[]): EventsRequestBuilder {
    this.#levels = value;
    return this;
  }

  public mine(value: boolean): EventsRequestBuilder {
    this.#mine = value;
    return this;
  }

  public types(...value: EventType[]): EventsRequestBuilder {
    this.#types = value;
    return this;
  }

  public build(): EventsRequest {
    return new EventsRequestBuilder.EventsRequest(this);
  }

  static EventsRequest = class EventsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly ids?: number[];
    public readonly skus?: string[];
    public readonly teamIds?: number[];
    public readonly seasonIds?: number[];
    public readonly start?: Date;
    public readonly end?: Date;
    public readonly levels?: EventLevel[];
    public readonly mine?: boolean;
    public readonly types?: EventType[];

    constructor(builder: EventsRequestBuilder) {
      super(builder);
      this.ids = builder.#ids;
      this.skus = builder.#skus;
      this.teamIds = builder.#teamIds;
      this.seasonIds = builder.#seasonIds;
      this.start = builder.#start;
      this.end = builder.#end;
      this.levels = builder.#levels;
      this.mine = builder.#mine;
      this.types = builder.#types;
    }

    public params(): EventsParams {
      return {
        ...super.params(),
        id: this.ids,
        sku: this.skus,
        team: this.teamIds,
        season: this.seasonIds,
        start: this.start,
        end: this.end,
        level: this.levels,
        myEvents: this.mine,
        eventType: this.types,
      };
    }
  };
}

export type EventsRequest = typeof EventsRequestBuilder.EventsRequest.prototype;

interface EventsParams extends PageableParams {
  id?: number[];
  sku?: string[];
  team?: number[];
  season?: number[];
  start?: Date;
  end?: Date;
  level?: EventLevel[];
  myEvents?: boolean;
  eventType?: EventType[];
}

export class SeasonEventsRequestBuilder extends PageableRequestBuilder {
  #seasonId?: number;
  #skus?: string[];
  #teamIds?: number[];
  #start?: Date;
  #end?: Date;
  #levels?: EventLevel[];

  public seasonId(value: number): SeasonEventsRequestBuilder {
    this.#seasonId = value;
    return this;
  }

  public skus(...value: string[]): SeasonEventsRequestBuilder {
    this.#skus = value;
    return this;
  }

  public teamIds(...value: number[]): SeasonEventsRequestBuilder {
    this.#teamIds = value;
    return this;
  }

  public start(value: Date): SeasonEventsRequestBuilder {
    this.#start = value;
    return this;
  }

  public end(value: Date): SeasonEventsRequestBuilder {
    this.#end = value;
    return this;
  }

  public levels(...value: EventLevel[]): SeasonEventsRequestBuilder {
    this.#levels = value;
    return this;
  }

  public build(): SeasonEventsRequest {
    return new SeasonEventsRequestBuilder.SeasonEventsRequest(this);
  }

  static SeasonEventsRequest = class SeasonEventsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly seasonId: number;
    public readonly skus?: string[];
    public readonly teamIds?: number[];
    public readonly start?: Date;
    public readonly end?: Date;
    public readonly levels?: EventLevel[];

    constructor(builder: SeasonEventsRequestBuilder) {
      super(builder);
      if (builder.#seasonId === undefined) {
        throw new Error(
          'Missing required property SeasonEventsRequest.seasonId'
        );
      }
      this.seasonId = builder.#seasonId;
      this.skus = builder.#skus;
      this.teamIds = builder.#teamIds;
      this.start = builder.#start;
      this.end = builder.#end;
      this.levels = builder.#levels;
    }

    public params(): SeasonEventsParams {
      return {
        ...super.params(),
        sku: this.skus,
        team: this.teamIds,
        start: this.start,
        end: this.end,
        level: this.levels,
      };
    }
  };
}

export type SeasonEventsRequest =
  typeof SeasonEventsRequestBuilder.SeasonEventsRequest.prototype;

interface SeasonEventsParams extends PageableParams {
  sku?: string[];
  team?: number[];
  start?: Date;
  end?: Date;
  level?: EventLevel[];
}

export class TeamEventsRequestBuilder extends PageableRequestBuilder {
  #teamId?: number;
  #skus?: string[];
  #seasonIds?: number[];
  #start?: Date;
  #end?: Date;
  #levels?: EventLevel[];

  public teamId(value: number): TeamEventsRequestBuilder {
    this.#teamId = value;
    return this;
  }

  public skus(...value: string[]): TeamEventsRequestBuilder {
    this.#skus = value;
    return this;
  }

  public seasonIds(...value: number[]): TeamEventsRequestBuilder {
    this.#seasonIds = value;
    return this;
  }

  public start(value: Date): TeamEventsRequestBuilder {
    this.#start = value;
    return this;
  }

  public end(value: Date): TeamEventsRequestBuilder {
    this.#end = value;
    return this;
  }

  public levels(...value: EventLevel[]): TeamEventsRequestBuilder {
    this.#levels = value;
    return this;
  }

  public build(): TeamEventsRequest {
    return new TeamEventsRequestBuilder.TeamEventsRequest(this);
  }

  static TeamEventsRequest = class TeamEventsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly teamId: number;
    public readonly skus?: string[];
    public readonly seasonIds?: number[];
    public readonly start?: Date;
    public readonly end?: Date;
    public readonly levels?: EventLevel[];

    constructor(builder: TeamEventsRequestBuilder) {
      super(builder);
      if (builder.#teamId === undefined) {
        throw new Error('Missing required property TeamEventsRequest.teamId');
      }
      this.teamId = builder.#teamId;
      this.skus = builder.#skus;
      this.seasonIds = builder.#seasonIds;
      this.start = builder.#start;
      this.end = builder.#end;
      this.levels = builder.#levels;
    }

    public params(): TeamEventsParams {
      return {
        ...super.params(),
        sku: this.skus,
        season: this.seasonIds,
        start: this.start,
        end: this.end,
        level: this.levels,
      };
    }
  };
}

export type TeamEventsRequest =
  typeof TeamEventsRequestBuilder.TeamEventsRequest.prototype;

interface TeamEventsParams extends PageableParams {
  sku?: string[];
  season?: number[];
  start?: Date;
  end?: Date;
  level?: EventLevel[];
}
