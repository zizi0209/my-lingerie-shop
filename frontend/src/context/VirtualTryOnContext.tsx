 'use client';
 
 import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
 import { TryOnResult } from '@/types/virtual-tryon';
 
 interface BackgroundJob {
   id: string;
   productId: string;
   productName: string;
   status: 'pending' | 'processing' | 'completed' | 'error';
   result?: TryOnResult;
   error?: string;
 }
 
 interface VirtualTryOnContextValue {
   jobs: BackgroundJob[];
   pendingResults: TryOnResult[];
   addJob: (job: Omit<BackgroundJob, 'id'>) => string;
   updateJob: (id: string, updates: Partial<BackgroundJob>) => void;
   removeJob: (id: string) => void;
   consumeResult: (productId: string) => TryOnResult | null;
   hasCompletedJob: (productId: string) => boolean;
 }
 
 const VirtualTryOnContext = createContext<VirtualTryOnContextValue | null>(null);
 
 export function VirtualTryOnProvider({ children }: { children: ReactNode }) {
   const [jobs, setJobs] = useState<BackgroundJob[]>([]);
 
   const addJob = useCallback((job: Omit<BackgroundJob, 'id'>) => {
     const id = `tryon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
     setJobs((prev) => [...prev, { ...job, id }]);
     return id;
   }, []);
 
   const updateJob = useCallback((id: string, updates: Partial<BackgroundJob>) => {
     setJobs((prev) =>
       prev.map((job) => (job.id === id ? { ...job, ...updates } : job))
     );
   }, []);
 
   const removeJob = useCallback((id: string) => {
     setJobs((prev) => prev.filter((job) => job.id !== id));
   }, []);
 
   const consumeResult = useCallback((productId: string): TryOnResult | null => {
     const job = jobs.find((j) => j.productId === productId && j.status === 'completed' && j.result);
     if (job?.result) {
       removeJob(job.id);
       return job.result;
     }
     return null;
   }, [jobs, removeJob]);
 
   const hasCompletedJob = useCallback(
     (productId: string) => jobs.some((j) => j.productId === productId && j.status === 'completed'),
     [jobs]
   );
 
   const pendingResults = jobs
     .filter((j) => j.status === 'completed' && j.result)
     .map((j) => j.result!);
 
   return (
     <VirtualTryOnContext.Provider
       value={{
         jobs,
         pendingResults,
         addJob,
         updateJob,
         removeJob,
         consumeResult,
         hasCompletedJob,
       }}
     >
       {children}
     </VirtualTryOnContext.Provider>
   );
 }
 
 export function useVirtualTryOnContext() {
   const context = useContext(VirtualTryOnContext);
   if (!context) {
     throw new Error('useVirtualTryOnContext must be used within VirtualTryOnProvider');
   }
   return context;
 }
