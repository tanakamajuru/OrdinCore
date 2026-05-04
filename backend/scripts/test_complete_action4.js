const axios = require('axios');

async function testCompleteAction4() {
  const actionId = 'c5edf72e-588b-4f4a-b247-3c23f12034b6';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTExMTExMTEtMTExMS0xMTExLTExMTEtMTExMTExMTExMTAxIiwiY29tcGFueV9pZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsInJvbGUiOiJURUFNX0xFQURFUiIsImVtYWlsIjoidGF5bG9yQG9yZGluY29yZS5jb20iLCJpYXQiOjE3Nzc4ODM4NDYsImV4cCI6MTc3ODQ4ODY0Nn0.D_1P1WW4kiUOck377urVOHXAakJ0pbpacN1Hlml7KOU';

  try {
    const response = await axios.patch(`http://localhost:3001/api/v1/actions/${actionId}/complete`, {
      completion_outcome: 'Partial improvement',
      completion_rationale: 'Finally testing notifications with everything fixed.'
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

testCompleteAction4();
