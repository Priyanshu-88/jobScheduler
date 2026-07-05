import { RetryPolicy } from '@job-scheduler/database';

export function calculateNextRunAt(policy: RetryPolicy, currentAttempt: number): Date {
  let delayMs = policy.baseDelayMs;

  switch (policy.strategy) {
    case 'linear':
      delayMs = policy.baseDelayMs * currentAttempt;
      break;
    case 'exponential':
      delayMs = policy.baseDelayMs * Math.pow(2, currentAttempt - 1);
      break;
    case 'fixed':
    default:
      delayMs = policy.baseDelayMs;
      break;
  }

  if (delayMs > policy.maxDelayMs) {
    delayMs = policy.maxDelayMs;
  }

  if (policy.jitter) {
    // Add random jitter between 0 and 50% of the computed delay
    const jitterAmount = Math.floor(Math.random() * (delayMs * 0.5));
    delayMs += jitterAmount;
  }

  return new Date(Date.now() + delayMs);
}
