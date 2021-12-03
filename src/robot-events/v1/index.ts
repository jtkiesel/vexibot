import axios from 'axios';
import axiosRateLimit from 'axios-rate-limit';
import {Countries} from './clients/countries';
import {Events} from './clients/events';
import {Programs} from './clients/programs';
import {Regions} from './clients/regions';
import {Skills} from './clients/skills';
import {Teams} from './clients/teams';

export * from './clients';

export class RobotEventsV1Client {
  public readonly countries;
  public readonly events;
  public readonly programs;
  public readonly regions;
  public readonly skills;
  public readonly teams;

  constructor(options: RobotEventsV1ClientOptions) {
    const {url} = options;
    const axiosInstance = axios.create({
      baseURL: url ?? 'https://robotevents.com/api',
    });
    axiosRateLimit(axiosInstance, {
      maxRequests: 1_000,
      perMilliseconds: 60_000,
    });
    this.countries = new Countries(axiosInstance);
    this.events = new Events(axiosInstance);
    this.programs = new Programs(axiosInstance);
    this.regions = new Regions(axiosInstance);
    this.skills = new Skills(axiosInstance);
    this.teams = new Teams(axiosInstance);
  }
}

export interface RobotEventsV1ClientOptions {
  url?: string;
}
