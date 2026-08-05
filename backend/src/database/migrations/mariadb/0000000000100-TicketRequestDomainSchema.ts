import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class TicketRequestDomainSchema0000000000100 implements MigrationInterface {
  name = "TicketRequestDomainSchema0000000000100";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "ticket_request_master_options",
        columns: [
          { name: "id", type: "varchar", length: "64", isPrimary: true },
          { name: "optionGroup", type: "varchar", length: "48", isNullable: false },
          { name: "code", type: "varchar", length: "64", isNullable: false },
          { name: "name", type: "varchar", length: "200", isNullable: false },
          { name: "description", type: "varchar", length: "500", isNullable: true },
          { name: "sortOrder", type: "int", default: "0" },
          { name: "isActive", type: "boolean", default: "1" },
          { name: "createdAtUtc", type: "datetime", default: "CURRENT_TIMESTAMP" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "ticket_request_master_options",
      new TableIndex({ name: "idx_tr_master_group_sort", columnNames: ["optionGroup", "sortOrder"] }),
    );
    await queryRunner.createIndex(
      "ticket_request_master_options",
      new TableIndex({ name: "idx_tr_master_group_code", columnNames: ["optionGroup", "code"], isUnique: true }),
    );

    await queryRunner.createTable(
      new Table({
        name: "ticket_requests",
        columns: [
          { name: "id", type: "varchar", length: "64", isPrimary: true },
          { name: "requestType", type: "varchar", length: "48" },
          { name: "requester", type: "varchar", length: "120" },
          { name: "title", type: "varchar", length: "500" },
          { name: "priorityId", type: "varchar", length: "64" },
          { name: "productId", type: "varchar", length: "64" },
          { name: "requestSourceId", type: "varchar", length: "64" },
          { name: "categoryId", type: "varchar", length: "64" },
          { name: "dateFound", type: "date", isNullable: true },
          { name: "rigTypeId", type: "varchar", length: "64", isNullable: true },
          { name: "issueTypeId", type: "varchar", length: "64", isNullable: true },
          { name: "issuedSiteId", type: "varchar", length: "64", isNullable: true },
          { name: "controllerTypeId", type: "varchar", length: "64", isNullable: true },
          { name: "mainVersionId", type: "varchar", length: "64", isNullable: true },
          { name: "mainVersionOther", type: "varchar", length: "120", isNullable: true },
          { name: "subVersionId", type: "varchar", length: "64", isNullable: true },
          { name: "subVersionOther", type: "varchar", length: "120", isNullable: true },
          { name: "additionalCategoryId", type: "varchar", length: "64", isNullable: true },
          { name: "descriptionHtml", type: "text" },
          { name: "stepsToReproduceHtml", type: "text" },
          { name: "jiraIssueKey", type: "varchar", length: "64", isNullable: true },
          { name: "status", type: "varchar", length: "24", default: "'accepted'" },
          { name: "message", type: "varchar", length: "300" },
          { name: "createdAtUtc", type: "datetime", default: "CURRENT_TIMESTAMP" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "ticket_requests",
      new TableIndex({ name: "idx_tr_type_created", columnNames: ["requestType", "createdAtUtc"] }),
    );
    await queryRunner.createIndex(
      "ticket_requests",
      new TableIndex({ name: "idx_tr_status_created", columnNames: ["status", "createdAtUtc"] }),
    );

    await queryRunner.createTable(
      new Table({
        name: "ticket_request_attachments",
        columns: [
          { name: "id", type: "varchar", length: "64", isPrimary: true },
          { name: "ticketRequestId", type: "varchar", length: "64", isNullable: false },
          { name: "fileName", type: "varchar", length: "260", isNullable: false },
          { name: "sizeBytes", type: "bigint", isNullable: false },
          { name: "contentType", type: "varchar", length: "100", isNullable: false },
          { name: "createdAtUtc", type: "datetime", default: "CURRENT_TIMESTAMP" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "ticket_request_attachments",
      new TableIndex({ name: "idx_tr_attachment_request", columnNames: ["ticketRequestId"] }),
    );

    await queryRunner.createForeignKey(
      "ticket_request_attachments",
      new TableForeignKey({
        columnNames: ["ticketRequestId"],
        referencedTableName: "ticket_requests",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const attachmentTable = await queryRunner.getTable("ticket_request_attachments");
    const requestFk = attachmentTable?.foreignKeys.find((fk) => fk.columnNames.includes("ticketRequestId"));
    if (requestFk) {
      await queryRunner.dropForeignKey("ticket_request_attachments", requestFk);
    }

    await queryRunner.dropTable("ticket_request_attachments", true);
    await queryRunner.dropTable("ticket_requests", true);
    await queryRunner.dropTable("ticket_request_master_options", true);
  }
}
