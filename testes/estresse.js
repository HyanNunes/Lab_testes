import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  // Key configurations for avg load test in this section
  stages: [
    { duration: '60s', target: 85 }, // traffic ramp-up from 1 to 85 users over 60s.
    { duration: '3m', target: 200 }, // stay at 200 users for 3m
    { duration: '60s', target: 0 }, // ramp-down to 0 users
  ],
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