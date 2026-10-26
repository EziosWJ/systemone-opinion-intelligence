import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/mocks/db/database';
import { buildSeedData } from '../../src/mocks/data/seed';

beforeAll(() => {
  db.reset(buildSeedData());
});

describe('mock database derived state', () => {
  it('computes topic comment counts from the post→comment relation', () => {
    const topic = db.topics[0];
    const ids = db.topicCommentIds(topic.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const comment = db.getComment(id);
      expect(comment).toBeDefined();
      const post = db.getPost(comment!.postId);
      expect(post?.topicIds).toContain(topic.id);
    }
  });

  it('treats un-reviewed results as pending and keeps decision history', () => {
    db.analysisResults.push({
      id: 'res_test_1',
      commentId: db.comments[0].id,
      analysisTaskId: 'ant_test',
      ruleId: 'rule_semantics',
      ruleVersion: 1,
      relevance: 80,
      ironyProbability: 60,
      sentiment: 'mixed',
      reviewPriority: 70,
      tags: [],
      evidence: [],
      explanation: '',
      confidence: 0.6,
      createdAt: '2026-10-26T00:00:00.000Z',
    });
    expect(db.currentReviewStatus('res_test_1')).toBe('pending');
    db.addReviewDecision('res_test_1', 'uncertain', '缺少上下文');
    db.addReviewDecision('res_test_1', 'confirmed');
    expect(db.currentReviewStatus('res_test_1')).toBe('confirmed');
    expect(db.reviewDecisions).toHaveLength(2);
  });
});
