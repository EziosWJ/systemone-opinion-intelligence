/** V1 contract types; model/API implementation will land in feature milestones. */
export type SourcePlatform = 'weibo';
export type CaptureMode = 'url' | 'keyword' | 'import';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
export type ReviewStatus = 'pending' | 'confirmed' | 'uncertain' | 'rejected';
export type ReportStatus = 'draft' | 'ready' | 'exported';
export type ISODateTime = string;
export interface Topic { id: string; title: string; summary: string; keywords: string[]; createdAt: ISODateTime; updatedAt: ISODateTime; }
export interface SocialPost { id: string; platform: SourcePlatform; sourceId: string; url: string; text: string; publishedAt: ISODateTime; topicIds: string[]; }
export interface SocialComment { id: string; postId: string; sourceId: string; parentCommentId?: string; text: string; publishedAt: ISODateTime; collectedAt: ISODateTime; }
export interface CaptureTask { id: string; mode: CaptureMode; input: string; status: TaskStatus; total: number; processed: number; createdAt: ISODateTime; updatedAt: ISODateTime; error?: string; }
export interface AnalysisRule { id: string; name: string; version: number; dimensions: Array<'relevance' | 'irony' | 'sentiment' | 'reviewPriority'>; promptTemplate: string; outputSchemaVersion: string; }
export interface AnalysisTask { id: string; ruleId: string; ruleVersion: number; commentIds: string[]; status: TaskStatus; total: number; processed: number; createdAt: ISODateTime; }
export interface AnalysisResult { id: string; commentId: string; analysisTaskId: string; ruleId: string; ruleVersion: number; relevance: number; ironyProbability: number; sentiment: 'positive'|'neutral'|'negative'|'mixed'|'unclear'; reviewPriority: number; tags: string[]; evidence: string[]; explanation: string; confidence: number; createdAt: ISODateTime; }
export interface ReviewDecision { id: string; resultId: string; status: ReviewStatus; note?: string; reviewedAt: ISODateTime; }
export interface Report { id: string; topicId: string; title: string; status: ReportStatus; contentMarkdown: string; generatedAt: ISODateTime; updatedAt: ISODateTime; }
