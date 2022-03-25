import axios from 'axios';
import type {Grade, Skill} from '.';
import {Client} from '../client';

export class Skills extends Client {
  public async findAllBySeason(
    seasonSkillsRequest: SeasonSkillsRequest
  ): Promise<Skill[]> {
    try {
      return await this.get(
        `/seasons/${seasonSkillsRequest.seasonId}/skills`,
        seasonSkillsRequest.params()
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }
}

export class SeasonSkillsRequestBuilder {
  #seasonId?: number;
  #postseason?: number;
  #grade?: Grade;

  public seasonId(value: number): SeasonSkillsRequestBuilder {
    this.#seasonId = value;
    return this;
  }

  public postseason(value: number): SeasonSkillsRequestBuilder {
    this.#postseason = value;
    return this;
  }

  public grade(value: Grade): SeasonSkillsRequestBuilder {
    this.#grade = value;
    return this;
  }

  public build(): SeasonSkillsRequest {
    return new SeasonSkillsRequestBuilder.SeasonSkillsRequest(this);
  }

  static SeasonSkillsRequest = class SeasonSkillsRequest {
    public readonly seasonId: number;
    public readonly postseason?: number;
    public readonly grade?: Grade;

    constructor(builder: SeasonSkillsRequestBuilder) {
      if (builder.#seasonId === undefined) {
        throw new Error(
          'Missing required property SeasonSkillsRequest.seasonId'
        );
      }
      this.seasonId = builder.#seasonId;
      this.postseason = builder.#postseason;
      this.grade = builder.#grade;
    }

    public params(): SeasonSkillsParams {
      return {
        post_season: this.postseason,
        grade_level: this.grade,
      };
    }
  };
}

export type SeasonSkillsRequest =
  typeof SeasonSkillsRequestBuilder.SeasonSkillsRequest.prototype;

interface SeasonSkillsParams {
  post_season?: number;
  grade_level?: Grade;
}
