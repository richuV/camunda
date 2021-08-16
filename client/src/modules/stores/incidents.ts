/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a commercial license.
 * You may not use this file except in compliance with the commercial license.
 */

import {
  makeObservable,
  computed,
  action,
  observable,
  autorun,
  IReactionDisposer,
  override,
} from 'mobx';
import {fetchProcessInstanceIncidents} from 'modules/api/instances';
import {currentInstanceStore} from 'modules/stores/currentInstance';
import {singleInstanceDiagramStore} from 'modules/stores/singleInstanceDiagram';
import {NetworkReconnectionHandler} from './networkReconnectionHandler';

type FlowNode = {
  id: string;
  count: number;
};
type ErrorType = {
  id: string;
  name: string;
  count: number;
};
type Incident = {
  id: string;
  errorType: string;
  errorMessage: string;
  flowNodeId: string;
  flowNodeInstanceId: string;
  jobId: string;
  creationTime: string;
  hasActiveOperation: boolean;
  lastOperation: null | unknown;
  rootCauseInstance: null | {
    instanceId: string;
    processDefinitionId: string;
    processDefinitionName: string;
  };
};
type Response = {
  count: number;
  incidents: Incident[];
  errorTypes: ErrorType[];
  flowNodes: FlowNode[];
};

type State = {
  response: null | Response;
  isLoaded: boolean;
};

const DEFAULT_STATE: State = {
  response: null,
  isLoaded: false,
};

class Incidents extends NetworkReconnectionHandler {
  state: State = {...DEFAULT_STATE};
  intervalId: null | ReturnType<typeof setInterval> = null;
  disposer: null | IReactionDisposer = null;

  constructor() {
    super();
    makeObservable(this, {
      state: observable,
      setIncidents: action,
      reset: override,
      incidents: computed,
      flowNodes: computed,
      errorTypes: computed,
      incidentsCount: computed,
    });
  }

  init() {
    this.disposer = autorun(() => {
      if (currentInstanceStore.state.instance?.state === 'INCIDENT') {
        if (this.intervalId === null) {
          this.fetchIncidents(currentInstanceStore.state.instance.id);
          this.startPolling(currentInstanceStore.state.instance.id);
        }
      } else {
        this.stopPolling();
      }
    });
  }

  startPolling = async (id: string) => {
    this.intervalId = setInterval(() => {
      this.handlePolling(id);
    }, 5000);
  };

  fetchIncidents = this.retryOnConnectionLost(async (id: string) => {
    const response = await fetchProcessInstanceIncidents(id);
    if (response.ok) {
      this.setIncidents(await response.json());
    }
  });

  stopPolling = () => {
    const {intervalId} = this;

    if (intervalId !== null) {
      clearInterval(intervalId);
      this.intervalId = null;
    }
  };

  handlePolling = async (id: any) => {
    const response = await fetchProcessInstanceIncidents(id);
    if (this.intervalId !== null && response.ok) {
      this.setIncidents(await response.json());
    }
  };

  setIncidents = (response: any) => {
    this.state.response = response;
    this.state.isLoaded = true;
  };

  reset() {
    super.reset();
    this.stopPolling();
    this.state = {...DEFAULT_STATE};
    this.disposer?.();
  }

  getIncidentType = (flowNodeInstanceId: string) => {
    const incident = this.incidents.find(
      (incident) => incident.flowNodeInstanceId === flowNodeInstanceId
    );

    return incident?.errorType;
  };

  get incidents() {
    if (this.state.response === null) {
      return [];
    }
    return this.state.response.incidents.map((incident) => ({
      ...incident,
      flowNodeName: singleInstanceDiagramStore.getFlowNodeName(
        incident.flowNodeId
      ),
    }));
  }

  get flowNodes() {
    if (this.state.response === null) {
      return [];
    }

    return this.state.response.flowNodes.map((flowNode) => ({
      ...flowNode,
      name: singleInstanceDiagramStore.getFlowNodeName(flowNode.id),
    }));
  }

  get errorTypes() {
    return this.state.response?.errorTypes || [];
  }

  get incidentsCount() {
    return this.state.response === null ? 0 : this.state.response.count;
  }
}

export const incidentsStore = new Incidents();
export type {Incident};
