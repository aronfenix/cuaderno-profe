import { db } from '../schema'
import type { TeamArrangement, Team, Student } from '../../types'
import { getDeviceId } from './deviceId'

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function computeBalancedSizes(total: number, minSize: number, maxSize: number): number[] {
  if (total <= 0) return []

  const minGroups = Math.ceil(total / maxSize)
  const maxGroups = Math.max(Math.floor(total / minSize), 1)

  for (let groups = minGroups; groups <= maxGroups; groups += 1) {
    const base = Math.floor(total / groups)
    const remainder = total % groups
    const sizes = Array.from({ length: groups }, (_, idx) => base + (idx < remainder ? 1 : 0))
    if (sizes.every(size => size >= minSize && size <= maxSize)) {
      return sizes
    }
  }

  const target = Math.max(1, Math.round(total / ((minSize + maxSize) / 2)))
  const base = Math.floor(total / target)
  const remainder = total % target
  return Array.from({ length: target }, (_, idx) => base + (idx < remainder ? 1 : 0))
}

export const TeamsRepo = {
  async getArrangementsByGroup(groupId: number): Promise<TeamArrangement[]> {
    return db.teamArrangements
      .where('groupId')
      .equals(groupId)
      .and(arrangement => !arrangement.isArchived)
      .sortBy('name')
  },

  async createArrangement(data: { groupId: number; yearId: number; name: string }): Promise<number> {
    const name = data.name.trim()
    if (!name) throw new Error('Debes indicar un nombre de agrupacion')

    const existing = await this.getArrangementsByGroup(data.groupId)
    if (existing.some(arrangement => normalizeName(arrangement.name) === normalizeName(name))) {
      throw new Error('Ya existe una agrupacion con ese nombre')
    }

    return db.teamArrangements.add({
      groupId: data.groupId,
      yearId: data.yearId,
      name,
      isArchived: false,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async renameArrangement(arrangementId: number, name: string): Promise<void> {
    await db.teamArrangements.update(arrangementId, {
      name: name.trim(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async archiveArrangement(arrangementId: number): Promise<void> {
    await db.transaction('rw', db.teamArrangements, db.teams, db.teamMemberships, async () => {
      const teams = await db.teams.where('arrangementId').equals(arrangementId).toArray()
      const teamIds = teams.map(team => team.id!).filter(Boolean)
      if (teamIds.length) {
        await db.teamMemberships.where('teamId').anyOf(teamIds).delete()
        await db.teams.where('arrangementId').equals(arrangementId).modify({
          isArchived: true,
          syncStatus: 'pending',
          updatedAt: Date.now(),
        })
      }
      await db.teamArrangements.update(arrangementId, {
        isArchived: true,
        syncStatus: 'pending',
        updatedAt: Date.now(),
      })
    })
  },

  async getByArrangement(arrangementId: number): Promise<Team[]> {
    return db.teams
      .where('arrangementId')
      .equals(arrangementId)
      .and(team => !team.isArchived)
      .sortBy('name')
  },

  async getByGroup(groupId: number): Promise<Team[]> {
    return db.teams
      .where('groupId')
      .equals(groupId)
      .and(team => !team.isArchived)
      .sortBy('name')
  },

  async create(data: { groupId: number; yearId: number; arrangementId: number | null; name: string; color?: string }): Promise<number> {
    const name = data.name.trim()
    if (!name) throw new Error('Nombre de equipo obligatorio')
    return db.teams.add({
      groupId: data.groupId,
      yearId: data.yearId,
      arrangementId: data.arrangementId,
      name,
      color: data.color ?? '#2563eb',
      isArchived: false,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async rename(teamId: number, name: string): Promise<void> {
    await db.teams.update(teamId, {
      name: name.trim(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async archive(teamId: number): Promise<void> {
    await db.transaction('rw', db.teams, db.teamMemberships, async () => {
      await db.teams.update(teamId, {
        isArchived: true,
        syncStatus: 'pending',
        updatedAt: Date.now(),
      })
      await db.teamMemberships.where('teamId').equals(teamId).delete()
    })
  },

  async getMembers(teamId: number): Promise<Student[]> {
    const memberships = await db.teamMemberships.where('teamId').equals(teamId).toArray()
    const studentIds = memberships.map(membership => membership.studentId)
    if (studentIds.length === 0) return []
    return db.students.where('id').anyOf(studentIds).sortBy('displayName')
  },

  async getTeamByStudentInArrangement(arrangementId: number, studentId: number): Promise<Team | undefined> {
    const teams = await this.getByArrangement(arrangementId)
    const teamIds = teams.map(team => team.id!).filter(Boolean)
    if (!teamIds.length) return undefined

    const membership = await db.teamMemberships
      .where('studentId')
      .equals(studentId)
      .and(row => teamIds.includes(row.teamId))
      .first()

    if (!membership) return undefined
    return teams.find(team => team.id === membership.teamId)
  },

  async getTeamMapForArrangement(arrangementId: number): Promise<Map<number, Team>> {
    const teams = await this.getByArrangement(arrangementId)
    const teamIds = teams.map(team => team.id!).filter(Boolean)
    const map = new Map<number, Team>()
    if (teamIds.length === 0) return map

    const memberships = await db.teamMemberships.where('teamId').anyOf(teamIds).toArray()
    const teamById = new Map(teams.map(team => [team.id!, team]))
    memberships.forEach(membership => {
      const team = teamById.get(membership.teamId)
      if (team) map.set(membership.studentId, team)
    })
    return map
  },

  async setStudentTeam(arrangementId: number, studentId: number, teamId: number | null, role = ''): Promise<void> {
    const teams = await this.getByArrangement(arrangementId)
    const teamIds = teams.map(team => team.id!).filter(Boolean)
    if (teamIds.length === 0) return

    const memberships = await db.teamMemberships.where('studentId').equals(studentId).toArray()
    const membershipsInArrangement = memberships.filter(membership => teamIds.includes(membership.teamId))

    const now = Date.now()
    const toDelete = membershipsInArrangement
      .filter(membership => teamId === null || membership.teamId !== teamId)
      .map(membership => membership.id!)
      .filter(Boolean)

    if (toDelete.length) {
      await db.teamMemberships.bulkDelete(toDelete)
    }

    if (teamId === null) return

    const existing = membershipsInArrangement.find(membership => membership.teamId === teamId)
    if (existing?.id !== undefined) {
      await db.teamMemberships.update(existing.id, {
        role,
        syncStatus: 'pending',
        updatedAt: now,
      })
      return
    }

    await db.teamMemberships.add({
      teamId,
      studentId,
      role,
      syncStatus: 'pending',
      updatedAt: now,
    })
  },

  async autoDistributeStudents(data: {
    arrangementId: number
    groupId: number
    yearId: number
    students: Student[]
    minSize: number
    maxSize: number
    teamPrefix: string
  }): Promise<void> {
    const minSize = Math.max(1, Math.floor(data.minSize))
    const maxSize = Math.max(minSize, Math.floor(data.maxSize))
    const teamPrefix = data.teamPrefix.trim() || 'Mesa'
    const students = shuffleArray(data.students.filter(student => student.id !== undefined))

    const sizes = computeBalancedSizes(students.length, minSize, maxSize)
    const now = Date.now()

    await db.transaction('rw', db.teams, db.teamMemberships, async () => {
      const currentTeams = await this.getByArrangement(data.arrangementId)
      const currentIds = currentTeams.map(team => team.id!).filter(Boolean)
      if (currentIds.length) {
        await db.teamMemberships.where('teamId').anyOf(currentIds).delete()
        await db.teams.where('arrangementId').equals(data.arrangementId).modify({
          isArchived: true,
          syncStatus: 'pending',
          updatedAt: now,
        })
      }

      let offset = 0
      for (let idx = 0; idx < sizes.length; idx += 1) {
        const size = sizes[idx]
        const teamId = await this.create({
          groupId: data.groupId,
          yearId: data.yearId,
          arrangementId: data.arrangementId,
          name: `${teamPrefix} ${idx + 1}`,
        })

        const chunk = students.slice(offset, offset + size)
        offset += size
        for (const student of chunk) {
          await this.setStudentTeam(data.arrangementId, student.id!, teamId)
        }
      }
    })
  },
}
