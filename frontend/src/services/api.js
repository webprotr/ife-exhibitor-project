// frontend/src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 120000 // Puppeteer için 2 dakika (120 sn) zamanaşımı sınırı
});

export const fetchExhibitors = async (filters = {}) => {
  const { year, category, search } = filters;
  const params = new URLSearchParams();

  if (year) params.append('year', year);
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  const response = await API.get(`/exhibitors?${params.toString()}`);
  return response.data;
};

export const triggerScrape = async (year = 2026) => {
  const response = await API.post('/scrape', { year });
  return response.data;
};