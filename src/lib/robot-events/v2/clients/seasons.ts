import type {Season} from '.';
import {Client} from '../client';
import type {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Seasons extends Client {
  public findAll(seasonsRequest?: SeasonsRequest): Cursor<Season> {
    return this.getAll('/seasons', seasonsRequest?.params());
  }

  public async findById(id: number): Promise<Season> {
    return this.get(`/seasons/${id}`);
  }
}

export class SeasonsRequestBuilder extends PageableRequestBuilder {
  #ids?: number[];
  #programIds?: number[];
  #teamIds?: number[];
  #start?: Date;
  #end?: Date;
  #active?: boolean;

  public ids(...value: number[]): SeasonsRequestBuilder {
    this.#ids = value;
    return this;
  }

  public programIds(...value: number[]): SeasonsRequestBuilder {
    this.#programIds = value;
    return this;
  }

  public teamIds(...value: number[]): SeasonsRequestBuilder {
    this.#teamIds = value;
    return this;
  }

  public start(value: Date): SeasonsRequestBuilder {
    this.#start = value;
    return this;
  }

  public end(value: Date): SeasonsRequestBuilder {
    this.#end = value;
    return this;
  }

  public active(value: boolean): SeasonsRequestBuilder {
    this.#active = value;
    return this;
  }

  public build(): SeasonsRequest {
    return new SeasonsRequestBuilder.SeasonsRequest(this);
  }

  static SeasonsRequest = class SeasonsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly ids?: number[];
    public readonly programIds?: number[];
    public readonly teamIds?: number[];
    public readonly start?: Date;
    public readonly end?: Date;
    public readonly active?: boolean;

    constructor(builder: SeasonsRequestBuilder) {
      super(builder);
      this.ids = builder.#ids;
      this.programIds = builder.#programIds;
      this.teamIds = builder.#teamIds;
      this.start = builder.#start;
      this.end = builder.#end;
      this.active = builder.#active;
    }

    public params(): SeasonsParams {
      return {
        ...super.params(),
        id: this.ids,
        program: this.programIds,
        team: this.teamIds,
        start: this.start,
        end: this.end,
        active: this.active,
      };
    }
  };
}

export type SeasonsRequest =
  typeof SeasonsRequestBuilder.SeasonsRequest.prototype;

interface SeasonsParams extends PageableParams {
  id?: number[];
  program?: number[];
  team?: number[];
  start?: Date;
  end?: Date;
  active?: boolean;
}
