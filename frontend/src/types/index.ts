export interface User {
  id: string;
  name: string;
  email: string;
  interests: string[];
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  country: string;
  continent: string;
  date: string;
  keywords: string[];
  organizations: string[];
  source: string;
  url: string;
  createdAt: string;
  processed_text?: string;
  score?: number;
}

export interface TrendingTopic {
  topic: string;
  count: number;
}

export interface SearchResult extends Event {
  score: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface EventsResponse {
  status: string;
  pagination: PaginationMeta;
  events: Event[];
}
