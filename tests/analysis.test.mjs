import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, EMOTIONS } from '../src/analysis.js';
import { aggregate, bucketStart, summarize } from '../src/aggregate.js';

test('sentiment separates positive, negative, neutral and is bounded', () => {
  assert.ok(analyzeText('I love this wonderful excellent amazing experience').sentiment > .8);
  assert.ok(analyzeText('I hate this terrible awful disgusting experience').sentiment < -.8);
  assert.equal(analyzeText('The document contains four sections and a table').sentiment, 0);
  assert.ok(analyzeText('excellent '.repeat(1000)).sentiment <= 1);
});
test('rejects unreadable captures rather than recording false neutrality', () => {
  assert.equal(analyzeText(''), null);
  assert.equal(analyzeText('a tiny snippet'), null);
  assert.equal(analyzeText('This is perfectly readable English', 20), null);
});
test('recognizes all six emotions and suppresses a negated signal', () => {
  for (const [emotion, word] of Object.entries({ Happiness: 'joyful', Sadness: 'grieving', Anger: 'furious', Fear: 'terrified', Disgust: 'disgusting', Surprise: 'astonished' })) {
    const row = analyzeText(`The people here are ${word}`);
    assert.equal(row.dominantEmotion, emotion);
    assert.equal(row.emotions[emotion], 1);
  }
  assert.equal(analyzeText('I am not happy about this document').emotions.Happiness, 0);
  assert.equal(analyzeText('The calendar shows a meeting tomorrow').dominantEmotion, 'No clear emotion');
  assert.equal(analyzeText('People are joyful but also grieving').dominantEmotion, 'Mixed');
});
test('content classifier distinguishes categories and handles ambiguity', () => {
  for (const [type, text] of Object.entries({ News: 'Reuters breaking news from the reporter', 'Social media': 'Instagram followers leave likes and comments', 'Work & study': 'Read the project document before the meeting', Entertainment: 'This movie episode includes music and lyrics', Shopping: 'Add to cart with free shipping at checkout', Other: 'The green tree stands by the road' })) assert.equal(analyzeText(text).contentType, type);
  assert.equal(analyzeText('The reporter describes the playlist today').contentType, 'Other');
});
test('stored analysis contains no raw text', () => {
  const row = analyzeText('I love this wonderful text about the news');
  assert.deepEqual(Object.keys(row).sort(), ['sentiment', 'emotions', 'dominantEmotion', 'contentType', 'wordCount', 'ocrConfidence', 'method'].sort());
});
test('summary weights by samples, excludes no-signal samples from emotion mix', () => {
  const rows = [analyzeText('I am happy and joyful today'), analyzeText('The calendar shows a meeting tomorrow'), analyzeText('The people here are grieving')];
  const result = summarize(rows);
  assert.equal(result.count, 3); assert.equal(result.emotionalSamples, 2);
  assert.equal(result.emotions.Happiness, .5); assert.equal(result.emotions.Sadness, .5);
  assert.equal(result.sentiment, rows.reduce((s, r) => s + r.sentiment, 0) / 3);
  assert.equal(summarize([]).sentiment, null);
});
test('local calendar buckets and Monday week boundaries include year changes', () => {
  const sunday = new Date(2026, 0, 4, 23, 59).getTime();
  assert.equal(bucketStart(sunday, 'week'), new Date(2025, 11, 29).getTime());
  const monday = new Date(2026, 0, 5, 0, 0).getTime();
  assert.equal(bucketStart(monday, 'week'), monday);
  const sample = analyzeText('The people here are happy');
  const buckets = aggregate([{ timestamp: sunday, ...sample }, { timestamp: monday, ...sample }, { timestamp: monday + 5000, ...sample }], 'day');
  assert.deepEqual(buckets.map(b => b.count), [1, 2]);
  assert.equal(Object.keys(buckets[0].emotions).length, EMOTIONS.length);
});
