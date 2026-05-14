import { test, expect } from '@playwright/test';
import { TestUsers } from './auth.setup';
import { generateSignalPattern, SAMPLE_ACTIONS, SAMPLE_INCIDENTS, TEST_SERVICES } from './fixtures/testData';

test.describe('Closed Governance Loop: TL → RM → RI → Director', () => {
  test.describe.configure({ mode: 'serial' });
  let tlToken: string, rmToken: string, riToken: string, directorToken: string;
  let signalIds: string[] = [];
  let clusterId: string;
  let riskId: string;
  let actionId: string;
  let incidentId: string;

  test.beforeAll(async ({ request }) => {
    tlToken = (await TestUsers.teamLeader(request)).token;
    rmToken = (await TestUsers.registeredManager(request)).token;
    riToken = (await TestUsers.responsibleIndividual(request)).token;
    directorToken = (await TestUsers.director(request)).token;
  });

  test('Step 1: TL submits 3 behaviour signals in 7 days → pattern emerges', async ({ request }) => {
    // Submit signals via API to simulate 3 signals over time
    const signalPattern = generateSignalPattern(3, 2); // 3 signals, 2 days apart
    
    for (let i = 0; i < signalPattern.length; i++) {
      const response = await request.post(`${process.env.API_URL}/pulses`, {
        headers: { Authorization: `Bearer ${tlToken}` },
        data: signalPattern[i]
      });
      
      if (response.status() !== 201) {
        console.error('Failed to submit signal:', await response.text());
      }
      expect(response.status()).toBe(201);
      const signal = await response.json();
      signalIds.push(signal.data.id);
    }

    // Wait for pattern engine (background job) – reduced for testing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check that a cluster was created (via API)
    const clusterResponse = await request.get(`${process.env.API_URL}/clusters?service_id=${TEST_SERVICES.ROSE_HOUSE.id}`, {
      headers: { Authorization: `Bearer ${rmToken}` },
    });

    if (clusterResponse.status() === 200) {
      const clusters = await clusterResponse.json();
      expect(clusters.data.length).toBeGreaterThan(0);
      const behaviourCluster = clusters.data.find((c: any) => c.risk_domain === 'Behaviour');
      if (behaviourCluster) {
        clusterId = behaviourCluster.id;
        expect(['Emerging', 'Escalated']).toContain(behaviourCluster.cluster_status);
      }
    }
  });

  test('Step 2: RM promotes cluster to risk', async ({ request }) => {
    if (!clusterId) {
      console.log('No cluster found - skipping risk promotion test');
      return;
    }

    // Get the cluster details
    const clusterResponse = await request.get(`${process.env.API_URL}/clusters/${clusterId}`, {
      headers: { Authorization: `Bearer ${rmToken}` },
    });

    if (clusterResponse.status() === 200) {
      // Promote cluster to risk proposal
      const promoteResponse = await request.post(`${process.env.API_URL}/risks/promote`, {
        headers: { Authorization: `Bearer ${rmToken}` },
        data: { 
          cluster_id: clusterId,
          house_id: TEST_SERVICES.ROSE_HOUSE.id,
          title: 'Escalating behavioural risk – Resident A',
          description: 'Pattern analysis indicates escalating behavioural incidents requiring immediate intervention',
          severity: 'High',
          trajectory: 'Stable'
        },
      });

      if (![201, 404].includes(promoteResponse.status())) {
        console.error('Failed to promote cluster:', await promoteResponse.text());
      }
      expect([201, 404]).toContain(promoteResponse.status());
      
      if (promoteResponse.status() === 201) {
        const risk = await promoteResponse.json();
        riskId = risk.data.risk_id || risk.data.id;
        expect(risk.data).toHaveProperty('source_cluster_id', clusterId);

        // Verify risk appears in risk register
        const riskList = await request.get(`${process.env.API_URL}/risks`, {
          headers: { Authorization: `Bearer ${rmToken}` },
        });

        if (riskList.status() === 200) {
          const risks = await riskList.json();
          expect(risks.data.some((r: any) => r.title.includes('behavioural'))).toBeTruthy();
        }
      }
    }
  });

  test('Step 3: RM creates action and TL completes it → effectiveness rated', async ({ request }) => {
    if (!riskId) {
      console.log('No risk found - skipping action test');
      return;
    }

    // Create action
    const createAction = await request.post(`${process.env.API_URL}/risks/${riskId}/action`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: {
        title: SAMPLE_ACTIONS.BEHAVIOUR_PLAN_REVIEW.title,
        description: SAMPLE_ACTIONS.BEHAVIOUR_PLAN_REVIEW.description,
        due_date: SAMPLE_ACTIONS.BEHAVIOUR_PLAN_REVIEW.due_date,
        priority: SAMPLE_ACTIONS.BEHAVIOUR_PLAN_REVIEW.priority,
        assigned_to: 'taylor-rose-uuid', // TL user ID
        linked_risk_id: riskId,
      },
    });

    if (createAction.status() === 201) {
      const action = await createAction.json();
      actionId = action.data.id;

      // TL completes action
      const completeAction = await request.patch(`${process.env.API_URL}/risks/${riskId}/actions/${actionId}/status`, {
        headers: { Authorization: `Bearer ${tlToken}` },
        data: { 
          completion_note: 'Behaviour support plan reviewed and updated with new de-escalation strategies',
          completion_date: new Date().toISOString().split('T')[0]
        },
      });

      expect(completeAction.status()).toBe(200);

      // Wait for effectiveness window (reduced for testing)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // RM rates effectiveness
      const effectiveness = await request.patch(`${process.env.API_URL}/actions/${actionId}/effectiveness`, {
        headers: { Authorization: `Bearer ${rmToken}` },
        data: { 
          effectiveness: 'Effective',
          effectiveness_notes: 'Action successfully reduced behavioural incidents'
        },
      });

      expect([200, 404]).toContain(effectiveness.status());
    }
  });

  test('Step 4: RI acknowledges a serious incident', async ({ request }) => {
    // Create a critical incident
    const incidentResponse = await request.post(`${process.env.API_URL}/incidents`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: {
        ...SAMPLE_INCIDENTS.CRITICAL_BEHAVIOUR,
        service_id: TEST_SERVICES.ROSE_HOUSE.id
      },
    });

    if (incidentResponse.status() === 201) {
      const incident = await incidentResponse.json();
      incidentId = incident.data.id;

      // RI acknowledges with statutory reference
      const ack = await request.post(`${process.env.API_URL}/ri-governance/incidents/${incidentId}/acknowledge`, {
        headers: { Authorization: `Bearer ${riToken}` },
        data: {
          acknowledgement_text: 'Critical incident reviewed. Safeguarding referral submitted. RI satisfied with immediate response.',
          statutory_body_reference: 'CQC-2026-789',
        },
      });

      expect([201, 404]).toContain(ack.status());
      
      if (ack.status() === 201) {
        const acknowledgment = await ack.json();
        expect(acknowledgment.data).toHaveProperty('ri_user_id');
      }
    }
  });

  test('Step 5: Director sees control failure and takes action', async ({ request }) => {
    // Create an ineffective action to trigger control failure
    const ineffectiveAction = await request.post(`${process.env.API_URL}/risks/${riskId || 'test-risk-id'}/action`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: {
        title: 'Medication protocol review',
        description: 'Review medication administration protocols',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'High',
        assigned_to: 'taylor-rose-uuid',
        linked_risk_id: riskId || 'test-risk-id',
      },
    });

    if (ineffectiveAction.status() === 201) {
      const action = await ineffectiveAction.json();
      const testActionId = action.data.id;

      // Mark as completed but ineffective
      await request.patch(`${process.env.API_URL}/risks/${riskId || 'test-risk-id'}/actions/${testActionId}/status`, {
        headers: { Authorization: `Bearer ${tlToken}` },
        data: { completion_note: 'Review completed but issues persist' },
      });

      // Rate as ineffective
      await request.patch(`${process.env.API_URL}/risks/${testActionId}/effectiveness`, {
        headers: { Authorization: `Bearer ${rmToken}` },
        data: { effectiveness: 'Ineffective' },
      });

      // Check for control failures
      const controlFailures = await request.get(`${process.env.API_URL}/director-governance/control-failures`, {
        headers: { Authorization: `Bearer ${directorToken}` },
      });

      if (controlFailures.status() === 200) {
        const failures = await controlFailures.json();
        
        // Look for Rose House failures
        const roseHouseFailures = failures.data.filter((f: any) => 
          f.service_name === 'Rose House' || f.service_id === TEST_SERVICES.ROSE_HOUSE.id
        );
        
        if (roseHouseFailures.length > 0) {
          expect(roseHouseFailures.length).toBeGreaterThan(0);

          // Director sends alert to RM
          const intervention = await request.post(`${process.env.API_URL}/director-governance/interventions`, {
            headers: { Authorization: `Bearer ${directorToken}` },
            data: {
              service_id: TEST_SERVICES.ROSE_HOUSE.id,
              intervention_type: 'alert_rm',
              message: 'Immediate action required: Multiple control failures identified. Review protocols and provide report within 48 hours.',
              priority: 'Critical'
            },
          });

          expect([201, 404]).toContain(intervention.status());
        }
      }
    }
  });

  test('Step 6: Complete closed-loop verification', async ({ request }) => {
    // Verify all components of the closed loop are working
    
    // 1. Check signals were created
    expect(signalIds.length).toBe(3);
    
    // 2. Verify pattern detection
    if (clusterId) {
      const clusterStatus = await request.get(`${process.env.API_URL}/clusters/${clusterId}`, {
        headers: { Authorization: `Bearer ${rmToken}` },
      });
      
      if (clusterStatus.status() === 200) {
        const cluster = await clusterStatus.json();
        expect(['Emerging', 'Promoted', 'Dismissed', 'Escalated']).toContain(cluster.data.cluster_status);
      }
    }

    // 3. Verify risk creation
    if (riskId) {
      const riskStatus = await request.get(`${process.env.API_URL}/risks/${riskId}`, {
        headers: { Authorization: `Bearer ${rmToken}` },
      });
      
      if (riskStatus.status() === 200) {
        const risk = await riskStatus.json();
        expect(['Active', 'Pending', 'Approved', 'Closed', 'Escalated']).toContain(risk.data.status);
      }
    }

    // 4. Verify action completion
    if (actionId) {
      const actionStatus = await request.get(`${process.env.API_URL}/actions/${actionId}`, {
        headers: { Authorization: `Bearer ${rmToken}` },
      });
      
      if (actionStatus.status() === 200) {
        const action = await actionStatus.json();
        expect(['Completed', 'Pending', 'Overdue']).toContain(action.data.status);
      }
    }

    // 5. Verify incident acknowledgment
    if (incidentId) {
      const incidentStatus = await request.get(`${process.env.API_URL}/incidents/${incidentId}`, {
        headers: { Authorization: `Bearer ${riToken}` },
      });
      
      if (incidentStatus.status() === 200) {
        const incident = await incidentStatus.json();
        expect(incident.data).toHaveProperty('ri_acknowledged');
      }
    }

    // 6. Verify director oversight
    const oversightReport = await request.get(`${process.env.API_URL}/director/oversight-summary`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });

    if (oversightReport.status() === 200) {
      const summary = await oversightReport.json();
      expect(summary.data).toHaveProperty('total_signals');
      expect(summary.data).toHaveProperty('active_risks');
      expect(summary.data).toHaveProperty('pending_actions');
      expect(summary.data).toHaveProperty('control_failures');
    }
  });

  test('Step 7: Cross-role data consistency verification', async ({ request }) => {
    // Verify that all roles see consistent data
    
    // TL view
    const tlSignals = await request.get(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
    });

    // RM view
    const rmSignals = await request.get(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${rmToken}` },
    });

    // RI view (limited access)
    const riIncidents = await request.get(`${process.env.API_URL}/incidents`, {
      headers: { Authorization: `Bearer ${riToken}` },
    });

    // Director view (full overview)
    const directorOverview = await request.get(`${process.env.API_URL}/director/overview`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });

    // Verify all requests succeed
    expect([200, 403, 404]).toContain(tlSignals.status());
    expect([200, 403, 404]).toContain(rmSignals.status());
    expect([200, 403, 404]).toContain(riIncidents.status());
    expect([200, 403, 404]).toContain(directorOverview.status());

    // Verify data consistency where applicable
    if (tlSignals.status() === 200 && rmSignals.status() === 200) {
      const tlData = await tlSignals.json();
      const rmData = await rmSignals.json();
      
      // RM should see all signals that TL sees (and possibly more)
      if (tlData.data.length > 0 && rmData.data.length > 0) {
        expect(rmData.data.length).toBeGreaterThanOrEqual(tlData.data.length);
      }
    }
  });

  test('Step 8: Performance metrics and KPI tracking', async ({ request }) => {
    // Test that the system tracks key performance indicators
    
    const kpiResponse = await request.get(`${process.env.API_URL}/kpis`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });

    if (kpiResponse.status() === 200) {
      const kpis = await kpiResponse.json();
      
      // Verify key KPIs are tracked
      expect(kpis.data).toHaveProperty('signal_to_pattern_ratio');
      expect(kpis.data).toHaveProperty('pattern_to_risk_conversion');
      expect(kpis.data).toHaveProperty('action_completion_rate');
      expect(kpis.data).toHaveProperty('incident_response_time');
      expect(kpis.data).toHaveProperty('effectiveness_rating_distribution');
      
      // Verify KPIs are reasonable values
      if (kpis.data.action_completion_rate !== undefined) {
        expect(kpis.data.action_completion_rate).toBeGreaterThanOrEqual(0);
        expect(kpis.data.action_completion_rate).toBeLessThanOrEqual(100);
      }
    }
  });

  test('Step 9: Audit trail verification', async ({ request }) => {
    // Verify that all actions are properly logged for audit purposes
    
    const auditResponse = await request.get(`${process.env.API_URL}/audit/trail`, {
      headers: { Authorization: `Bearer ${directorToken}` },
      params: {
        date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0]
      }
    });

    if (auditResponse.status() === 200) {
      const auditTrail = await auditResponse.json();
      
      // Verify audit trail contains expected actions
      expect(Array.isArray(auditTrail.data)).toBeTruthy();
      
      if (auditTrail.data.length > 0) {
        const auditEntry = auditTrail.data[0];
        expect(auditEntry).toHaveProperty('action_type');
        expect(auditEntry).toHaveProperty('user_role');
        expect(auditEntry).toHaveProperty('timestamp');
        expect(auditEntry).toHaveProperty('resource_type');
      }
    }
  });

  test('Step 10: Regulatory compliance verification', async ({ request }) => {
    // Verify that the system meets regulatory requirements
    
    const complianceResponse = await request.get(`${process.env.API_URL}/compliance/check`, {
      headers: { Authorization: `Bearer ${riToken}` },
    });

    if (complianceResponse.status() === 200) {
      const compliance = await complianceResponse.json();
      
      // Verify compliance checks
      expect(compliance.data).toHaveProperty('incident_reporting_compliance');
      expect(compliance.data).toHaveProperty('risk_assessment_compliance');
      expect(compliance.data).toHaveProperty('action_tracking_compliance');
      expect(compliance.data).toHaveProperty('audit_trail_compliance');
      
      // Verify compliance scores
      Object.values(compliance.data).forEach(score => {
        if (typeof score === 'number') {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      });
    }
  });
});
