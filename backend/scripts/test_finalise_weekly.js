const axios = require('axios');

async function testFinaliseWeeklyReview() {
  const reviewId = '12345678-1234-1234-1234-123456789012';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTExMTExMTEtMTExMS0xMTExLTExMTEtMTExMTExMTExMTAyIiwiY29tcGFueV9pZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsInJvbGUiOiJSRUdJU1RFUkVEX01BTkFHRVIiLCJlbWFpbCI6InNhbUBvcmRpbmNvcmUuY29tIiwiaWF0IjoxNzc3ODg0MDEwLCJleHAiOjE3Nzg0ODg4MTB9.dWystYTmLYT6sVmXpN1gLNdDR0msdB-jrXPpr8x2rpA';

  try {
    const response = await axios.post(`http://localhost:3001/api/v1/weekly-reviews/${reviewId}/finalise`, {}, {
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

testFinaliseWeeklyReview();
