export * from './awards';
export * from './events';
export * from './matches';
export * from './programs';
export * from './rankings';
export * from './seasons';
export * from './skills';
export * from './teams';

export interface Alliance {
  color: AllianceColor;
  score: number;
  teams: AllianceTeam[];
}

export enum AllianceColor {
  RED = 'red',
  BLUE = 'blue',
}

export interface AllianceTeam {
  team: IdInfo;
  sitting: boolean;
}

export interface Award {
  id: number;
  event: IdInfo;
  order: number;
  title: string;
  qualifications: string[];
  designation: AwardDesignation | null;
  classification: AwardClassification | null;
  teamWinners: TeamAwardWinner[];
  individualWinners: string[];
}

export enum AwardClassification {
  CHAMPION = 'champion',
  FINALIST = 'finalist',
  SEMIFINALIST = 'semifinalist',
  QUARTERFINALIST = 'quarterfinalist',
}

export enum AwardDesignation {
  TOURNAMENT = 'tournament',
  DIVISION = 'division',
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Division {
  id: number;
  name: string;
  order: number;
}

export interface Event {
  id: number;
  sku: string;
  name: string;
  start?: Date;
  end?: Date;
  season: IdInfo;
  program: IdInfo;
  location: Location;
  divisions?: Division[];
  level?: EventLevel;
  ongoing?: boolean;
  awards_finalized?: boolean;
  event_type?: EventType;
}

export enum EventLevel {
  WORLD = 'World',
  NATIONAL = 'National',
  REGIONAL = 'Regional',
  STATE = 'State',
  SIGNATURE = 'Signature',
  OTHER = 'Other',
}

export enum EventType {
  TOURNAMENT = 'tournament',
  LEAGUE = 'league',
  WORKSHOP = 'workshop',
  VIRTUAL = 'virtual',
}

export enum Grade {
  COLLEGE = 'College',
  HIGH_SCHOOL = 'High School',
  MIDDLE_SCHOOL = 'Middle School',
  ELEMENTARY_SCHOOL = 'Elementary School',
}

export interface IdInfo {
  id: number;
  name: string;
  code: string;
}

export interface Location {
  venue: string | null;
  address_1: string;
  address_2: string | null;
  city: string;
  region: string | null;
  postcode: string;
  country: string;
  coordinates: Coordinates;
}

export interface Match {
  id: number;
  event: IdInfo;
  division: IdInfo;
  round: number;
  instance: number;
  matchnum: number;
  scheduled?: Date;
  started?: Date;
  field?: string;
  scored: boolean;
  name: string;
  alliances: Alliance[];
}

export interface Paginated<T> {
  meta: PageMeta;
  data: T[];
}

export interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  from: number;
  to: number;
  total: number;
  first_page_url: string;
  last_page_url: string;
  prev_page_url: string;
  next_page_url: string;
  path: string;
}

export interface Program {
  id: number;
  abbr: string;
  name: string;
}

export interface Ranking {
  id: number;
  event: IdInfo;
  division: IdInfo;
  rank: number;
  team: IdInfo;
  wins: number;
  losses: number;
  ties: number;
  wp: number;
  ap: number;
  sp: number;
  high_score?: number;
  average_points?: number;
  total_points?: number;
}

export interface Season {
  id: number;
  name: string;
  program: IdInfo;
  start: Date;
  end: Date;
  years_start?: number;
  years_end?: number;
}

export interface Skill {
  id: number;
  event: IdInfo;
  team: IdInfo;
  type: SkillType;
  season: IdInfo;
  division: IdInfo;
  rank: number;
  score: number;
  attempts: number;
}

export enum SkillType {
  DRIVER = 'driver',
  PROGRAMMING = 'programming',
}

export interface Team {
  id: number;
  number: string;
  team_name: string;
  robot_name: string | null;
  organization: string | null;
  location: Location;
  registered: boolean;
  program: IdInfo;
  grade: Grade;
}

export interface TeamAwardWinner {
  division: IdInfo;
  team: IdInfo;
}
