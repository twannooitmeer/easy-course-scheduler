'use server'

import { revalidatePath } from 'next/cache'

import type { Contact, School } from '@/payload-types'
import { requireUser } from '../requireUser'

export type ActionResult = { success: true } | { success: false; error: string }
export type CreateResult = { success: true; id: number } | { success: false; error: string }

export type SchoolInput = Partial<
  Pick<
    School,
    | 'name'
    | 'street'
    | 'houseNumber'
    | 'addition'
    | 'postalCode'
    | 'city'
    | 'country'
    | 'phone'
    | 'defaultLocationNote'
    | 'notes'
  >
>

export async function createSchool(data: SchoolInput): Promise<CreateResult> {
  const { payload, user } = await requireUser()

  try {
    if (!data.name?.trim()) throw new Error('Name is required.')
    const school = await payload.create({
      collection: 'schools',
      data: { name: data.name, city: data.city },
      user,
      overrideAccess: false,
    })
    revalidatePath('/schools')
    return { success: true, id: Number(school.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create school'
    return { success: false, error: message }
  }
}

export async function updateSchool(id: number, data: SchoolInput): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.update({ collection: 'schools', id, data, user, overrideAccess: false })
    revalidatePath('/schools')
    revalidatePath(`/schools/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save school'
    return { success: false, error: message }
  }
}

export async function deleteSchool(id: number): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({ collection: 'schools', id, user, overrideAccess: false })
    revalidatePath('/schools')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove school'
    return { success: false, error: message }
  }
}

export type ContactInput = Pick<Contact, 'fullName' | 'firstName' | 'lastName' | 'email' | 'phone'>

export async function createContact(
  schoolId: number,
  data: ContactInput,
): Promise<CreateResult> {
  const { payload, user } = await requireUser()

  try {
    if (!data.fullName?.trim()) throw new Error('Full name is required.')
    const contact = await payload.create({
      collection: 'contacts',
      data: { ...data, school: schoolId },
      user,
      overrideAccess: false,
    })
    revalidatePath(`/schools/${schoolId}`)
    return { success: true, id: Number(contact.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add contact'
    return { success: false, error: message }
  }
}

export async function deleteContact(id: number, schoolId: number): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({ collection: 'contacts', id, user, overrideAccess: false })
    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove contact'
    return { success: false, error: message }
  }
}
