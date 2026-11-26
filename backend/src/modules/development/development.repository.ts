import { query } from '@core/database/connection';
import {
  DevelopmentProjectEntity,
  ProjectMilestoneEntity,
  ExpenditureVoucherEntity,
  CreateProjectDto,
  CreateMilestoneDto,
  CreateVoucherDto,
  ProjectFilterQuery,
  ProjectStatus,
  MilestoneStatus,
} from './development.types';

export class DevelopmentRepository {
  /**
   * Create a new sanctioned development project.
   */
  async createProject(
    projectCode: string,
    dto: CreateProjectDto,
    panchayatId: string
  ): Promise<DevelopmentProjectEntity> {
    const text = `
      INSERT INTO development_projects (
        project_code, panchayat_id, ward_id, title, work_type, funding_source,
        sanction_order_number, sanction_date, sanctioned_budget, contractor_name,
        contractor_phone, target_start_date, target_completion_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'SANCTIONED')
      RETURNING *;
    `;
    const values = [
      projectCode,
      panchayatId,
      dto.wardId || null,
      dto.title,
      dto.workType,
      dto.fundingSource,
      dto.sanctionOrderNumber,
      dto.sanctionDate,
      dto.sanctionedBudget,
      dto.contractorName,
      dto.contractorPhone || null,
      dto.targetStartDate || null,
      dto.targetCompletionDate || null,
    ];

    const res = await query<DevelopmentProjectEntity>(text, values);
    return res.rows[0];
  }

  /**
   * Find project by ID including cumulative disbursed expenditure.
   */
  async findProjectById(id: string, panchayatId: string): Promise<DevelopmentProjectEntity | null> {
    const text = `
      SELECT 
        p.*,
        w.ward_name,
        COALESCE(SUM(v.amount), 0)::numeric(14, 2) as total_disbursed
      FROM development_projects p
      LEFT JOIN wards w ON p.ward_id = w.id
      LEFT JOIN expenditure_vouchers v ON p.id = v.project_id
      WHERE p.id = $1 AND p.panchayat_id = $2
      GROUP BY p.id, w.ward_name;
    `;
    const res = await query<DevelopmentProjectEntity>(text, [id, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * List development projects with filters and cumulative disbursement metrics.
   */
  async listProjects(
    filter: ProjectFilterQuery,
    panchayatId: string
  ): Promise<{ projects: DevelopmentProjectEntity[]; total: number }> {
    const conditions: string[] = ['p.panchayat_id = $1'];
    const values: any[] = [panchayatId];
    let idx = 2;

    if (filter.status) {
      conditions.push(`p.status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.fundingSource) {
      conditions.push(`p.funding_source = $${idx++}`);
      values.push(filter.fundingSource);
    }
    if (filter.workType) {
      conditions.push(`p.work_type = $${idx++}`);
      values.push(filter.workType);
    }
    if (filter.wardId) {
      conditions.push(`p.ward_id = $${idx++}`);
      values.push(filter.wardId);
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM development_projects p WHERE ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Data query
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const dataText = `
      SELECT 
        p.*,
        w.ward_name,
        COALESCE(SUM(v.amount), 0)::numeric(14, 2) as total_disbursed
      FROM development_projects p
      LEFT JOIN wards w ON p.ward_id = w.id
      LEFT JOIN expenditure_vouchers v ON p.id = v.project_id
      WHERE ${whereClause}
      GROUP BY p.id, w.ward_name
      ORDER BY p.sanction_date DESC, p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    values.push(limit, offset);

    const dataRes = await query<DevelopmentProjectEntity>(dataText, values);
    return { projects: dataRes.rows, total };
  }

  /**
   * Update project status.
   */
  async updateProjectStatus(
    id: string,
    panchayatId: string,
    status: ProjectStatus
  ): Promise<DevelopmentProjectEntity | null> {
    const text = `
      UPDATE development_projects
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND panchayat_id = $3
      RETURNING *;
    `;
    const res = await query<DevelopmentProjectEntity>(text, [status, id, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * Set or clear the audit variance flag on a project.
   */
  async setAuditVarianceFlag(
    id: string,
    panchayatId: string,
    hasVariance: boolean
  ): Promise<void> {
    const text = `
      UPDATE development_projects
      SET has_audit_variance_flag = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND panchayat_id = $3;
    `;
    await query(text, [hasVariance, id, panchayatId]);
  }

  /**
   * Add a milestone checkpoint to a project.
   */
  async createMilestone(
    projectId: string,
    dto: CreateMilestoneDto
  ): Promise<ProjectMilestoneEntity> {
    const text = `
      INSERT INTO project_milestones (
        project_id, sequence_number, title, target_date, allocated_amount, status
      )
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING *;
    `;
    const values = [
      projectId,
      dto.sequenceNumber,
      dto.title,
      dto.targetDate || null,
      dto.allocatedAmount,
    ];
    const res = await query<ProjectMilestoneEntity>(text, values);
    return res.rows[0];
  }

  /**
   * List milestones for a project.
   */
  async findMilestonesByProjectId(projectId: string): Promise<ProjectMilestoneEntity[]> {
    const text = `
      SELECT *
      FROM project_milestones
      WHERE project_id = $1
      ORDER BY sequence_number ASC;
    `;
    const res = await query<ProjectMilestoneEntity>(text, [projectId]);
    return res.rows;
  }

  /**
   * Find a single milestone by ID.
   */
  async findMilestoneById(id: string): Promise<ProjectMilestoneEntity | null> {
    const text = `
      SELECT *
      FROM project_milestones
      WHERE id = $1;
    `;
    const res = await query<ProjectMilestoneEntity>(text, [id]);
    return res.rows[0] || null;
  }

  /**
   * Update milestone status.
   */
  async updateMilestoneStatus(
    id: string,
    status: MilestoneStatus
  ): Promise<ProjectMilestoneEntity | null> {
    const isCompleted = status === 'VERIFIED_COMPLETE';
    const text = `
      UPDATE project_milestones
      SET 
        status = $1,
        completed_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const res = await query<ProjectMilestoneEntity>(text, [status, isCompleted, id]);
    return res.rows[0] || null;
  }

  /**
   * Record a dual-signed expenditure voucher against a project.
   */
  async createVoucher(
    projectId: string,
    panchayatId: string,
    voucherNumber: string,
    dto: CreateVoucherDto,
    sachivUserId: string
  ): Promise<ExpenditureVoucherEntity> {
    const text = `
      INSERT INTO expenditure_vouchers (
        project_id, milestone_id, panchayat_id, voucher_number, voucher_date,
        payee_name, amount, payment_mode, invoice_scan_url,
        authorized_by_sachiv_id, co_signed_by_sarpanch_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      projectId,
      dto.milestoneId || null,
      panchayatId,
      voucherNumber,
      dto.voucherDate,
      dto.payeeName,
      dto.amount,
      dto.paymentMode,
      dto.invoiceScanUrl || null,
      sachivUserId,
      dto.coSignedBySarpanchId,
    ];

    const res = await query<ExpenditureVoucherEntity>(text, values);
    return res.rows[0];
  }

  /**
   * List vouchers associated with a project.
   */
  async findVouchersByProjectId(projectId: string): Promise<ExpenditureVoucherEntity[]> {
    const text = `
      SELECT 
        v.*,
        sachiv.full_name as authorized_by_sachiv_name,
        sarpanch.full_name as co_signed_by_sarpanch_name
      FROM expenditure_vouchers v
      LEFT JOIN users sachiv ON v.authorized_by_sachiv_id = sachiv.id
      LEFT JOIN users sarpanch ON v.co_signed_by_sarpanch_id = sarpanch.id
      WHERE v.project_id = $1
      ORDER BY v.voucher_date DESC, v.created_at DESC;
    `;
    const res = await query<ExpenditureVoucherEntity>(text, [projectId]);
    return res.rows;
  }

  /**
   * Calculate cumulative disbursed amount across all vouchers for a project.
   */
  async getTotalDisbursedAmount(projectId: string): Promise<number> {
    const text = `
      SELECT COALESCE(SUM(amount), 0)::numeric as total
      FROM expenditure_vouchers
      WHERE project_id = $1;
    `;
    const res = await query<{ total: string }>(text, [projectId]);
    return parseFloat(res.rows[0]?.total || '0');
  }

  /**
   * Generate aggregate expenditure summary for the Panchayat dashboard.
   */
  async getExpenditureSummary(panchayatId: string) {
    const text = `
      SELECT 
        COALESCE(SUM(p.sanctioned_budget), 0)::numeric as total_sanctioned,
        COUNT(p.id)::int as project_count,
        COALESCE((
          SELECT SUM(v.amount)
          FROM expenditure_vouchers v
          WHERE v.panchayat_id = $1
        ), 0)::numeric as total_disbursed
      FROM development_projects p
      WHERE p.panchayat_id = $1;
    `;
    const res = await query<{ total_sanctioned: string; project_count: number; total_disbursed: string }>(
      text,
      [panchayatId]
    );
    const row = res.rows[0];
    const totalSanctionedBudget = parseFloat(row?.total_sanctioned || '0');
    const totalDisbursedAmount = parseFloat(row?.total_disbursed || '0');
    const remainingBalance = totalSanctionedBudget - totalDisbursedAmount;
    const utilizationRatePercent =
      totalSanctionedBudget > 0 ? (totalDisbursedAmount / totalSanctionedBudget) * 100 : 0;

    return {
      panchayatId,
      totalSanctionedBudget,
      totalDisbursedAmount,
      remainingBalance,
      utilizationRatePercent: Number(utilizationRatePercent.toFixed(2)),
      projectCount: row?.project_count || 0,
    };
  }
}

export const developmentRepository = new DevelopmentRepository();
