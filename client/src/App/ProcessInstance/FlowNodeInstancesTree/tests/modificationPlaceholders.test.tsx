/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a proprietary license.
 * See the License.txt file for more information. You may not use this file
 * except in compliance with the proprietary license.
 */

import {rest} from 'msw';
import {createRef} from 'react';
import {render, screen, waitFor} from 'modules/testing-library';
import {mockServer} from 'modules/mock-server/node';
import {flowNodeInstanceStore} from 'modules/stores/flowNodeInstance';
import {modificationsStore} from 'modules/stores/modifications';
import {processInstanceDetailsStore} from 'modules/stores/processInstanceDetails';
import {processInstanceDetailsDiagramStore} from 'modules/stores/processInstanceDetailsDiagram';
import {processInstanceDetailsStatisticsStore} from 'modules/stores/processInstanceDetailsStatistics';
import {multiInstanceProcess} from 'modules/testUtils';
import {ThemeProvider} from 'modules/theme/ThemeProvider';
import {generateUniqueID} from 'modules/utils/generateUniqueID';
import {FlowNodeInstancesTree} from '..';
import {
  multiInstanceProcessInstance,
  flowNodeInstances,
  mockFlowNodeInstance,
  multipleFlowNodeInstances,
  processId,
  processInstanceId,
  multipleSubprocessesWithNoRunningScopeMock,
  multipleSubprocessesWithOneRunningScopeMock,
} from './mocks';
import {mockNestedSubprocess} from 'modules/mocks/mockNestedSubprocess';
import {instanceHistoryModificationStore} from 'modules/stores/instanceHistoryModification';
import {mockFetchProcessInstance} from 'modules/mocks/api/processInstances/fetchProcessInstance';

describe('FlowNodeInstancesTree - Modification placeholders', () => {
  beforeEach(async () => {
    mockFetchProcessInstance().withSuccess(multiInstanceProcessInstance);
    mockServer.use(
      rest.get(`/api/processes/:processId/xml`, (_, res, ctx) =>
        res.once(ctx.text(multiInstanceProcess))
      )
    );
  });

  afterEach(() => {
    processInstanceDetailsStore.reset();
    processInstanceDetailsDiagramStore.reset();
    flowNodeInstanceStore.reset();
    modificationsStore.reset();
    processInstanceDetailsStatisticsStore.reset();
    instanceHistoryModificationStore.reset();
  });

  it('should show and remove two add modification flow nodes', async () => {
    await processInstanceDetailsDiagramStore.fetchProcessXml(processId);

    processInstanceDetailsStore.init({id: processInstanceId});
    flowNodeInstanceStore.init();

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) =>
        res.once(ctx.json(flowNodeInstances.level1))
      )
    );

    await waitFor(() => {
      expect(flowNodeInstanceStore.state.status).toBe('fetched');
    });

    render(
      <FlowNodeInstancesTree
        treeDepth={1}
        flowNodeInstance={{...mockFlowNodeInstance, state: 'ACTIVE'}}
        isLastChild={false}
        scrollableContainerRef={createRef<HTMLElement>()}
      />,
      {
        wrapper: ThemeProvider,
      }
    );

    expect(screen.queryByText('Peter Join')).not.toBeInTheDocument();

    // modification icons
    expect(screen.queryByText('plus.svg')).not.toBeInTheDocument();
    expect(
      screen.queryByText('warning-message-icon.svg')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('stop.svg')).not.toBeInTheDocument();

    modificationsStore.enableModificationMode();
    modificationsStore.addModification({
      type: 'token',
      payload: {
        operation: 'ADD_TOKEN',
        scopeId: generateUniqueID(),
        flowNode: {id: 'peterJoin', name: 'Peter Join'},
        affectedTokenCount: 1,
        visibleAffectedTokenCount: 1,
        parentScopeIds: modificationsStore.generateParentScopeIds('peterJoin'),
      },
    });
    modificationsStore.addModification({
      type: 'token',
      payload: {
        operation: 'ADD_TOKEN',
        scopeId: generateUniqueID(),
        flowNode: {id: 'peterJoin', name: 'Peter Join'},
        affectedTokenCount: 1,
        visibleAffectedTokenCount: 1,
        parentScopeIds: modificationsStore.generateParentScopeIds('peterJoin'),
      },
    });
    expect(screen.getByText('Multi-Instance Process')).toBeInTheDocument();
    expect(screen.getByText('Peter Fork')).toBeInTheDocument();
    expect(screen.getAllByText('Peter Join')).toHaveLength(2);

    // modification icons
    expect(screen.getAllByText('plus.svg')).toHaveLength(2);
    expect(screen.getAllByText('warning-message-icon.svg')).toHaveLength(2);
    expect(screen.queryByText('stop.svg')).not.toBeInTheDocument();

    expect(
      screen.getByText('Filter-Map Sub Process (Multi Instance)')
    ).toBeInTheDocument();

    modificationsStore.reset();

    expect(screen.queryByText('Peter Join')).not.toBeInTheDocument();
    // modification icons
    expect(screen.queryByText('plus.svg')).not.toBeInTheDocument();
    expect(
      screen.queryByText('warning-message-icon.svg')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('stop.svg')).not.toBeInTheDocument();
  });

  it('should show and remove one cancel modification flow nodes', async () => {
    await processInstanceDetailsDiagramStore.fetchProcessXml(processId);

    processInstanceDetailsStore.init({id: processInstanceId});
    flowNodeInstanceStore.init();

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) =>
        res.once(ctx.json(multipleFlowNodeInstances))
      )
    );

    await waitFor(() => {
      expect(flowNodeInstanceStore.state.status).toBe('fetched');
    });

    render(
      <FlowNodeInstancesTree
        treeDepth={1}
        flowNodeInstance={{...mockFlowNodeInstance, state: 'ACTIVE'}}
        isLastChild={false}
        scrollableContainerRef={createRef<HTMLElement>()}
      />,
      {
        wrapper: ThemeProvider,
      }
    );

    // modification icons
    expect(screen.queryByText('plus.svg')).not.toBeInTheDocument();
    expect(
      screen.queryByText('warning-message-icon.svg')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('stop.svg')).not.toBeInTheDocument();

    modificationsStore.enableModificationMode();
    modificationsStore.addModification({
      type: 'token',
      payload: {
        operation: 'CANCEL_TOKEN',
        flowNode: {id: 'peterJoin', name: 'Peter Join'},
        affectedTokenCount: 1,
        visibleAffectedTokenCount: 1,
      },
    });

    expect(screen.getByText('Multi-Instance Process')).toBeInTheDocument();
    expect(screen.getAllByText('Peter Join')).toHaveLength(2);

    // modification icons
    expect(screen.getByText('stop.svg')).toBeInTheDocument();
    expect(screen.queryByText('plus.svg')).not.toBeInTheDocument();
    expect(
      screen.queryByText('warning-message-icon.svg')
    ).not.toBeInTheDocument();

    modificationsStore.reset();

    // modification icons
    expect(screen.queryByText('stop.svg')).not.toBeInTheDocument();
    expect(screen.queryByText('plus.svg')).not.toBeInTheDocument();
    expect(
      screen.queryByText('warning-message-icon.svg')
    ).not.toBeInTheDocument();
  });

  it('should create new parent scopes for a new palceholder if there are no running scopes', async () => {
    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) =>
        res.once(
          ctx.json(multipleSubprocessesWithNoRunningScopeMock.firstLevel)
        )
      ),
      rest.get(`/api/processes/:processId/xml`, (_, res, ctx) =>
        res.once(ctx.text(mockNestedSubprocess))
      ),
      rest.get(
        '/api/process-instances/:processInstanceId/statistics',
        (_, res, ctx) =>
          res.once(
            ctx.json([
              {
                activityId: 'parent_sub_process',
                active: 0,
                canceled: 0,
                incidents: 0,
                completed: 2,
              },
              {
                activityId: 'inner_sub_process',
                active: 0,
                canceled: 0,
                incidents: 0,
                completed: 2,
              },
              {
                activityId: 'user_task',
                active: 0,
                canceled: 0,
                incidents: 0,
                completed: 2,
              },
            ])
          )
      )
    );

    await processInstanceDetailsDiagramStore.fetchProcessXml(processId);

    processInstanceDetailsStore.init({id: processInstanceId});
    flowNodeInstanceStore.init();

    await waitFor(() => {
      expect(flowNodeInstanceStore.state.status).toBe('fetched');
      expect(processInstanceDetailsStore.state.status).toBe('fetched');
    });

    await processInstanceDetailsStatisticsStore.fetchFlowNodeStatistics(
      processInstanceId
    );

    const {user} = render(
      <FlowNodeInstancesTree
        treeDepth={1}
        flowNodeInstance={{
          ...mockFlowNodeInstance,
          state: 'INCIDENT',
          flowNodeId: 'nested_sub_process',
        }}
        isLastChild={false}
        scrollableContainerRef={createRef<HTMLElement>()}
      />,
      {
        wrapper: ThemeProvider,
      }
    );

    expect(
      screen.getAllByRole('button', {name: 'Unfold parent_sub_process'})
    ).toHaveLength(2);

    modificationsStore.enableModificationMode();
    modificationsStore.addModification({
      type: 'token',
      payload: {
        operation: 'ADD_TOKEN',
        scopeId: generateUniqueID(),
        flowNode: {id: 'user_task', name: 'User Task'},
        affectedTokenCount: 1,
        visibleAffectedTokenCount: 1,
        parentScopeIds: modificationsStore.generateParentScopeIds('user_task'),
      },
    });
    modificationsStore.addModification({
      type: 'token',
      payload: {
        operation: 'ADD_TOKEN',
        scopeId: generateUniqueID(),
        flowNode: {id: 'user_task', name: 'User Task'},
        affectedTokenCount: 1,
        visibleAffectedTokenCount: 1,
        parentScopeIds: modificationsStore.generateParentScopeIds('user_task'),
      },
    });

    expect(screen.getAllByLabelText('Unfold parent_sub_process')).toHaveLength(
      3
    );

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithNoRunningScopeMock.secondLevel1)
        );
      })
    );

    const [expandFirstScope, expandSecondScope, expandNewScope] =
      screen.getAllByLabelText('Unfold parent_sub_process');

    await user.click(expandFirstScope!);

    expect(await screen.findByText('inner_sub_process')).toBeInTheDocument();

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithNoRunningScopeMock.thirdLevel1)
        );
      })
    );

    await user.click(screen.getByLabelText('Unfold inner_sub_process'));
    expect(await screen.findByText('user_task')).toBeInTheDocument();

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithNoRunningScopeMock.secondLevel2)
        );
      })
    );
    await user.click(expandSecondScope!);

    await waitFor(() =>
      expect(screen.getAllByText('inner_sub_process')).toHaveLength(2)
    );

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithNoRunningScopeMock.thirdLevel2)
        );
      })
    );

    await user.click(screen.getByLabelText('Unfold inner_sub_process'));

    await waitFor(() =>
      expect(screen.getAllByText('user_task')).toHaveLength(2)
    );

    await user.click(expandNewScope!);

    expect(screen.getAllByText('inner_sub_process')).toHaveLength(3);

    await user.click(screen.getByLabelText('Unfold inner_sub_process'));

    expect(screen.getAllByText('user_task')).toHaveLength(4);

    // fold first (existing) parent scope
    await user.click(screen.getAllByLabelText('Fold parent_sub_process')[0]!);

    expect(screen.getAllByText('inner_sub_process')).toHaveLength(2);
    expect(screen.getAllByText('user_task')).toHaveLength(3);

    // fold second (existing) parent scope
    await user.click(screen.getAllByLabelText('Fold parent_sub_process')[0]!);

    expect(screen.getAllByText('inner_sub_process')).toHaveLength(1);
    expect(screen.getAllByText('user_task')).toHaveLength(2);

    // fold new parent scope
    await user.click(screen.getByLabelText('Fold parent_sub_process'));

    expect(screen.queryByText('inner_sub_process')).not.toBeInTheDocument();
    expect(screen.queryByText('user_task')).not.toBeInTheDocument();
  });

  it('should not create new parent scopes for a new palceholder if there is one running scopes', async () => {
    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) =>
        res.once(
          ctx.json(multipleSubprocessesWithOneRunningScopeMock.firstLevel)
        )
      ),
      rest.get(`/api/processes/:processId/xml`, (_, res, ctx) =>
        res.once(ctx.text(mockNestedSubprocess))
      ),
      rest.get(
        '/api/process-instances/:processInstanceId/statistics',
        (_, res, ctx) =>
          res.once(
            ctx.json([
              {
                activityId: 'parent_sub_process',
                active: 1,
                canceled: 0,
                incidents: 0,
                completed: 1,
              },
              {
                activityId: 'inner_sub_process',
                active: 1,
                canceled: 0,
                incidents: 0,
                completed: 1,
              },
              {
                activityId: 'user_task',
                active: 1,
                canceled: 0,
                incidents: 0,
                completed: 1,
              },
            ])
          )
      )
    );

    await processInstanceDetailsDiagramStore.fetchProcessXml(processId);

    processInstanceDetailsStore.init({id: processInstanceId});
    flowNodeInstanceStore.init();

    await waitFor(() => {
      expect(flowNodeInstanceStore.state.status).toBe('fetched');
      expect(processInstanceDetailsStore.state.status).toBe('fetched');
    });
    await processInstanceDetailsStatisticsStore.fetchFlowNodeStatistics(
      processInstanceId
    );

    const {user} = render(
      <FlowNodeInstancesTree
        treeDepth={1}
        flowNodeInstance={{
          ...mockFlowNodeInstance,
          state: 'ACTIVE',
          flowNodeId: 'nested_sub_process',
        }}
        isLastChild={false}
        scrollableContainerRef={createRef<HTMLElement>()}
      />,
      {
        wrapper: ThemeProvider,
      }
    );

    expect(screen.getAllByLabelText('Unfold parent_sub_process')).toHaveLength(
      2
    );

    modificationsStore.enableModificationMode();
    modificationsStore.addModification({
      type: 'token',
      payload: {
        operation: 'ADD_TOKEN',
        scopeId: generateUniqueID(),
        flowNode: {id: 'user_task', name: 'User Task'},
        affectedTokenCount: 1,
        visibleAffectedTokenCount: 1,
        parentScopeIds: modificationsStore.generateParentScopeIds('user_task'),
      },
    });
    modificationsStore.addModification({
      type: 'token',
      payload: {
        operation: 'ADD_TOKEN',
        scopeId: generateUniqueID(),
        flowNode: {id: 'user_task', name: 'User Task'},
        affectedTokenCount: 1,
        visibleAffectedTokenCount: 1,
        parentScopeIds: modificationsStore.generateParentScopeIds('user_task'),
      },
    });

    expect(screen.getAllByLabelText('Unfold parent_sub_process')).toHaveLength(
      2
    );

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithOneRunningScopeMock.secondLevel1)
        );
      })
    );

    const [expandFirstScope, expandSecondScope] = screen.getAllByLabelText(
      'Unfold parent_sub_process'
    );

    await user.click(expandFirstScope!);

    expect(await screen.findByText('inner_sub_process')).toBeInTheDocument();

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithOneRunningScopeMock.thirdLevel1)
        );
      })
    );

    await user.click(screen.getByLabelText('Unfold inner_sub_process'));

    expect(await screen.findByText('user_task')).toBeInTheDocument();

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithOneRunningScopeMock.secondLevel2)
        );
      })
    );
    await user.click(expandSecondScope!);

    await waitFor(() =>
      expect(screen.getAllByText('inner_sub_process')).toHaveLength(2)
    );

    mockServer.use(
      rest.post(`/api/flow-node-instances`, (_, res, ctx) => {
        return res.once(
          ctx.json(multipleSubprocessesWithOneRunningScopeMock.thirdLevel2)
        );
      })
    );

    await user.click(screen.getByLabelText('Unfold inner_sub_process'));

    await waitFor(() =>
      expect(screen.getAllByText('Event_1rw6vny')).toHaveLength(2)
    );

    expect(screen.getAllByText('user_task')).toHaveLength(4);

    // fold first parent scope
    await user.click(screen.getAllByLabelText('Fold parent_sub_process')[0]!);

    expect(screen.getByText('inner_sub_process')).toBeInTheDocument();
    expect(screen.getAllByText('user_task')).toHaveLength(3);

    // fold second parent scope
    await user.click(screen.getByLabelText('Fold parent_sub_process'));

    expect(screen.queryByText('inner_sub_process')).not.toBeInTheDocument();
    expect(screen.queryByText('user_task')).not.toBeInTheDocument();
  });
});
