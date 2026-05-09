import { api } from './client';

export interface CoachingCard {
  disc: string;
  body: string;
}

export const coachingCardsApi = {
  byDisc: (discCode: string) =>
    api.get<CoachingCard>(`/api/coaching-cards/${encodeURIComponent(discCode)}`),
  general: () =>
    api.get<CoachingCard>('/api/coaching-cards/general'),
};
