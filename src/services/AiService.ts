import axios from 'axios';
import Constants from 'expo-constants';

const API_PORT = '3000';
const REQUEST_TIMEOUT_MS = 12000;

const configuredBackend =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.REACT_NATIVE_APP_BACKEND_URL;

const getExpoDevServerBase = () => {
  const constants = Constants as any;
  const hostUri =
    Constants.expoConfig?.hostUri ||
    constants.manifest?.debuggerHost ||
    constants.manifest2?.extra?.expoGo?.debuggerHost;

  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${API_PORT}` : undefined;
};

const getBackendBases = () => {
  const bases = [
    configuredBackend,
    getExpoDevServerBase(),
    'http://10.0.2.2:3000',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  return Array.from(new Set(bases.map((base) => base.replace(/\/$/, ''))));
};

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags?: Record<string, string>;
}

class AiService {
  private getErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;

      if (typeof detail === 'string') {
        return detail;
      }

      if (error.response?.status) {
        return `Request failed with status ${error.response.status}`;
      }
    }

    return error instanceof Error ? error.message : 'unknown error';
  }

  private async requestWithFallback<T>(request: (baseUrl: string) => Promise<T>): Promise<T> {
    const bases = getBackendBases();
    let lastError: unknown;

    for (const base of bases) {
      try {
        return await request(base);
      } catch (error) {
        lastError = error;
        console.warn(`Backend request failed for ${base}`, error);

        if (axios.isAxiosError(error) && error.response) {
          throw new Error(this.getErrorMessage(error));
        }
      }
    }

    throw new Error(
      `Could not reach the backend. Tried: ${bases.join(', ')}. Last error: ${
        this.getErrorMessage(lastError)
      }`
    );
  }

  async getNearbyPlaces(lat: number, lng: number, radius = 500): Promise<Place[]> {
    return this.requestWithFallback(async (baseUrl) => {
      const resp = await axios.get(`${baseUrl}/places`, {
        params: { lat, lng, radius },
        timeout: REQUEST_TIMEOUT_MS,
      });
      return resp.data;
    });
  }

  async describePlace(place: Place) {
    return this.requestWithFallback(async (baseUrl) => {
      const resp = await axios.post(`${baseUrl}/ai/describe`, { place }, { timeout: REQUEST_TIMEOUT_MS });
      return resp.data;
    });
  }
}

export default new AiService();
