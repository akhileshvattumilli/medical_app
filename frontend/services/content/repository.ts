import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import systemsJson from '../../mock/systems.json';
import conditionsJson from '../../mock/conditions.json';
import casesJson from '../../mock/cases.json';
import caseDetailsJson from '../../mock/case_details.json';
import sectionsJson from '../../mock/sections.json';
import mechanismsJson from '../../mock/mechanisms.json';
import resourcesJson from '../../mock/resources.json';
import quizzesJson from '../../mock/quizzes.json';
import checkpointsJson from '../../mock/checkpoints.json';
import type { Case, CaseDetail } from '../../types/case';
import type { StudyCheckpoint } from '../../types/checkpoint';
import type { Condition } from '../../types/condition';
import type { Mechanism } from '../../types/mechanism';
import type { QuizQuestion } from '../../types/quiz';
import type { Resource } from '../../types/resource';
import type { Section } from '../../types/section';
import type { System } from '../../types/system';
import type { PublishStatus } from '../../types/study';
import { hasFirebaseConfig, getFirebaseApp } from '../auth/firebase';
import { getStoredJson, setStoredJson } from '../storage/keyValueStore';

const CONTENT_KEY = 'medical-app/content/v1';

export interface AdminCase extends Case {
  publishStatus: PublishStatus;
  updatedAt: string;
}

export interface ContentDataset {
  systems: System[];
  conditions: Condition[];
  cases: AdminCase[];
  caseDetails: CaseDetail[];
  sections: Section[];
  mechanisms: Mechanism[];
  resources: Resource[];
  quizzes: QuizQuestion[];
  checkpoints: StudyCheckpoint[];
}

export interface CaseBundle {
  caseItem?: AdminCase;
  details?: CaseDetail;
  sections: Section[];
  mechanisms: Mechanism[];
  resources: Resource[];
  quizzes: QuizQuestion[];
  checkpoints: StudyCheckpoint[];
}

export interface ContentRepository {
  getSystems(): Promise<System[]>;
  getConditionsBySystem(systemId: string): Promise<Condition[]>;
  getConditionById(conditionId: string): Promise<Condition | undefined>;
  getCasesByCondition(conditionId: string, includeDrafts?: boolean): Promise<AdminCase[]>;
  getCaseBundle(caseId: string, includeDrafts?: boolean): Promise<CaseBundle>;
}

export interface AdminContentRepository extends ContentRepository {
  getDataset(): Promise<ContentDataset>;
  replaceDataset(dataset: ContentDataset): Promise<void>;
  resetDataset(): Promise<void>;
  saveSystem(item: System): Promise<void>;
  saveCondition(item: Condition): Promise<void>;
  saveCase(item: AdminCase): Promise<void>;
  saveCaseDetail(item: CaseDetail): Promise<void>;
  saveSection(item: Section): Promise<void>;
  saveMechanism(item: Mechanism): Promise<void>;
  saveResource(item: Resource): Promise<void>;
  saveQuiz(item: QuizQuestion): Promise<void>;
  saveCheckpoint(item: StudyCheckpoint): Promise<void>;
  deleteItem(kind: keyof ContentDataset, id: string): Promise<void>;
}

const seedDatasetTemplate: ContentDataset = {
  systems: systemsJson as System[],
  conditions: conditionsJson as Condition[],
  cases: (casesJson as Case[]).map((item) => ({
    ...item,
    publishStatus: 'published',
    updatedAt: new Date(0).toISOString(),
  })),
  caseDetails: caseDetailsJson as CaseDetail[],
  sections: sectionsJson as Section[],
  mechanisms: mechanismsJson as Mechanism[],
  resources: resourcesJson as Resource[],
  quizzes: quizzesJson as QuizQuestion[],
  checkpoints: checkpointsJson as StudyCheckpoint[],
};

function cloneDataset<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createSeedDataset(): ContentDataset {
  return cloneDataset(seedDatasetTemplate);
}

function coerceDataset(payload: ContentDataset): ContentDataset {
  const fallback = createSeedDataset();
  return {
    systems: Array.isArray(payload?.systems) ? payload.systems : fallback.systems,
    conditions: Array.isArray(payload?.conditions) ? payload.conditions : fallback.conditions,
    cases: Array.isArray(payload?.cases) ? payload.cases : fallback.cases,
    caseDetails: Array.isArray(payload?.caseDetails) ? payload.caseDetails : fallback.caseDetails,
    sections: Array.isArray(payload?.sections) ? payload.sections : fallback.sections,
    mechanisms: Array.isArray(payload?.mechanisms) ? payload.mechanisms : fallback.mechanisms,
    resources: Array.isArray(payload?.resources) ? payload.resources : fallback.resources,
    quizzes: Array.isArray(payload?.quizzes) ? payload.quizzes : fallback.quizzes,
    checkpoints: Array.isArray(payload?.checkpoints) ? payload.checkpoints : fallback.checkpoints,
  };
}

function sortByName<T extends { name?: string; title?: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.name ?? a.title ?? '').localeCompare(b.name ?? b.title ?? ''));
}

function isPublishedCase(dataset: ContentDataset, caseId: string, includeDrafts = false) {
  const caseItem = dataset.cases.find((item) => item.id === caseId);
  if (!caseItem) return false;
  return includeDrafts || caseItem.publishStatus === 'published';
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) {
    return [...items, item];
  }

  const next = [...items];
  next[index] = item;
  return next;
}

function upsertByCaseId<T extends { caseId: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.caseId === item.caseId);
  if (index === -1) {
    return [...items, item];
  }

  const next = [...items];
  next[index] = item;
  return next;
}

function deleteById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}

function deleteByCaseId<T extends { caseId: string }>(items: T[], id: string) {
  return items.filter((item) => item.caseId !== id);
}

class LocalContentRepository implements AdminContentRepository {
  private async getLocalDataset(): Promise<ContentDataset> {
    return getStoredJson(CONTENT_KEY, createSeedDataset());
  }

  private async writeDataset(dataset: ContentDataset): Promise<void> {
    await setStoredJson(CONTENT_KEY, dataset);
  }

  async getDataset(): Promise<ContentDataset> {
    return this.getLocalDataset();
  }

  async replaceDataset(dataset: ContentDataset): Promise<void> {
    await this.writeDataset(coerceDataset(dataset));
  }

  async resetDataset(): Promise<void> {
    await this.writeDataset(createSeedDataset());
  }

  async getSystems(): Promise<System[]> {
    const dataset = await this.getLocalDataset();
    return sortByName(dataset.systems);
  }

  async getConditionsBySystem(systemId: string): Promise<Condition[]> {
    const dataset = await this.getLocalDataset();
    const publishedConditionIds = new Set(
      dataset.cases
        .filter((item) => item.publishStatus === 'published')
        .map((item) => item.conditionId),
    );
    return sortByName(
      dataset.conditions.filter(
        (condition) => condition.systemId === systemId && publishedConditionIds.has(condition.id),
      ),
    );
  }

  async getConditionById(conditionId: string): Promise<Condition | undefined> {
    const dataset = await this.getLocalDataset();
    return dataset.conditions.find((item) => item.id === conditionId);
  }

  async getCasesByCondition(conditionId: string, includeDrafts = false): Promise<AdminCase[]> {
    const dataset = await this.getLocalDataset();
    return dataset.cases
      .filter(
        (item) =>
          item.conditionId === conditionId &&
          (includeDrafts || item.publishStatus === 'published'),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async getCaseBundle(caseId: string, includeDrafts = false): Promise<CaseBundle> {
    const dataset = await this.getLocalDataset();
    const caseItem = dataset.cases.find((item) => item.id === caseId);
    if (!caseItem || !isPublishedCase(dataset, caseId, includeDrafts)) {
      return {
        sections: [],
        mechanisms: [],
        resources: [],
        quizzes: [],
        checkpoints: [],
      };
    }

    return {
      caseItem,
      details: dataset.caseDetails.find((item) => item.caseId === caseId),
      sections: dataset.sections
        .filter((item) => item.caseId === caseId)
        .sort((a, b) => a.order - b.order),
      mechanisms: dataset.mechanisms.filter((item) => item.caseId === caseId),
      resources: dataset.resources.filter((item) => item.caseId === caseId),
      quizzes: dataset.quizzes.filter((item) => item.caseId === caseId),
      checkpoints: dataset.checkpoints.filter((item) => item.caseId === caseId),
    };
  }

  async saveSystem(item: System): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.systems = upsertById(dataset.systems, item);
    await this.writeDataset(dataset);
  }

  async saveCondition(item: Condition): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.conditions = upsertById(dataset.conditions, item);
    await this.writeDataset(dataset);
  }

  async saveCase(item: AdminCase): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.cases = upsertById(dataset.cases, {
      ...item,
      updatedAt: new Date().toISOString(),
    });
    await this.writeDataset(dataset);
  }

  async saveCaseDetail(item: CaseDetail): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.caseDetails = upsertByCaseId(dataset.caseDetails, item);
    await this.writeDataset(dataset);
  }

  async saveSection(item: Section): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.sections = upsertById(dataset.sections, item);
    await this.writeDataset(dataset);
  }

  async saveMechanism(item: Mechanism): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.mechanisms = upsertById(dataset.mechanisms, item);
    await this.writeDataset(dataset);
  }

  async saveResource(item: Resource): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.resources = upsertById(dataset.resources, item);
    await this.writeDataset(dataset);
  }

  async saveQuiz(item: QuizQuestion): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.quizzes = upsertById(dataset.quizzes, item);
    await this.writeDataset(dataset);
  }

  async saveCheckpoint(item: StudyCheckpoint): Promise<void> {
    const dataset = await this.getLocalDataset();
    dataset.checkpoints = upsertById(dataset.checkpoints, item);
    await this.writeDataset(dataset);
  }

  async deleteItem(kind: keyof ContentDataset, id: string): Promise<void> {
    const dataset = await this.getLocalDataset();

    if (kind === 'caseDetails') {
      dataset.caseDetails = deleteByCaseId(dataset.caseDetails, id);
    } else {
      dataset[kind] = deleteById(dataset[kind] as Array<{ id: string }>, id) as never;
    }

    await this.writeDataset(dataset);
  }
}

class FirebaseContentRepository implements AdminContentRepository {
  private getDb() {
    const app = getFirebaseApp();
    if (!app) throw new Error('Firebase is not configured.');
    return getFirestore(app);
  }

  private async readCollection<T>(name: keyof ContentDataset): Promise<T[]> {
    const snapshot = await getDocs(collection(this.getDb(), name));
    return snapshot.docs.map((item) => item.data() as T);
  }

  async getDataset(): Promise<ContentDataset> {
    const [
      systems,
      conditions,
      cases,
      caseDetails,
      sections,
      mechanisms,
      resources,
      quizzes,
      checkpoints,
    ] = await Promise.all([
      this.readCollection<System>('systems'),
      this.readCollection<Condition>('conditions'),
      this.readCollection<AdminCase>('cases'),
      this.readCollection<CaseDetail>('caseDetails'),
      this.readCollection<Section>('sections'),
      this.readCollection<Mechanism>('mechanisms'),
      this.readCollection<Resource>('resources'),
      this.readCollection<QuizQuestion>('quizzes'),
      this.readCollection<StudyCheckpoint>('checkpoints'),
    ]);

    return {
      systems,
      conditions,
      cases,
      caseDetails,
      sections,
      mechanisms,
      resources,
      quizzes,
      checkpoints,
    };
  }

  async replaceDataset(dataset: ContentDataset): Promise<void> {
    const current = await this.getDataset();
    const next = coerceDataset(dataset);
    const collections: Array<keyof ContentDataset> = [
      'systems',
      'conditions',
      'cases',
      'caseDetails',
      'sections',
      'mechanisms',
      'resources',
      'quizzes',
      'checkpoints',
    ];

    for (const collectionName of collections) {
      const currentItems = current[collectionName] as Array<{ id?: string; caseId?: string }>;
      const nextItems = next[collectionName] as Array<{ id?: string; caseId?: string }>;
      const nextKeys = new Set(
        nextItems.map((item) => (collectionName === 'caseDetails' ? item.caseId : item.id)).filter(Boolean),
      );

      for (const item of currentItems) {
        const key = collectionName === 'caseDetails' ? item.caseId : item.id;
        if (key && !nextKeys.has(key)) {
          await this.deleteItem(collectionName, key);
        }
      }
    }

    for (const item of next.systems) await this.saveSystem(item);
    for (const item of next.conditions) await this.saveCondition(item);
    for (const item of next.cases) await this.saveCase(item);
    for (const item of next.caseDetails) await this.saveCaseDetail(item);
    for (const item of next.sections) await this.saveSection(item);
    for (const item of next.mechanisms) await this.saveMechanism(item);
    for (const item of next.resources) await this.saveResource(item);
    for (const item of next.quizzes) await this.saveQuiz(item);
    for (const item of next.checkpoints) await this.saveCheckpoint(item);
  }

  async resetDataset(): Promise<void> {
    await this.replaceDataset(createSeedDataset());
  }

  async getSystems(): Promise<System[]> {
    return this.readCollection<System>('systems');
  }

  async getConditionsBySystem(systemId: string): Promise<Condition[]> {
    const dataset = await this.getDataset();
    const publishedConditionIds = new Set(
      dataset.cases
        .filter((item) => item.publishStatus === 'published')
        .map((item) => item.conditionId),
    );
    return dataset.conditions.filter(
      (condition) => condition.systemId === systemId && publishedConditionIds.has(condition.id),
    );
  }

  async getConditionById(conditionId: string): Promise<Condition | undefined> {
    const snapshot = await getDoc(doc(this.getDb(), 'conditions', conditionId));
    return snapshot.exists() ? (snapshot.data() as Condition) : undefined;
  }

  async getCasesByCondition(conditionId: string, includeDrafts = false): Promise<AdminCase[]> {
    const dataset = await this.getDataset();
    return dataset.cases.filter(
      (item) =>
        item.conditionId === conditionId && (includeDrafts || item.publishStatus === 'published'),
    );
  }

  async getCaseBundle(caseId: string, includeDrafts = false): Promise<CaseBundle> {
    const dataset = await this.getDataset();
    const caseItem = dataset.cases.find((item) => item.id === caseId);
    if (!caseItem || (!includeDrafts && caseItem.publishStatus !== 'published')) {
      return {
        sections: [],
        mechanisms: [],
        resources: [],
        quizzes: [],
        checkpoints: [],
      };
    }

    return {
      caseItem,
      details: dataset.caseDetails.find((item) => item.caseId === caseId),
      sections: dataset.sections.filter((item) => item.caseId === caseId),
      mechanisms: dataset.mechanisms.filter((item) => item.caseId === caseId),
      resources: dataset.resources.filter((item) => item.caseId === caseId),
      quizzes: dataset.quizzes.filter((item) => item.caseId === caseId),
      checkpoints: dataset.checkpoints.filter((item) => item.caseId === caseId),
    };
  }

  async saveSystem(item: System): Promise<void> {
    await setDoc(doc(this.getDb(), 'systems', item.id), item);
  }

  async saveCondition(item: Condition): Promise<void> {
    await setDoc(doc(this.getDb(), 'conditions', item.id), item);
  }

  async saveCase(item: AdminCase): Promise<void> {
    await setDoc(doc(this.getDb(), 'cases', item.id), item);
  }

  async saveCaseDetail(item: CaseDetail): Promise<void> {
    await setDoc(doc(this.getDb(), 'caseDetails', item.caseId), item);
  }

  async saveSection(item: Section): Promise<void> {
    await setDoc(doc(this.getDb(), 'sections', item.id), item);
  }

  async saveMechanism(item: Mechanism): Promise<void> {
    await setDoc(doc(this.getDb(), 'mechanisms', item.id), item);
  }

  async saveResource(item: Resource): Promise<void> {
    await setDoc(doc(this.getDb(), 'resources', item.id), item);
  }

  async saveQuiz(item: QuizQuestion): Promise<void> {
    await setDoc(doc(this.getDb(), 'quizzes', item.id), item);
  }

  async saveCheckpoint(item: StudyCheckpoint): Promise<void> {
    await setDoc(doc(this.getDb(), 'checkpoints', item.id), item);
  }

  async deleteItem(kind: keyof ContentDataset, id: string): Promise<void> {
    const collectionName = kind === 'caseDetails' ? 'caseDetails' : kind;
    await deleteDoc(doc(this.getDb(), collectionName, id));
  }
}

let localRepository: LocalContentRepository | undefined;
let firebaseRepository: FirebaseContentRepository | undefined;

export function getContentRepository(): ContentRepository {
  if (hasFirebaseConfig()) {
    firebaseRepository ??= new FirebaseContentRepository();
    return firebaseRepository;
  }

  localRepository ??= new LocalContentRepository();
  return localRepository;
}

export function getAdminContentRepository(): AdminContentRepository {
  if (hasFirebaseConfig()) {
    firebaseRepository ??= new FirebaseContentRepository();
    return firebaseRepository;
  }

  localRepository ??= new LocalContentRepository();
  return localRepository;
}
