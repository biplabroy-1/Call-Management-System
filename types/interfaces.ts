import type { Vapi } from "@vapi-ai/server-sdk";

export interface Customer {
  name: string;
  number: string;
}

export interface CallRecord extends Vapi.Call { }
export interface Assistant extends Vapi.Assistant { }

export interface AnalyticsCallRecord {
  _id: string;
  analysis?: {
    successEvaluation?: string;
    summary?: string;
  };
  startedAt?: string;
  endedReason?: string;
  durationSeconds?: number;
  call?: {
    id?: string;
    type?: string;
    phoneNumber?: string;
  };
  customer?: {
    name?: string;
    number?: string;
  };
  assistant?: {
    id?: string;
    name?: string;
  };
  transcript?: string;
  recordingUrl?: string;
}

export interface OverviewData {
  data: {
    _id: string;
    email: string;
    queueStats: {
      totalInQueue: number;
      totalInitiated: number;
      totalFailed: number;
      totalCompleted: number;
      successRate: number;
      assistantSpecific: {
        [assistantId: string]: AssistantAggregatedStats;
      };
    };
    callDataStats: {
      totalCallRecords: number;
      shortCallsCount: number;
      longCallsCount: number;
      successfulAnalysisCount: number;
      successfulAnalysisWithoutVoicemailCount: number;
    };
  };
}

export interface AssistantAggregatedStats {
  queued: number;
  initiated: number;
  failed: number;
  completed: number;
}

export interface AnalyticsData {
  data: AnalyticsCallRecord[];
}

/** ────── Subinterfaces ────── **/
export interface TwilioConfig {
  sid: string;
  authToken: string;
  phoneNumber: string;
}

export interface Contact {
  name: string;
  number: string;
  assistantId: string;
  status?: string;
}

export interface ScheduleSlot {
  assistantId: string;
  assistantName: string;
  callTimeStart: string;
  callTimeEnd: string;
  callTimeStartET: string;
  callTimeEndET: string;
}

export interface DailySchedule {
  morning: ScheduleSlot;
  afternoon: ScheduleSlot;
  evening: ScheduleSlot;
}

export interface WeeklySchedule {
  sunday: DailySchedule;
  monday: DailySchedule;
  tuesday: DailySchedule;
  wednesday: DailySchedule;
  thursday: DailySchedule;
  friday: DailySchedule;
  saturday: DailySchedule;
}

export interface Assistant {
  id: string;
  name?: string;
}


export type Schedule = Record<string, Record<string, ScheduleSlot>>;
