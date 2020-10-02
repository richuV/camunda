/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a commercial license.
 * You may not use this file except in compliance with the commercial license.
 */

import {post} from 'modules/request';

const URL = '/api/batch-operations';

export async function fetchOperations({pageSize, searchAfter}) {
  const response = await post(URL, {
    pageSize,
    searchAfter,
  });
  return await response.json();
}
