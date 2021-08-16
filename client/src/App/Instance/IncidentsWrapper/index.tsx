/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a commercial license.
 * You may not use this file except in compliance with the commercial license.
 */

import React, {useState, useEffect, useMemo} from 'react';

import {IncidentsBanner} from './IncidentsBanner';
import IncidentsOverlay from './IncidentsOverlay';
import {IncidentsTable} from './IncidentsTable';
import {IncidentsFilter} from './IncidentsFilter';
import {Incident, incidentsStore} from 'modules/stores/incidents';
import {observer} from 'mobx-react';

import * as Styled from './styled';

type Props = {
  expandState?: 'DEFAULT' | 'EXPANDED' | 'COLLAPSED';
  isOpen: boolean;
  onClick?: () => void;
};

const IncidentsWrapper: React.FC<Props> = observer(function (props) {
  const {expandState, isOpen, onClick} = props;
  const {incidents} = incidentsStore;

  const [selectedFlowNodes, setSelectedFlowNodes] = useState<string[]>([]);
  const [selectedErrorTypes, setSelectedErrorTypes] = useState<string[]>([]);
  const [isInTransition, setIsInTransition] = useState(false);

  useEffect(() => {
    incidentsStore.init();

    return () => {
      incidentsStore.reset();
    };
  }, []);

  function handleToggle() {
    !isInTransition && onClick?.();
  }

  function handleSelection(
    selectedFilters: string[],
    updateFilterState: (filterList: string[]) => void,
    id: string
  ) {
    let index = selectedFilters.findIndex((item) => item === id);
    let list = [...selectedFilters];
    if (index === -1) {
      list.push(id);
    } else {
      list.splice(index, 1);
    }
    updateFilterState(list);
  }

  const handleErrorTypeSelect = (errorId: string) => {
    handleSelection(selectedErrorTypes, setSelectedErrorTypes, errorId);
  };

  const handleFlowNodeSelect = (flowNodeId: string) => {
    handleSelection(selectedFlowNodes, setSelectedFlowNodes, flowNodeId);
  };

  function clearAll() {
    setSelectedErrorTypes([]);
    setSelectedFlowNodes([]);
  }

  const filteredIncidents = useMemo(() => {
    const hasSelectedFlowNodes = Boolean(selectedFlowNodes.length);
    const hasSelectedErrorTypes = Boolean(selectedErrorTypes.length);

    if (!hasSelectedFlowNodes && !hasSelectedErrorTypes) {
      return incidents;
    }

    const isSelected = (incident: Incident) => {
      if (hasSelectedErrorTypes && hasSelectedFlowNodes) {
        return (
          selectedFlowNodes.includes(incident.flowNodeId) &&
          selectedErrorTypes.includes(incident.errorType)
        );
      }
      if (hasSelectedErrorTypes) {
        return selectedErrorTypes.includes(incident.errorType);
      }

      if (hasSelectedFlowNodes) {
        return selectedFlowNodes.includes(incident.flowNodeId);
      }
    };

    return [...incidents].filter((incident) => isSelected(incident));
  }, [incidents, selectedErrorTypes, selectedFlowNodes]);

  if (incidentsStore.incidentsCount === 0) {
    return null;
  }

  return (
    <>
      <IncidentsBanner
        onClick={handleToggle}
        isOpen={isOpen}
        expandState={expandState}
      />
      <Styled.Transition
        in={isOpen}
        onEnter={() => setIsInTransition(true)}
        onEntered={() => setIsInTransition(false)}
        onExit={() => setIsInTransition(true)}
        onExited={() => setIsInTransition(false)}
        mountOnEnter
        unmountOnExit
        timeout={400}
      >
        <IncidentsOverlay>
          <IncidentsFilter
            selectedFlowNodes={selectedFlowNodes}
            selectedErrorTypes={selectedErrorTypes}
            onFlowNodeSelect={handleFlowNodeSelect}
            onErrorTypeSelect={handleErrorTypeSelect}
            onClearAll={clearAll}
          />
          <IncidentsTable incidents={filteredIncidents} />
        </IncidentsOverlay>
      </Styled.Transition>
    </>
  );
});

export {IncidentsWrapper};
