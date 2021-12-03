import axios from 'axios';
import axiosRateLimit from 'axios-rate-limit';
import {Awards} from './clients/awards';
import {Events} from './clients/events';
import {Matches} from './clients/matches';
import {Programs} from './clients/programs';
import {Rankings} from './clients/rankings';
import {Seasons} from './clients/seasons';
import {Skills} from './clients/skills';
import {Teams} from './clients/teams';

export * from './clients';

export class RobotEventsClient {
  public readonly awards;
  public readonly events;
  public readonly matches;
  public readonly programs;
  public readonly rankings;
  public readonly seasons;
  public readonly skills;
  public readonly teams;

  constructor(options: RobotEventsClientOptions) {
    const {url, token} = options;
    const axiosInstance = axios.create({
      baseURL: url ?? 'https://robotevents.com/api/v2',
      headers: {Authorization: `Bearer ${token}`},
    });
    axiosRateLimit(axiosInstance, {
      maxRequests: 1_000,
      perMilliseconds: 60_000,
    });
    this.awards = new Awards(axiosInstance);
    this.events = new Events(axiosInstance);
    this.matches = new Matches(axiosInstance);
    this.programs = new Programs(axiosInstance);
    this.rankings = new Rankings(axiosInstance);
    this.seasons = new Seasons(axiosInstance);
    this.skills = new Skills(axiosInstance);
    this.teams = new Teams(axiosInstance);
  }
}

export interface RobotEventsClientOptions {
  url?: string;
  token: string;
}
