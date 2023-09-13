/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a proprietary license.
 * See the License.txt file for more information. You may not use this file
 * except in compliance with the proprietary license.
 */

import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from 'modules/testing-library';
import {MockThemeProvider} from 'modules/theme/MockProvider';
import {Variables} from './index';
import * as taskMocks from 'modules/mock-schema/mocks/task';
import * as variableMocks from 'modules/mock-schema/mocks/variables';
import * as userMocks from 'modules/mock-schema/mocks/current-user';
import {nodeMockServer} from 'modules/mockServer/nodeMockServer';
import {rest} from 'msw';
import noop from 'lodash/noop';
import {currentUser} from 'modules/mock-schema/mocks/current-user';
import {Variable} from 'modules/types';
import {ReactQueryProvider} from 'modules/ReactQueryProvider';
import {useCurrentUser} from 'modules/queries/useCurrentUser';

type Props = {
  children?: React.ReactNode;
};

const Wrapper: React.FC<Props> = ({children}) => (
  <ReactQueryProvider>
    <MockThemeProvider>{children}</MockThemeProvider>
  </ReactQueryProvider>
);

describe('<Variables />', () => {
  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = false;
  });

  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    nodeMockServer.use(
      rest.get('/v1/internal/users/current', (_, res, ctx) => {
        return res.once(ctx.json(userMocks.currentUser));
      }),
    );

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should show existing variables for unassigned tasks', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res(ctx.json(variableMocks.variables));
      }),
    );

    render(
      <Variables
        task={taskMocks.unassignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(await screen.findByText('myVar')).toBeInTheDocument();
    expect(screen.getByText('"0001"')).toBeInTheDocument();
    expect(screen.getByText('isCool')).toBeInTheDocument();
    expect(screen.getByText('"yes"')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should show a message when the tasks has no variables', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res(ctx.json([]));
      }),
    );

    render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(
      await screen.findByText('Task has no variables'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('variables-form-table'),
    ).not.toBeInTheDocument();
  });

  it('should edit variable', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );
    const newVariableValue = '"changedValue"';

    expect(await screen.findByDisplayValue('"0001"')).toBeInTheDocument();

    await user.clear(screen.getByDisplayValue('"0001"'));
    await user.type(screen.getByLabelText('myVar'), newVariableValue);

    expect(screen.getByDisplayValue(newVariableValue)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );
  });

  it('should add two variables and remove one', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));
    await user.click(screen.getByText(/add variable/i));

    expect(screen.getAllByPlaceholderText(/^name$/i)).toHaveLength(2);
    expect(screen.getAllByPlaceholderText(/^value$/i)).toHaveLength(2);
    expect(screen.getByLabelText(/1st variable name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/1st variable value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/2nd variable name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/2nd variable value/i)).toBeInTheDocument();

    expect(await screen.findByText(/complete task/i)).toBeDisabled();

    await user.click(screen.getByLabelText(/remove 2nd new variable/i));

    expect(screen.getAllByPlaceholderText(/^name$/i)).toHaveLength(1);
    expect(screen.getAllByPlaceholderText(/^value$/i)).toHaveLength(1);
    expect(screen.getByLabelText(/1st variable name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/1st variable value/i)).toBeInTheDocument();

    expect(
      screen.queryByLabelText(/2nd variable name/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/2nd variable value/i),
    ).not.toBeInTheDocument();
  });

  it('should add variable on task without variables', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));

    expect(screen.getByLabelText(/1st variable name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/1st variable value/i)).toBeInTheDocument();

    expect(await screen.findByText(/complete task/i)).toBeDisabled();
  });

  it('should validate an empty variable name', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));
    await user.type(
      screen.getByLabelText(/1st variable value/i),
      '"valid_value"',
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText(/1st variable name/i),
      ).toHaveAccessibleDescription(/name has to be filled/i),
    );
  });

  it('should validate an invalid variable name', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));
    await user.type(screen.getByLabelText(/1st variable name/i), '"');
    await user.type(
      screen.getByLabelText(/1st variable value/i),
      '"valid_value"',
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText(/1st variable name/i),
      ).toHaveAccessibleDescription(/name is invalid/i),
    );

    await user.clear(screen.getByLabelText(/1st variable name/i));

    await waitFor(() =>
      expect(
        screen.getByLabelText(/1st variable name/i),
      ).not.toHaveAccessibleDescription(/name is invalid/i),
    );

    await user.type(screen.getByLabelText(/1st variable name/i), 'test ');

    expect(await screen.findByText(/name is invalid/i)).toBeInTheDocument();
  });

  it('should validate an empty variable value', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));
    await user.type(screen.getByLabelText(/1st variable name/i), 'valid_name');

    await waitFor(() =>
      expect(
        screen.getByLabelText(/1st variable value/i),
      ).toHaveAccessibleDescription(/value has to be json or a literal/i),
    );
  });

  it('should validate an invalid variable value', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));

    await user.type(
      screen.getByLabelText(/1st variable value/i),
      'invalid_value}}}',
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText(/1st variable name/i),
      ).toHaveAccessibleDescription(/name has to be filled/i),
    );
    expect(
      screen.getByLabelText(/1st variable value/i),
    ).toHaveAccessibleDescription(/value has to be json or a literal/i);
  });

  it('should not validate valid variables', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));
    await user.type(screen.getByLabelText(/1st variable name/i), 'valid_name');
    await user.type(
      screen.getByLabelText(/1st variable value/i),
      '"valid_value"',
    );

    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );

    expect(
      screen.queryByTitle(
        /name has to filled and value has to be json or a literal/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTitle(/name has to be filled/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTitle(/value has to be json or a literal/i),
    ).not.toBeInTheDocument();
  });

  it('should handle submission', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const mockOnSubmit = jest.fn();
    const {rerender, user} = render(
      <Variables
        key="id_0"
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={mockOnSubmit}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );

    await user.click(await screen.findByText(/complete task/i));

    expect(screen.getByText('Completing task...'));
    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenNthCalledWith(1, []);

    await user.click(await screen.findByText(/add variable/i));
    await user.type(screen.getByLabelText(/1st variable name/i), 'var');
    await user.type(screen.getByLabelText(/1st variable value/i), '1');

    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );

    await user.click(screen.getByText(/complete task/i));

    expect(screen.getByText('Completing task...'));
    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(mockOnSubmit).toHaveBeenCalledTimes(2);
    expect(mockOnSubmit).toHaveBeenNthCalledWith(2, [
      {
        name: 'var',
        value: '1',
      },
    ]);

    rerender(
      <Variables
        key="id_1"
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={mockOnSubmit}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
    );

    expect(await screen.findByLabelText('myVar')).toBeInTheDocument();

    await user.click(await screen.findByText(/add variable/i));
    await user.type(screen.getByLabelText(/1st variable name/i), 'name');
    await user.type(screen.getByLabelText(/1st variable value/i), '"Jon"');

    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );

    await user.click(screen.getByText(/complete task/i));

    expect(screen.getByText('Completing task...'));
    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(mockOnSubmit).toHaveBeenCalledTimes(3);
    expect(mockOnSubmit).toHaveBeenNthCalledWith(3, [
      {
        name: 'name',
        value: '"Jon"',
      },
    ]);
  });

  it('should change variable and complete task', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const mockOnSubmit = jest.fn();

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={mockOnSubmit}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.clear(await screen.findByLabelText('myVar'));
    await user.type(screen.getByLabelText('myVar'), '"newValue"');
    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );

    await user.click(screen.getByText(/complete task/i));

    await waitFor(() =>
      expect(mockOnSubmit).toHaveBeenCalledWith([
        {
          name: 'myVar',
          value: '"newValue"',
        },
      ]),
    );
  });

  it('should not be able to change variable, add variable and complete task if user has no permission', async () => {
    const UserName: React.FC = () => {
      const {data: currentUser} = useCurrentUser();

      return <div>{currentUser?.displayName}</div>;
    };

    nodeMockServer.use(
      rest.get('/v1/internal/users/current', (_, res, ctx) => {
        return res.once(ctx.json(userMocks.currentRestrictedUser));
      }),
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const mockOnSubmit = jest.fn();

    render(
      <>
        <UserName />
        <Variables
          task={taskMocks.assignedTask()}
          user={currentUser}
          onSubmit={mockOnSubmit}
          onSubmitFailure={noop}
          onSubmitSuccess={noop}
        />
      </>,
      {
        wrapper: Wrapper,
      },
    );

    expect(await screen.findByText('Demo User')).toBeInTheDocument();
    expect(await screen.findByText(/myVar/)).toBeInTheDocument();

    expect(screen.getByText(/add variable/i)).toBeDisabled();
    expect(screen.queryByLabelText('myVar')).not.toBeInTheDocument();
    expect(screen.getByText(/complete task/i)).toBeDisabled();
  });

  it('should add new variable and complete task', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const mockOnSubmit = jest.fn();

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={mockOnSubmit}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));
    await user.type(
      screen.getByLabelText(/1st variable name/i),
      'newVariableName',
    );
    await user.type(
      screen.getByLabelText(/1st variable value/i),
      '"newVariableValue"',
    );

    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );
    await user.click(screen.getByText(/complete task/i));

    await waitFor(() =>
      expect(mockOnSubmit).toHaveBeenCalledWith([
        {
          name: 'newVariableName',
          value: '"newVariableValue"',
        },
      ]),
    );
  });

  it('should hide add variable button on completed tasks', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    render(
      <Variables
        task={taskMocks.completedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(await screen.findByText('Variables')).toBeInTheDocument();

    expect(screen.queryByText(/add variable/i)).not.toBeInTheDocument();
  });

  it('should disable submit button on form errors for existing variables', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.type(await screen.findByLabelText('myVar'), '{{ invalid value');

    await waitFor(() =>
      expect(screen.getByLabelText('myVar')).toHaveAccessibleDescription(
        /value has to be json or a literal/i,
      ),
    );

    expect(screen.getByText(/complete task/i)).toBeDisabled();
  });

  it('should disable submit button on form errors for new variables', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));
    await user.type(
      screen.getByLabelText(/1st variable value/i),
      '{{ invalid value',
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText(/1st variable value/i),
      ).toHaveAccessibleDescription(/value has to be json or a literal/i),
    );

    expect(screen.getByText(/complete task/i)).toBeDisabled();
  });

  it('should disable completion button', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    await user.click(await screen.findByText(/add variable/i));

    expect(await screen.findByText(/complete task/i)).toBeDisabled();
  });

  it('should hide completion button on completed tasks', async () => {
    nodeMockServer.use(
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.variables));
      }),
    );

    render(
      <Variables
        task={taskMocks.completedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(await screen.findByText('Variables')).toBeInTheDocument();

    // jest-dom is not parsing the visibility properly so need to check the class
    expect(screen.queryByText(/complete task/i)).toHaveClass('hide');
  });

  it('should complete a task with a truncated variable', async () => {
    nodeMockServer.use(
      rest.get('/v1/internal/users/current', (_, res, ctx) => {
        return res.once(ctx.json(userMocks.currentUser));
      }),
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.truncatedVariables));
      }),
      rest.get('/v1/variables/:variableId', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.fullVariable()));
      }),
    );
    const mockOnSubmit = jest.fn();
    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={mockOnSubmit}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(await screen.findByDisplayValue('"000')).toBeInTheDocument();

    await user.click(screen.getByDisplayValue('"000'));

    expect(screen.getByTestId('textarea-loading-overlay')).toBeInTheDocument();

    await waitForElementToBeRemoved(() =>
      screen.getByTestId('textarea-loading-overlay'),
    );

    expect(screen.getByDisplayValue('"0001"')).toBeInTheDocument();

    await user.clear(screen.getByDisplayValue('"0001"'));
    await user.type(screen.getByLabelText('myVar'), '"newVariableValue"');
    await waitFor(() =>
      expect(screen.getByText(/complete task/i)).toBeEnabled(),
    );
    await user.click(screen.getByText(/complete task/i));

    await waitFor(() =>
      expect(mockOnSubmit).toHaveBeenCalledWith([
        {
          name: 'myVar',
          value: '"newVariableValue"',
        },
      ]),
    );
  });

  it('should preserve full value', async () => {
    const mockVariable: Variable = {
      id: '1-myVar',
      value: '"1112"',
      previewValue: '"1112"',
      name: 'myVar1',
      isValueTruncated: false,
    };
    const mockNewValue = '"new-value"';
    nodeMockServer.use(
      rest.get('/v1/internal/users/current', (_, res, ctx) => {
        return res.once(ctx.json(userMocks.currentUser));
      }),
      rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
        return res.once(ctx.json(variableMocks.truncatedVariables));
      }),
      rest.get('/v1/variables/:variableId', (req, res, ctx) => {
        switch (req.params.variableId) {
          case '0-myVar':
            return res(ctx.json(variableMocks.fullVariable()));
          case '1-myVar':
            return res(ctx.json(variableMocks.fullVariable(mockVariable)));
          default:
            return res.networkError('Failed to fetch full variable');
        }
      }),
    );
    const {user} = render(
      <Variables
        task={taskMocks.assignedTask()}
        user={currentUser}
        onSubmit={() => Promise.resolve()}
        onSubmitFailure={noop}
        onSubmitSuccess={noop}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(await screen.findByDisplayValue('"000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('"111')).toBeInTheDocument();

    await user.click(screen.getByDisplayValue('"000'));

    const firstVariableValueTextarea =
      await screen.findByDisplayValue('"0001"');
    expect(firstVariableValueTextarea).toBeInTheDocument();
    expect(screen.getByDisplayValue('"111')).toBeInTheDocument();

    await user.clear(firstVariableValueTextarea);
    await user.type(firstVariableValueTextarea, mockNewValue);
    await user.click(screen.getByDisplayValue('"111'));

    expect(
      await screen.findByDisplayValue(mockVariable.value),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockNewValue)).toBeInTheDocument();
  });

  describe('Duplicate variable validations', () => {
    it('should display error if name is the same with one of the existing variables', async () => {
      nodeMockServer.use(
        rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
          return res.once(ctx.json(variableMocks.variables));
        }),
      );

      const {user} = render(
        <Variables
          task={taskMocks.assignedTask()}
          user={currentUser}
          onSubmit={() => Promise.resolve()}
          onSubmitFailure={noop}
          onSubmitSuccess={noop}
        />,
        {
          wrapper: Wrapper,
        },
      );

      await user.click(await screen.findByText(/add variable/i));
      await user.type(screen.getByLabelText(/1st variable name/i), 'myVar');

      await waitFor(() =>
        expect(
          screen.getByLabelText(/1st variable value/i),
        ).toHaveAccessibleDescription(/value has to be json or a literal/i),
      );
      expect(
        screen.getByLabelText(/1st variable name/i),
      ).toHaveAccessibleDescription(/name must be unique/i);
    });

    it('should display duplicate name error on last edited variable', async () => {
      nodeMockServer.use(
        rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
          return res.once(ctx.json(variableMocks.variables));
        }),
      );

      const {user} = render(
        <Variables
          task={taskMocks.assignedTask()}
          user={currentUser}
          onSubmit={() => Promise.resolve()}
          onSubmitFailure={noop}
          onSubmitSuccess={noop}
        />,
        {
          wrapper: Wrapper,
        },
      );

      await user.click(await screen.findByText(/add variable/i));
      await user.type(screen.getByLabelText(/1st variable name/i), 'myVar2');

      expect(
        screen.getByLabelText(/1st variable name/i),
      ).not.toHaveAccessibleDescription(/name must be unique/i);

      await user.click(screen.getByText(/add variable/i));
      await user.type(screen.getByLabelText(/2nd variable name/i), 'myVar2');

      await waitFor(() =>
        expect(
          screen.getByLabelText(/2nd variable name/i),
        ).toHaveAccessibleDescription(/name must be unique/i),
      );

      await user.type(screen.getByLabelText(/2nd variable name/i), 'foo');

      await waitFor(() =>
        expect(
          screen.getByLabelText(/2nd variable name/i),
        ).not.toHaveAccessibleDescription(/name must be unique/i),
      );

      await user.type(screen.getByLabelText(/1st variable name/i), 'foo');

      await waitFor(() =>
        expect(
          screen.getByLabelText(/1st variable name/i),
        ).toHaveAccessibleDescription(/name must be unique/i),
      );
      expect(
        screen.getByLabelText(/2nd variable name/i),
      ).not.toHaveAccessibleDescription(/name must be unique/i);
    });

    it('should display error if duplicate name is used and immediately started typing on to the value field', async () => {
      nodeMockServer.use(
        rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
          return res.once(ctx.json(variableMocks.variables));
        }),
      );

      const {user} = render(
        <Variables
          task={taskMocks.assignedTask()}
          user={currentUser}
          onSubmit={() => Promise.resolve()}
          onSubmitFailure={noop}
          onSubmitSuccess={noop}
        />,
        {
          wrapper: Wrapper,
        },
      );

      await user.click(await screen.findByText(/add variable/i));

      await user.type(screen.getByLabelText(/1st variable name/i), 'myVar2');
      await user.type(screen.getByLabelText(/1st variable value/i), '1');

      await waitFor(() =>
        expect(screen.getByText(/complete task/i)).toBeEnabled(),
      );

      await user.click(await screen.findByText(/add variable/i));

      await user.type(screen.getByLabelText(/2nd variable name/i), 'myVar2');
      await user.type(screen.getByLabelText(/2nd variable value/i), '2');

      await waitFor(() =>
        expect(
          screen.getByLabelText(/2nd variable name/i),
        ).toHaveAccessibleDescription(/name must be unique/i),
      );

      expect(
        screen.getByLabelText(/1st variable name/i),
      ).not.toHaveAccessibleDescription(/name must be unique/i);
    });

    it('should continue to display existing duplicate name error', async () => {
      nodeMockServer.use(
        rest.post('/v1/tasks/:taskId/variables/search', (_, res, ctx) => {
          return res.once(ctx.json(variableMocks.variables));
        }),
      );

      const {user} = render(
        <Variables
          task={taskMocks.assignedTask()}
          user={currentUser}
          onSubmit={() => Promise.resolve()}
          onSubmitFailure={noop}
          onSubmitSuccess={noop}
        />,
        {
          wrapper: Wrapper,
        },
      );

      await user.click(await screen.findByText(/add variable/i));

      await user.type(screen.getByLabelText(/1st variable name/i), 'myVar2');
      await user.type(screen.getByLabelText(/1st variable value/i), '1');

      await waitFor(() =>
        expect(screen.getByText(/complete task/i)).toBeEnabled(),
      );

      await user.click(screen.getByText(/add variable/i));

      await user.type(screen.getByLabelText(/2nd variable name/i), 'myVar2');
      await user.type(screen.getByLabelText(/2nd variable value/i), '2');

      await waitFor(() =>
        expect(
          screen.getByLabelText(/2nd variable name/i),
        ).toHaveAccessibleDescription(/name must be unique/i),
      );

      await user.click(screen.getByText(/add variable/i));

      await user.type(screen.getByLabelText(/3rd variable name/i), 'myVar2');
      await user.type(screen.getByLabelText(/3rd variable value/i), '3');

      await waitFor(() =>
        expect(
          screen.getByLabelText(/3rd variable name/i),
        ).toHaveAccessibleDescription(/name must be unique/i),
      );

      expect(
        screen.getByLabelText(/2nd variable name/i),
      ).toHaveAccessibleDescription(/name must be unique/i);
      expect(
        screen.getByLabelText(/1st variable name/i),
      ).not.toHaveAccessibleDescription(/name must be unique/i);
    });
  });
});
