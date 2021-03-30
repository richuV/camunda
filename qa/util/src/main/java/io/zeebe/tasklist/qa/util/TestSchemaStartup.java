/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. Licensed under a commercial license.
 * You may not use this file except in compliance with the commercial license.
 */
package io.zeebe.tasklist.qa.util;

import io.zeebe.tasklist.exceptions.MigrationException;
import io.zeebe.tasklist.schema.SchemaStartup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component("schemaStartup")
@Profile("test")
public class TestSchemaStartup extends SchemaStartup {

  private static final Logger LOGGER = LoggerFactory.getLogger(TestSchemaStartup.class);

  @Override
  public void initializeSchema() throws MigrationException {
    LOGGER.info("No schema validation, creation and migration will be executed.");
  }
}
