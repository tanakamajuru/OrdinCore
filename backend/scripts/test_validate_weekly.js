const axios = require('axios');

async function testValidateWeeklyReview() {
  const reviewId = '12345678-1234-1234-1234-123456789012';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTExMTExMTEtMTExMS0xMTExLTExMTEtMTExMTExMTExMTAzIiwiY29tcGFueV9pZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsInJvbGUiOiJSRVNQT05TSUJMRV9JTkRJVklEVUFMIiwiZW1haWwiOiJjaHJpc0BvcmRpbmNvcmUuY29tIiwiaWF0IjoxNzc3ODg0MTc0LCJleHAiOjE3Nzg0ODg5NzR9.Jhc_tDTo5xqvlhQulboViBHsJL_-A9gxJmt0m46BTVM';

  try {
    const response = await axios.post(`http://localhost:3001/api/v1/weekly-reviews/${reviewId}/validate`, {
      validation_status: 'Approved',
      validation_comment: 'Good governance. Approved.'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('SUCCESS:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('FAILED:', error.response.status, error.response.data);
    } else {
      console.log('ERROR:', error.message);
    }
  }
}

testValidateWeeklyReview();
