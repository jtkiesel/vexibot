import {Skill, SkillType} from '.';
import {Client} from '../client';
import {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Skills extends Client {
  public findAllByEvent(eventSkillsRequest: EventSkillsRequest): Cursor<Skill> {
    return this.getAll(
      `/events/${eventSkillsRequest.eventId}/skills`,
      eventSkillsRequest.params()
    );
  }

  public findAllByTeam(teamSkillsRequest: TeamSkillsRequest): Cursor<Skill> {
    return this.getAll(
      `/teams/${teamSkillsRequest.teamId}/skills`,
      teamSkillsRequest.params()
    );
  }
}

export class EventSkillsRequestBuilder extends PageableRequestBuilder {
  #eventId?: number;
  #teamIds?: number[];
  #types?: SkillType[];

  public eventId(value: number): EventSkillsRequestBuilder {
    this.#eventId = value;
    return this;
  }

  public teamIds(...value: number[]): EventSkillsRequestBuilder {
    this.#teamIds = value;
    return this;
  }

  public types(...value: SkillType[]): EventSkillsRequestBuilder {
    this.#types = value;
    return this;
  }

  public build(): EventSkillsRequest {
    return new EventSkillsRequestBuilder.EventSkillsRequest(this);
  }

  static EventSkillsRequest = class EventSkillsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly eventId: number;
    public readonly teamIds?: number[];
    public readonly types?: SkillType[];

    constructor(builder: EventSkillsRequestBuilder) {
      super(builder);
      if (builder.#eventId === undefined) {
        throw new Error('Missing required property EventSkillsRequest.eventId');
      }
      this.eventId = builder.#eventId;
      this.teamIds = builder.#teamIds;
      this.types = builder.#types;
    }

    public params(): EventSkillsParams {
      return {...super.params(), team: this.teamIds, type: this.types};
    }
  };
}

export type EventSkillsRequest =
  typeof EventSkillsRequestBuilder.EventSkillsRequest.prototype;

interface EventSkillsParams extends PageableParams {
  team?: number[];
  type?: SkillType[];
}

export class TeamSkillsRequestBuilder extends PageableRequestBuilder {
  #teamId?: number;
  #eventIds?: number[];
  #types?: SkillType[];
  #seasonIds?: number[];

  public teamId(value: number): TeamSkillsRequestBuilder {
    this.#teamId = value;
    return this;
  }

  public eventIds(...value: number[]): TeamSkillsRequestBuilder {
    this.#eventIds = value;
    return this;
  }

  public types(...value: SkillType[]): TeamSkillsRequestBuilder {
    this.#types = value;
    return this;
  }

  public seasonIds(...value: number[]): TeamSkillsRequestBuilder {
    this.#seasonIds = value;
    return this;
  }

  public build(): TeamSkillsRequest {
    return new TeamSkillsRequestBuilder.TeamSkillsRequest(this);
  }

  static TeamSkillsRequest = class TeamSkillsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly teamId: number;
    public readonly eventIds?: number[];
    public readonly types?: SkillType[];
    public readonly seasonIds?: number[];

    constructor(builder: TeamSkillsRequestBuilder) {
      super(builder);
      if (builder.#teamId === undefined) {
        throw new Error('Missing required property TeamSkillsRequest.teamId');
      }
      this.teamId = builder.#teamId;
      this.eventIds = builder.#eventIds;
      this.types = builder.#types;
      this.seasonIds = builder.#seasonIds;
    }

    public params(): TeamSkillsParams {
      return {
        ...super.params(),
        event: this.eventIds,
        type: this.types,
        season: this.seasonIds,
      };
    }
  };
}

export type TeamSkillsRequest =
  typeof TeamSkillsRequestBuilder.TeamSkillsRequest.prototype;

interface TeamSkillsParams extends PageableParams {
  event?: number[];
  type?: SkillType[];
  season?: number[];
}
