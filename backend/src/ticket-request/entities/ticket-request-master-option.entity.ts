import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

@Entity({ name: "ticket_request_master_options" })
@Index("idx_tr_master_group_sort", ["optionGroup", "sortOrder"])
@Index("idx_tr_master_group_code", ["optionGroup", "code"], { unique: true })
export class TicketRequestMasterOptionEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 48 })
  optionGroup!: string;

  @Column({ type: "varchar", length: 64 })
  code!: string;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: "datetime" })
  createdAtUtc!: Date;
}
