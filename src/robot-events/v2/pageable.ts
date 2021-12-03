export abstract class PageableRequestBuilder {
  #page?: number;
  #perPage?: number;

  public page(page: number): PageableRequestBuilder {
    this.#page = page;
    return this;
  }

  public perPage(perPage: number): PageableRequestBuilder {
    this.#perPage = perPage;
    return this;
  }

  public abstract build(): PageableRequest;

  static PageableRequest = class PageableQuery {
    public readonly page?: number;
    public readonly perPage?: number;

    constructor(builder: PageableRequestBuilder) {
      this.page = builder.#page;
      this.perPage = builder.#perPage;
    }

    public params(): PageableParams {
      return {page: this.page, per_page: this.perPage};
    }
  };
}

type PageableRequest = typeof PageableRequestBuilder.PageableRequest.prototype;

export interface PageableParams {
  page?: number;
  per_page?: number;
}
