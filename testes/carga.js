import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  // Key configurations for avg load test in this section
  stages: [
    { duration: '60s', target: 50 }, // traffic ramp-up from 1 to 50 users over 60s.
    { duration: '3m', target: 50 }, // stay at 50 users for 3m
    { duration: '60s', target: 0 }, // ramp-down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.03'], // http errors should be less than 3%
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
  },
};

export default () => {
  const urlRes = http.get('http://localhost:3000');
  sleep(1);
  // MORE STEPS
  // Here you can have more steps or complex script
  // Step1
  // Step2
  // etc.
};