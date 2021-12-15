export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Country {
  id: number;
  continent_id: number | null;
  country_id: string;
  name: string;
  shipping_origin_id: number;
  partner_payment: number;
  payment_detail_id: number;
  always_allow_remove_shippable: boolean;
  european_union: boolean;
  country_regions: Region[];
}

export interface CountryOption {
  label: string;
  value: number;
  country_id: string;
}

export interface Event {
  id: number;
  lat: number;
  lng: number;
  date: string;
  sku: string;
  address: string;
  name: string;
  program_name: string;
  program_id: number;
  program_slug: string;
  season_id: number;
  webcast_link: string;
  event_entity_id: number;
}

export enum Grade {
  COLLEGE = 'College',
  HIGH_SCHOOL = 'High School',
  MIDDLE_SCHOOL = 'Middle School',
  ELEMENTARY_SCHOOL = 'Elementary School',
}

export interface Program {
  id: number;
  name: string;
  abbr: string;
  seasons: Season[];
}

export interface Region {
  id: number;
  country_id: number;
  code: string;
  name: string;
}

export interface Season {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

export interface Skill {
  rank: number;
  team: {
    id: number;
    program: string;
    teamRegId: number;
    team: string;
    teamName: string;
    organization: string;
    city: string;
    region: string | null;
    country: string;
    gradeLevel: Grade;
    link: string;
    eventRegion: string;
    affiliations: [];
    eventRegionId: number;
  };
  event: {
    sku: string;
    startDate: string;
    seasonName: string;
  };
  scores: {
    score: number;
    programming: number;
    driver: number;
    combinedStopTime: number;
    maxProgramming: number;
    maxDriver: number;
    progStopTime: number;
    driverStopTime: number;
    progScoredAt: string;
    driverScoredAt: string;
  };
  eligible: boolean;
}

export interface Team {
  team: string;
  city: string;
  name: string;
  team_name: string;
  robot_name: string | null;
  program_name: string;
  program_abbr: string;
  link: string;
}

export interface TeamGroup {
  city: string;
  count: number;
  position: Coordinates;
}
