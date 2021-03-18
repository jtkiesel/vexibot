import {Event} from '.';
import {Client} from '../client';

export class Events extends Client {
  public async findAll(eventsRequest: EventsRequest): Promise<Event[]> {
    return this.post('/events', eventsRequest.data());
  }
}

export class EventsRequestBuilder {
  #programIds?: number[];
  #seasonId?: number;
  #countryId?: number;
  #region?: string;

  public programIds(...value: number[]): EventsRequestBuilder {
    this.#programIds = value;
    return this;
  }

  public seasonId(value: number): EventsRequestBuilder {
    this.#seasonId = value;
    return this;
  }

  public location(countryId: number, region?: string): EventsRequestBuilder {
    this.#countryId = countryId;
    this.#region = region;
    return this;
  }

  public build(): EventsRequest {
    return new EventsRequestBuilder.EventsRequest(this);
  }

  static EventsRequest = class EventsRequest {
    public readonly programIds: number[];
    public readonly seasonId?: number;
    public readonly countryId?: number;
    public readonly region?: string;

    constructor(builder: EventsRequestBuilder) {
      if (!builder.#programIds?.length) {
        throw new Error('Missing required property EventsRequest.programIds');
      }
      this.programIds = builder.#programIds;
      this.seasonId = builder.#seasonId;
      this.countryId = builder.#countryId;
      this.region = builder.#region;
    }

    public data(): EventsData {
      return {
        programs: this.programIds,
        season_id: this.seasonId,
        country: this.countryId,
        region: this.region,
        when: this.seasonId !== undefined ? When.PAST : undefined,
      };
    }
  };
}

export type EventsRequest = typeof EventsRequestBuilder.EventsRequest.prototype;

interface EventsData {
  programs: number[];
  season_id?: number;
  country?: number;
  region?: string;
  when?: When;
}

enum When {
  FUTURE = 'future',
  PAST = 'past',
}
