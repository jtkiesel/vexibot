import type {Grade, Team} from '.';
import {Client} from '../client';
import type {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Teams extends Client {
  public findAll(teamsRequest?: TeamsRequest): Cursor<Team> {
    return this.getAll('/teams', teamsRequest?.params());
  }

  public findAllByEvent(eventTeamsRequest: EventTeamsRequest): Cursor<Team> {
    return this.getAll(
      `/events/${eventTeamsRequest.eventId}/teams`,
      eventTeamsRequest.params()
    );
  }

  public async findById(id: number): Promise<Team> {
    return this.get(`/teams/${id}`);
  }
}

export class TeamsRequestBuilder extends PageableRequestBuilder {
  #ids?: number[];
  #numbers?: string[];
  #eventIds?: number[];
  #registered?: boolean;
  #programIds?: number[];
  #grades?: Grade[];
  #countries?: string[];
  #mine?: boolean;

  public ids(...value: number[]): TeamsRequestBuilder {
    this.#ids = value;
    return this;
  }

  public numbers(...value: string[]): TeamsRequestBuilder {
    this.#numbers = value;
    return this;
  }

  public eventIds(...value: number[]): TeamsRequestBuilder {
    this.#eventIds = value;
    return this;
  }

  public registered(value: boolean): TeamsRequestBuilder {
    this.#registered = value;
    return this;
  }

  public programIds(...value: number[]): TeamsRequestBuilder {
    this.#programIds = value;
    return this;
  }

  public grades(...value: Grade[]): TeamsRequestBuilder {
    this.#grades = value;
    return this;
  }

  public countries(...value: string[]): TeamsRequestBuilder {
    this.#countries = value;
    return this;
  }

  public mine(value: boolean): TeamsRequestBuilder {
    this.#mine = value;
    return this;
  }

  public build(): TeamsRequest {
    return new TeamsRequestBuilder.TeamsRequest(this);
  }

  static TeamsRequest = class TeamsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly ids?: number[];
    public readonly numbers?: string[];
    public readonly eventIds?: number[];
    public readonly registered?: boolean;
    public readonly programIds?: number[];
    public readonly grades?: Grade[];
    public readonly countries?: string[];
    public readonly mine?: boolean;

    constructor(builder: TeamsRequestBuilder) {
      super(builder);
      this.ids = builder.#ids;
      this.numbers = builder.#numbers;
      this.eventIds = builder.#eventIds;
      this.registered = builder.#registered;
      this.programIds = builder.#programIds;
      this.grades = builder.#grades;
      this.countries = builder.#countries;
      this.mine = builder.#mine;
    }

    public params(): TeamsParams {
      return {
        ...super.params(),
        id: this.ids,
        number: this.numbers,
        event: this.eventIds,
        registered: this.registered,
        program: this.programIds,
        grade: this.grades,
        country: this.countries,
        myTeams: this.mine,
      };
    }
  };
}

export type TeamsRequest = typeof TeamsRequestBuilder.TeamsRequest.prototype;

interface TeamsParams extends PageableParams {
  id?: number[];
  number?: string[];
  event?: number[];
  registered?: boolean;
  program?: number[];
  grade?: Grade[];
  country?: string[];
  myTeams?: boolean;
}

export class EventTeamsRequestBuilder extends PageableRequestBuilder {
  #eventId?: number;
  #numbers?: string[];
  #registered?: boolean;
  #grades?: Grade[];
  #countries?: string[];
  #mine?: boolean;

  public numbers(...value: string[]): EventTeamsRequestBuilder {
    this.#numbers = value;
    return this;
  }

  public registered(value: boolean): EventTeamsRequestBuilder {
    this.#registered = value;
    return this;
  }

  public grades(...value: Grade[]): EventTeamsRequestBuilder {
    this.#grades = value;
    return this;
  }

  public countries(...value: string[]): EventTeamsRequestBuilder {
    this.#countries = value;
    return this;
  }

  public mine(value: boolean): EventTeamsRequestBuilder {
    this.#mine = value;
    return this;
  }

  public build(): EventTeamsRequest {
    return new EventTeamsRequestBuilder.EventTeamsRequest(this);
  }

  static EventTeamsRequest = class EventTeamsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly eventId: number;
    public readonly numbers?: string[];
    public readonly registered?: boolean;
    public readonly grades?: Grade[];
    public readonly countries?: string[];
    public readonly mine?: boolean;

    constructor(builder: EventTeamsRequestBuilder) {
      super(builder);
      if (builder.#eventId === undefined) {
        throw new Error('Missing required property EventTeamsRequest.eventId');
      }
      this.eventId = builder.#eventId;
      this.numbers = builder.#numbers;
      this.registered = builder.#registered;
      this.grades = builder.#grades;
      this.countries = builder.#countries;
      this.mine = builder.#mine;
    }

    public params(): EventTeamsParams {
      return {
        ...super.params(),
        number: this.numbers,
        registered: this.registered,
        grade: this.grades,
        country: this.countries,
        myTeams: this.mine,
      };
    }
  };
}

export type EventTeamsRequest =
  typeof EventTeamsRequestBuilder.EventTeamsRequest.prototype;

interface EventTeamsParams extends PageableParams {
  number?: string[];
  registered?: boolean;
  grade?: Grade[];
  country?: string[];
  myTeams?: boolean;
}
