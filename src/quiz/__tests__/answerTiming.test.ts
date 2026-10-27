import { answerSample, averageAnswerMs, formatSeconds } from '../answerTiming';

describe('answerSample', () => {
  it('takes the time as it was spent when there is no clock', () => {
    expect(answerSample(4200)).toBe(4200);
    expect(answerSample(90000)).toBe(90000);
  });

  // A question with a clock cannot have taken longer than the clock: if the
  // phone was put down, the wall clock kept going and the countdown did not.
  it('never reports longer than the question was allowed', () => {
    expect(answerSample(4200, 12)).toBe(4200);
    expect(answerSample(12000, 12)).toBe(12000);
    expect(answerSample(600000, 12)).toBe(12000);
  });

  it('does not report negative time if the clocks disagree', () => {
    expect(answerSample(-50, 12)).toBe(0);
    expect(answerSample(-50)).toBe(0);
  });

  it('rounds to whole milliseconds', () => {
    expect(Number.isInteger(answerSample(1234.6))).toBe(true);
  });
});

describe('averageAnswerMs', () => {
  it('averages what was answered', () => {
    expect(averageAnswerMs([2000, 4000])).toBe(3000);
    expect(averageAnswerMs([1000, 2000, 4000])).toBe(2333);
  });

  // Zero would read as "instant", which is the opposite of what happened.
  it('is null when nothing was answered', () => {
    expect(averageAnswerMs([])).toBeNull();
  });

  it('handles a single answer', () => {
    expect(averageAnswerMs([5500])).toBe(5500);
  });
});

describe('formatSeconds', () => {
  it('gives one decimal of seconds', () => {
    expect(formatSeconds(4200)).toBe('4.2');
    expect(formatSeconds(12000)).toBe('12.0');
    expect(formatSeconds(950)).toBe('1.0');
  });
});
