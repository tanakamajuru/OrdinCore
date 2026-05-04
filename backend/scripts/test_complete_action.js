const http = require('http');

const actionId = 'b12fda9f-5c38-4860-8e35-5b766558c3d8';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTExMTExMTEtMTExMS0xMTExLTExMTEtMTExMTExMTExMTAxIiwiY29tcGFueV9pZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsInJvbGUiOiJURUFNX0xFQURFUiIsImVtYWlsIjoidGF5bG9yQG9yZGluY29yZS5jb20iLCJpYXQiOjE3Nzc4ODM4NDYsImV4cCI6MTc3ODQ4ODY0Nn0.D_1P1WW4kiUOck377urVOHXAakJ0pbpacN1Hlml7KOU';

const data = JSON.stringify({
  completion_note: 'Behaviour plan updated.',
  completion_outcome: 'Partial improvement',
  completion_rationale: 'Resident A’s agitation reduced but PRN still needed twice weekly.'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/v1/actions/${actionId}/complete`,
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
