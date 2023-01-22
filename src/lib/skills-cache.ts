import {RobotEventsClient, Season, SeasonsRequestBuilder} from './robot-events';
import {Grade, RobotEventsV1Client} from './robot-events/v1';
import {SeasonSkillsRequestBuilder} from './robot-events/v1/clients/skills';

export class SkillsCache {
  private readonly gradesByProgram = new Map<number, Grade[]>([
    [1, [Grade.HIGH_SCHOOL, Grade.MIDDLE_SCHOOL]],
    [4, [Grade.COLLEGE]],
  ]);
  private readonly skillByTeamIdByGradeBySeasonId = new Map<
    number,
    Map<Grade, Map<number, Skill>>
  >();

  public constructor(
    private readonly robotEventsClient: RobotEventsClient,
    private readonly robotEventsV1Client: RobotEventsV1Client
  ) {}

  public async init() {
    const seasons = await this.robotEventsClient.seasons
      .findAll(new SeasonsRequestBuilder().programIds(1, 4).build())
      .toArray();
    await this.update(seasons);
  }

  public async update(seasons: Season[]) {
    for (const season of seasons) {
      const grades = this.gradesByProgram.get(season.program.id) ?? [];
      for (const grade of grades) {
        await this.updateSeasonGrade(season.id, grade);
      }
    }
  }

  private async updateSeasonGrade(seasonId: number, grade: Grade) {
    const skillByTeamId = new Map<number, Skill>();
    const skills = await this.robotEventsV1Client.skills.findAllBySeason(
      new SeasonSkillsRequestBuilder().seasonId(seasonId).grade(grade).build()
    );
    skills.forEach(({team, rank, scores}) =>
      skillByTeamId.set(team.id, {
        rank: rank,
        scores: {
          score: scores.score,
          programming: scores.programming,
          driver: scores.driver,
          maxProgramming: scores.maxProgramming,
          maxDriver: scores.maxDriver,
        },
      })
    );
    let skillByTeamIdByGrade =
      this.skillByTeamIdByGradeBySeasonId.get(seasonId);
    if (!skillByTeamIdByGrade) {
      skillByTeamIdByGrade = new Map();
      this.skillByTeamIdByGradeBySeasonId.set(seasonId, skillByTeamIdByGrade);
    }
    skillByTeamIdByGrade.set(grade, skillByTeamId);
  }

  public get(seasonId: number, grade: Grade, teamId: number) {
    return this.skillByTeamIdByGradeBySeasonId
      .get(seasonId)
      ?.get(grade)
      ?.get(teamId);
  }
}

export interface Skill {
  readonly rank: number;
  readonly scores: {
    readonly score: number;
    readonly programming: number;
    readonly driver: number;
    readonly maxProgramming: number;
    readonly maxDriver: number;
  };
}
