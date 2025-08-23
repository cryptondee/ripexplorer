import { prisma } from './client.js';
import type { ProfileData } from '../types.js';

export async function createProfile(data: ProfileData) {
  return await prisma.profile.create({
    data: {
      name: data.name,
      bio: data.bio,
      website: data.website,
      twitter: data.twitter,
      github: data.github,
      linkedin: data.linkedin,
      wallet: data.wallet,
      email: data.email,
      location: data.location,
      avatar: data.avatar,
    },
  });
}

export async function getProfile(id: string) {
  return await prisma.profile.findUnique({
    where: { id },
    include: {
      comparisons: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function getAllProfiles() {
  return await prisma.profile.findMany({
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateProfile(id: string, data: Partial<ProfileData>) {
  return await prisma.profile.update({
    where: { id },
    data,
  });
}

export async function deleteProfile(id: string) {
  return await prisma.profile.delete({
    where: { id },
  });
}