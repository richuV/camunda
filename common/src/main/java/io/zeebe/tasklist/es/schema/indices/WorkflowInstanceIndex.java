/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a commercial license.
 * You may not use this file except in compliance with the commercial license.
 */
package io.zeebe.tasklist.es.schema.indices;

import org.springframework.stereotype.Component;

@Component
public class WorkflowInstanceIndex extends AbstractIndexDescriptor {

  public static final String INDEX_NAME = "workflow-instance";

  public static final String ID = "id";
  public static final String KEY = "key";
  public static final String END_DATE = "endDate";

  @Override
  protected String getMainIndexName() {
    return INDEX_NAME;
  }
}
