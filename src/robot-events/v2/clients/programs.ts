import {Program} from '.';
import {Client} from '../client';
import {Cursor} from '../cursor';
import {PageableParams, PageableRequestBuilder} from '../pageable';

export class Programs extends Client {
  public findAll(programsRequest?: ProgramsRequest): Cursor<Program> {
    return this.getAll('/programs', programsRequest?.params());
  }

  public async findById(id: number): Promise<Program> {
    return this.get(`/programs/${id}`);
  }
}

export class ProgramsRequestBuilder extends PageableRequestBuilder {
  #ids?: number[];

  public ids(...value: number[]): ProgramsRequestBuilder {
    this.#ids = value;
    return this;
  }

  public build(): ProgramsRequest {
    return new ProgramsRequestBuilder.ProgramsRequest(this);
  }

  static ProgramsRequest = class ProgramsRequest extends PageableRequestBuilder.PageableRequest {
    public readonly ids?: number[];

    constructor(builder: ProgramsRequestBuilder) {
      super(builder);
      this.ids = builder.#ids;
    }

    public params(): ProgramsParams {
      return {...super.params(), id: this.ids};
    }
  };
}

export type ProgramsRequest =
  typeof ProgramsRequestBuilder.ProgramsRequest.prototype;

interface ProgramsParams extends PageableParams {
  id?: number[];
}
