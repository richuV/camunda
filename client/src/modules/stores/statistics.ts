/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a proprietary license.
 * See the License.txt file for more information. You may not use this file
 * except in compliance with the proprietary license.
 */

import {
  makeObservable,
  observable,
  action,
  IReactionDisposer,
  override,
} from 'mobx';
import {fetchProcessCoreStatistics} from 'modules/api/processInstances';
import {processInstancesStore} from 'modules/stores/processInstances';
import {NetworkReconnectionHandler} from './networkReconnectionHandler';

type StatisticsType = {
  running: number;
  active: number;
  withIncidents: number;
};

type State = StatisticsType & {
  status: 'initial' | 'first-fetch' | 'fetched' | 'error';
};

const DEFAULT_STATE: State = {
  running: 0,
  active: 0,
  withIncidents: 0,
  status: 'initial',
};

class Statistics extends NetworkReconnectionHandler {
  state: State = {...DEFAULT_STATE};
  isPollRequestRunning: boolean = false;
  intervalId: null | ReturnType<typeof setInterval> = null;
  pollingDisposer: null | IReactionDisposer = null;

  constructor() {
    super();
    makeObservable(this, {
      state: observable,
      setError: action,
      setStatistics: action,
      startFirstFetch: action,
      reset: override,
    });
  }

  init() {
    if (this.intervalId === null) {
      this.startPolling();
    }

    processInstancesStore.addCompletedOperationsHandler(() =>
      this.fetchStatistics()
    );
  }

  fetchStatistics = this.retryOnConnectionLost(async () => {
    if (this.state.status === 'initial') {
      this.startFirstFetch();
    }

    try {
      const response = await fetchProcessCoreStatistics();

      if (response.ok) {
        this.setStatistics(await response.json());
      } else {
        this.setError();
      }
    } catch {
      this.setError();
    }
  });

  startFirstFetch = () => {
    this.state.status = 'first-fetch';
  };

  setError = () => {
    this.state.status = 'error';
  };

  setStatistics = ({running, active, withIncidents}: StatisticsType) => {
    this.state.running = running;
    this.state.active = active;
    this.state.withIncidents = withIncidents;
    this.state.status = 'fetched';
  };

  handlePolling = async () => {
    try {
      this.isPollRequestRunning = true;
      const response = await fetchProcessCoreStatistics();

      if (this.intervalId !== null) {
        if (response.ok) {
          this.setStatistics(await response.json());
        } else {
          this.setError();
        }
      }
    } catch {
      if (this.intervalId !== null) {
        this.setError();
      }
    } finally {
      this.isPollRequestRunning = false;
    }
  };

  startPolling = () => {
    this.intervalId = setInterval(() => {
      if (!this.isPollRequestRunning) {
        this.handlePolling();
      }
    }, 5000);
  };

  stopPolling = () => {
    const {intervalId} = this;

    if (intervalId !== null) {
      clearInterval(intervalId);
      this.intervalId = null;
    }
  };

  reset() {
    super.reset();
    this.state = {...DEFAULT_STATE};

    this.stopPolling();
    this.pollingDisposer?.();
  }
}

export const statisticsStore = new Statistics();
