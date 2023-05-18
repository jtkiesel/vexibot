import {ProgramId, RobotEventsClient, type Season} from '@robotevents/client';
import {Grade, type RobotEventsV1Client} from '@robotevents/client/v1';

export class SkillsCache {
  private readonly gradesByProgram = new Map<number, Grade[]>([
    [ProgramId.VRC, [Grade.HighSchool, Grade.MiddleSchool]],
    [ProgramId.VEXU, [Grade.College]],
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
      .findAll(s => s.programIds(ProgramId.VRC, ProgramId.VEXU))
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
    const skills = await this.robotEventsV1Client.skills.findAllBySeason(s =>
      s.seasonId(seasonId).grade(grade)
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
