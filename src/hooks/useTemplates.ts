import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'
import { TemplatesRepo } from '../db/repos/TemplatesRepo'
import type { InstrumentTemplate } from '../types'
import { getDeviceId } from '../db/repos/deviceId'

export function useTemplates() {
  const templates = useLiveQuery(() => TemplatesRepo.getAll(), [])

  const createTemplate = useCallback(async (data: Omit<InstrumentTemplate, 'id'>): Promise<number> => {
    return TemplatesRepo.create(data)
  }, [])

  const updateTemplate = useCallback(async (id: number, patch: Partial<InstrumentTemplate>): Promise<void> => {
    return TemplatesRepo.update(id, patch)
  }, [])

  const duplicateTemplate = useCallback(async (id: number): Promise<number> => {
    return TemplatesRepo.duplicate(id)
  }, [])

  const deleteTemplate = useCallback(async (id: number): Promise<void> => {
    return TemplatesRepo.delete(id)
  }, [])

  return {
    templates: templates ?? [],
    isLoading: templates === undefined,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
  }
}

export function makeEmptyTemplate(): Omit<InstrumentTemplate, 'id'> {
  return {
    title: '',
    description: '',
    tags: [],
    scale: { type: '1-5', allowNA: true },
    finalGrade: { scale: '1-10', rounding: '0.5' },
    criteria: [],
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'manual',
    syncStatus: 'pending',
    deviceId: getDeviceId(),
  }
}
