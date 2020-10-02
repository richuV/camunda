/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a commercial license.
 * You may not use this file except in compliance with the commercial license.
 */

import React from 'react';

import {formatDate} from 'modules/utils/date';
import {getWorkflowName} from 'modules/utils/instance';
import {Operations} from 'modules/components/Operations';
import Skeleton from './Skeleton';
import {observer} from 'mobx-react';
import {currentInstance} from 'modules/stores/currentInstance';

import * as Styled from './styled';
import {variables} from 'modules/stores/variables';

const InstanceHeader = observer(() => {
  const {instance} = currentInstance.state;

  return (
    <Styled.SplitPaneHeader>
      {!instance ? (
        <Skeleton />
      ) : (
        <Styled.Table data-test="instance-header">
          <tbody>
            <Styled.Tr>
              <Styled.Td>
                <Styled.StateIcon state={instance.state} />
                {getWorkflowName(instance)}
              </Styled.Td>
              <Styled.Td>{instance.id}</Styled.Td>
              <Styled.Td>{`Version ${instance.workflowVersion}`}</Styled.Td>
              <Styled.Td data-test="start-date">
                {formatDate(instance.startDate)}
              </Styled.Td>
              <Styled.Td data-test="end-date">
                {formatDate(instance.endDate)}
              </Styled.Td>
              <Styled.Td>
                <Styled.OperationsWrapper>
                  <Operations
                    instance={instance}
                    forceSpinner={
                      variables.hasActiveOperation ||
                      instance?.hasActiveOperation
                    }
                  />
                </Styled.OperationsWrapper>
              </Styled.Td>
            </Styled.Tr>
          </tbody>
        </Styled.Table>
      )}
    </Styled.SplitPaneHeader>
  );
});

export {InstanceHeader};
