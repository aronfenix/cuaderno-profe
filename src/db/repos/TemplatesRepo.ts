import { db } from '../schema'
import type { InstrumentTemplate } from '../../types'
import { getDeviceId } from './deviceId'

export const TemplatesRepo = {
  async getAll(): Promise<InstrumentTemplate[]> {
    return db.templates.orderBy('updatedAt').reverse().toArray()
  },

  async getById(id: number): Promise<InstrumentTemplate | undefined> {
    return db.templates.get(id)
  },

  async create(data: Omit<InstrumentTemplate, 'id'>): Promise<number> {
    return db.templates.add(data)
  },

  async update(id: number, patch: Partial<InstrumentTemplate>): Promise<void> {
    const existing = await db.templates.get(id)
    if (!existing) return
    await db.templates.update(id, {
      ...patch,
      version: (existing.version ?? 0) + 1,
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
  },

  async duplicate(id: number): Promise<number> {
    const original = await db.templates.get(id)
    if (!original) throw new Error('Template not found')
    const { id: _drop, ...rest } = original
    return db.templates.add({
      ...rest,
      title: `${rest.title} (copia)`,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      deviceId: getDeviceId(),
    })
  },

  async delete(id: number): Promise<void> {
    await db.templates.delete(id)
  },

  async importFromJSON(templates: Partial<InstrumentTemplate>[]): Promise<void> {
    const now = Date.now()
    await db.transaction('rw', db.templates, async () => {
      for (const t of templates) {
        const { id: _drop, ...rest } = t as InstrumentTemplate
        await db.templates.add({
          ...rest,
          version: rest.version ?? 1,
          createdAt: rest.createdAt ?? now,
          updatedAt: now,
          syncStatus: 'pending',
          deviceId: getDeviceId(),
        })
      }
    })
  },

  async exportToJSON(ids?: number[]): Promise<InstrumentTemplate[]> {
    if (ids) {
      return db.templates.where('id').anyOf(ids).toArray()
    }
    return db.templates.toArray()
  }
}
