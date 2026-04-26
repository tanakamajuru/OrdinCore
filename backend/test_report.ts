const { reportsService } = require('./src/services/reports.service');

async function testReport() {
  try {
    const report = await reportsService.requestReport(
      'c38ba336-3dd3-4f56-a385-539765a4e112',
      '990dea81-a652-4aa2-b6c5-3292af5dfa55',
      { type: 'organizational_monthly', name: 'Test Report', parameters: {} }
    );
    console.log('Report requested:', report);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
testReport();
